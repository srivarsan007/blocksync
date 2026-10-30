"""
Explainability Engine — Phase 8
Generates deterministic explanations from CP-SAT solver output (Section 14).
"""

from typing import Dict, List, Optional
import pandas as pd

from backend.models import DecisionExplanation, ScheduleEntry
from optimizer.graph import TaskGraphBuilder


class ExplainabilityEngine:
    def __init__(self, tasks_df: pd.DataFrame, windows_df: pd.DataFrame):
        self.tasks_df = tasks_df
        self.windows_df = windows_df
        self.graph_builder = TaskGraphBuilder(tasks_df)

    def generate_explanations(
        self,
        schedule: List[ScheduleEntry],
        trace: Dict
    ) -> List[DecisionExplanation]:
        """Generates deterministic DecisionExplanation for every scheduled task."""
        explanations = []
        conflicts = self.graph_builder.get_conflicts()
        synergies = self.graph_builder.get_synergies()

        # Build map of bundled partners: task_id -> list of co-bundled task_ids
        bundled_map = {}
        bundled_pairs = trace.get("bundled_pairs", [])
        for u, v in bundled_pairs:
            bundled_map.setdefault(u, []).append(v)
            bundled_map.setdefault(v, []).append(u)

        # Build conflict map: task_id -> list of conflicting task_ids
        conflict_map = {}
        for u, v, reason in conflicts:
            conflict_map.setdefault(u, []).append((v, reason))
            conflict_map.setdefault(v, []).append((u, reason))

        for entry in schedule:
            t_id = entry.task_id
            task_row = self.tasks_df[self.tasks_df['id'] == t_id].iloc[0]
            dept = task_row['department']
            sec = task_row['section_id']
            crit = task_row['criticality']

            synergy_partners = bundled_map.get(t_id, [])
            conflicting_tasks = conflict_map.get(t_id, [])

            if synergy_partners:
                partners_str = ", ".join(synergy_partners)
                reason_text = (
                    f"Scheduled in Window {entry.assigned_window_id} ({entry.start_minute}-{entry.end_minute}m) "
                    f"and bundled with {partners_str} on Section {sec} due to compatible {dept} operations."
                )
                constraint = "synergy_bundling"
                synergy_cap = synergy_partners
            elif conflicting_tasks:
                avoided_str = ", ".join([c[0] for c in conflicting_tasks])
                reason_text = (
                    f"Scheduled in Window {entry.assigned_window_id} ({entry.start_minute}-{entry.end_minute}m) "
                    f"separately from conflicting task(s) [{avoided_str}] on Section {sec} due to power isolation requirements."
                )
                constraint = "power_isolation_conflict"
                synergy_cap = None
            else:
                reason_text = (
                    f"Scheduled in Window {entry.assigned_window_id} ({entry.start_minute}-{entry.end_minute}m) "
                    f"based on criticality level {crit} priority on Section {sec}."
                )
                constraint = "criticality_priority"
                synergy_cap = None

            avoided_id = conflicting_tasks[0][0] if conflicting_tasks else None

            explanation = DecisionExplanation(
                schedule_entry_id=t_id,
                reason_text=reason_text,
                constraint_involved=constraint,
                conflict_avoided=avoided_id,
                synergy_captured=synergy_cap
            )
            explanations.append(explanation)

        return explanations


if __name__ == "__main__":
    from optimizer.solver import BlockOptimizerSolver

    tasks = pd.read_csv("data/sample_dataset.csv")
    windows = pd.read_csv("data/maintenance_windows.csv")

    solver = BlockOptimizerSolver(tasks, windows)
    schedule, status, conflicts, trace = solver.solve()

    explainer = ExplainabilityEngine(tasks, windows)
    explanations = explainer.generate_explanations(schedule, trace)

    print("=== EXPLAINABILITY ENGINE OUTPUT ===")
    for exp in explanations:
        print(f"\nTask: {exp.schedule_entry_id}")
        print(f"  Reason: {exp.reason_text}")
        print(f"  Constraint: {exp.constraint_involved}")
        print(f"  Conflict Avoided: {exp.conflict_avoided}")
        print(f"  Synergy Captured: {exp.synergy_captured}")
