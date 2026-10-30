"""
CP-SAT Optimizer — Phase 7
Implementation of Section 13 CP-SAT Optimization Model for BlockSync.
"""

from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple
import pandas as pd
from ortools.sat.python import cp_model

from backend.models import ScheduleEntry
from optimizer.graph import TaskGraphBuilder


class BlockOptimizerSolver:
    def __init__(
        self,
        tasks_df: pd.DataFrame,
        windows_df: pd.DataFrame,
        planning_date: date = date(2026, 9, 1)
    ):
        self.tasks_df = tasks_df
        self.windows_df = windows_df
        self.planning_date = planning_date
        self.graph_builder = TaskGraphBuilder(tasks_df)

        # Objective weights from Section 13
        self.w1 = 10  # bundling bonus
        self.w2 = 5   # criticality on-time reward
        self.w3 = 3   # distinct block count penalty
        self.w4 = 8   # overdue delay penalty

        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()

        self.task_vars = {}
        self.bundled_vars = {}

    def build_model(self):
        """Build CP-SAT model strictly adhering to Section 13 constraints & objective."""
        # 1. Variables per task
        for _, row in self.tasks_df.iterrows():
            t_id = str(row['id'])
            sec = str(row['section_id'])
            duration = int(row['duration_minutes'])
            # Feed ML priority score into objective term w2, with direct fallback to raw criticality
            if 'effective_priority' in row and pd.notnull(row['effective_priority']):
                criticality = int(row['effective_priority'])
            elif 'priority_score' in row and pd.notnull(row['priority_score']):
                criticality = int(round(float(row['priority_score'])))
            else:
                criticality = int(row['criticality'])
            due_date = pd.to_datetime(row['due_date']).date()
            is_overdue = due_date < self.planning_date

            sec_windows = self.windows_df[self.windows_df['section_id'] == sec]
            if len(sec_windows) == 0:
                raise ValueError(f"No maintenance window defined for section {sec}")

            is_scheduled = self.model.NewBoolVar(f"sched_{t_id}")

            win_assign = {}
            for _, win in sec_windows.iterrows():
                w_id = str(win['id'])
                win_assign[w_id] = self.model.NewBoolVar(f"win_{t_id}_{w_id}")

            self.model.Add(sum(win_assign.values()) == 1).OnlyEnforceIf(is_scheduled)
            self.model.Add(sum(win_assign.values()) == 0).OnlyEnforceIf(is_scheduled.Not())

            min_start = int(sec_windows['start_minute'].min())
            max_end = int(sec_windows['end_minute'].max())

            start_var = self.model.NewIntVar(0, max_end, f"start_{t_id}")
            end_var = self.model.NewIntVar(0, max_end, f"end_{t_id}")

            for _, win in sec_windows.iterrows():
                w_id = str(win['id'])
                ws = int(win['start_minute'])
                we = int(win['end_minute'])
                self.model.Add(start_var >= ws).OnlyEnforceIf(win_assign[w_id])
                self.model.Add(end_var <= we).OnlyEnforceIf(win_assign[w_id])
                self.model.Add(end_var == start_var + duration).OnlyEnforceIf(win_assign[w_id])

            self.model.Add(start_var == 0).OnlyEnforceIf(is_scheduled.Not())
            self.model.Add(end_var == 0).OnlyEnforceIf(is_scheduled.Not())

            interval_var = self.model.NewOptionalIntervalVar(
                start_var, duration, end_var, is_scheduled, f"interval_{t_id}"
            )

            self.task_vars[t_id] = {
                'start': start_var,
                'end': end_var,
                'interval': interval_var,
                'is_scheduled': is_scheduled,
                'win_assign': win_assign,
                'section': sec,
                'duration': duration,
                'criticality': criticality,
                'due_date': due_date,
                'is_overdue': is_overdue
            }

            if is_overdue and criticality >= 4:
                self.model.Add(is_scheduled == 1)

        # 2. Hard Constraint: Conflicts (NoOverlap)
        conflicts = self.graph_builder.get_conflicts()
        for u, v, _ in conflicts:
            if u in self.task_vars and v in self.task_vars:
                self.model.AddNoOverlap([
                    self.task_vars[u]['interval'],
                    self.task_vars[v]['interval']
                ])

        # 3. Synergy bundling variables & constraints
        synergies = self.graph_builder.get_synergies()
        for u, v, _ in synergies:
            if u in self.task_vars and v in self.task_vars:
                b_var = self.model.NewBoolVar(f"bundled_{u}_{v}")
                self.bundled_vars[(u, v)] = b_var

                self.model.AddBoolAnd([
                    self.task_vars[u]['is_scheduled'],
                    self.task_vars[v]['is_scheduled']
                ]).OnlyEnforceIf(b_var)

                self.model.Add(
                    self.task_vars[u]['start'] == self.task_vars[v]['start']
                ).OnlyEnforceIf(b_var)

        # 4. Objective Function (Section 13)
        obj_terms = []
        for b_var in self.bundled_vars.values():
            obj_terms.append(self.w1 * b_var)

        for t_id, data in self.task_vars.items():
            obj_terms.append(self.w2 * data['criticality'] * data['is_scheduled'])

        scheduled_count = sum(d['is_scheduled'] for d in self.task_vars.values())
        bundled_count = sum(self.bundled_vars.values())
        distinct_blocks = scheduled_count - bundled_count
        obj_terms.append(-self.w3 * distinct_blocks)

        for t_id, data in self.task_vars.items():
            t_due_date = data['due_date']
            if data['is_overdue']:
                delay_days = (self.planning_date - t_due_date).days
                obj_terms.append(-self.w4 * delay_days * data['is_scheduled'])

            # Multi-Day Horizon: penalize assigning tasks to windows past their due date
            for w_id, w_var in data['win_assign'].items():
                win_match = self.windows_df[self.windows_df['id'] == w_id]
                if not win_match.empty:
                    w_start = int(win_match.iloc[0]['start_minute'])
                    w_day_offset = w_start // 1440
                    if w_day_offset > 0:
                        w_date = self.planning_date + timedelta(days=w_day_offset)
                        if w_date > t_due_date:
                            horizon_delay = (w_date - t_due_date).days
                            obj_terms.append(-self.w4 * horizon_delay * w_var)

        self.model.Maximize(sum(obj_terms))

    def solve(self) -> Tuple[List[ScheduleEntry], str, Optional[List[str]], Dict]:
        """
        Solves model and returns (schedule, status, infeasibility_reasons, trace_dict).
        """
        self.build_model()

        self.solver.parameters.max_time_in_seconds = 30.0
        self.solver.parameters.num_search_workers = 4

        status_code = self.solver.Solve(self.model)

        if status_code in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            status_str = "OPTIMAL" if status_code == cp_model.OPTIMAL else "FEASIBLE"
            schedule = []
            trace = {
                "bundled_pairs": [],
                "conflicts_avoided": self.graph_builder.get_conflicts(),
                "task_assignments": {}
            }

            for (u, v), b_var in self.bundled_vars.items():
                if self.solver.Value(b_var) == 1:
                    trace["bundled_pairs"].append((u, v))

            for t_id, data in self.task_vars.items():
                if self.solver.Value(data['is_scheduled']) == 1:
                    start_val = self.solver.Value(data['start'])
                    end_val = self.solver.Value(data['end'])

                    assigned_win = None
                    for w_id, w_var in data['win_assign'].items():
                        if self.solver.Value(w_var) == 1:
                            assigned_win = w_id
                            break

                    b_group = None
                    for (u, v) in trace["bundled_pairs"]:
                        if t_id in (u, v):
                            b_group = f"BUNDLE-{data['section']}-{start_val}"
                            break

                    entry = ScheduleEntry(
                        task_id=t_id,
                        assigned_window_id=assigned_win or f"WIN-{data['section']}",
                        start_minute=start_val,
                        end_minute=end_val,
                        bundle_group_id=b_group
                    )
                    schedule.append(entry)
                    trace["task_assignments"][t_id] = {
                        "start": start_val,
                        "end": end_val,
                        "window": assigned_win,
                        "bundle_group": b_group
                    }

            return schedule, status_str, None, trace

        elif status_code == cp_model.INFEASIBLE:
            infeasible_reasons = [
                "Available window capacity insufficient for high-criticality overdue tasks and hard conflict constraints."
            ]
            return [], "INFEASIBLE", infeasible_reasons, {}

        else:
            return [], "UNKNOWN", ["Solver returned unknown status."], {}


if __name__ == "__main__":
    tasks = pd.read_csv("data/sample_dataset.csv")
    windows = pd.read_csv("data/maintenance_windows.csv")

    solver = BlockOptimizerSolver(tasks, windows)
    schedule, status, conflicts, trace = solver.solve()

    print(f"=== CP-SAT SOLVER RUN ===")
    print(f"Status: {status}")
    if status in ("OPTIMAL", "FEASIBLE"):
        print(f"Scheduled tasks: {len(schedule)} / {len(tasks)}")
        for s in schedule:
            bg = f" | {s.bundle_group_id}" if s.bundle_group_id else ""
            print(f"  [{s.task_id}] Win: {s.assigned_window_id} | Time: {s.start_minute}-{s.end_minute}m{bg}")
    else:
        print(f"Infeasible reasons: {conflicts}")
