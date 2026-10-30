"""
Tests for Core Optimizer Components
- TaskGraphBuilder (Conflicts and Synergies)
- Baseline Greedy Scheduler
- CP-SAT Optimizer Solver
- Explainability Engine
- Metrics Computation
"""

import unittest
import pandas as pd
from datetime import date

from optimizer.graph import TaskGraphBuilder
from optimizer.baseline import schedule_greedy, compute_baseline_metrics
from optimizer.solver import BlockOptimizerSolver
from optimizer.explain import ExplainabilityEngine
from optimizer.metrics import compute_schedule_metrics


class TestOptimizerCore(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tasks_df = pd.read_csv("data/sample_dataset.csv")
        cls.windows_df = pd.read_csv("data/maintenance_windows.csv")

    def test_01_graph_builder_detection(self):
        """Verify TaskGraphBuilder detects 4 synergies and 5 conflicts."""
        builder = TaskGraphBuilder(self.tasks_df)
        synergies = builder.get_synergies()
        conflicts = builder.get_conflicts()

        self.assertEqual(len(synergies), 4, f"Expected 4 synergies, got {len(synergies)}")
        self.assertEqual(len(conflicts), 5, f"Expected 5 conflicts, got {len(conflicts)}")

        # Verify synergy pairs
        synergy_pairs = {tuple(sorted([u, v])) for u, v, _ in synergies}
        expected_synergies = {
            tuple(sorted(["E1", "S1"])),
            tuple(sorted(["S1", "E2"])),
            tuple(sorted(["S2", "E3"])),
            tuple(sorted(["E4", "S3"])),
        }
        self.assertEqual(synergy_pairs, expected_synergies)

        # Verify conflict pairs
        conflict_pairs = {tuple(sorted([u, v])) for u, v, _ in conflicts}
        expected_conflicts = {
            tuple(sorted(["E1", "T1"])),
            tuple(sorted(["S1", "T1"])),
            tuple(sorted(["T1", "E2"])),
            tuple(sorted(["S2", "T2"])),
            tuple(sorted(["E3", "T2"])),
        }
        self.assertEqual(conflict_pairs, expected_conflicts)

    def test_02_baseline_scheduler(self):
        """Verify baseline greedy scheduler schedules all tasks without bundling."""
        schedule = schedule_greedy(self.tasks_df, self.windows_df)
        self.assertEqual(len(schedule), 9)

        metrics = compute_baseline_metrics(schedule)
        self.assertEqual(metrics["total_blocks_used"], 9)
        self.assertEqual(metrics["bundled_task_pairs"], 0)

        # Verify no bundle group ids assigned in baseline
        for entry in schedule:
            self.assertIsNone(entry.bundle_group_id)

    def test_03_cpsat_solver_optimal(self):
        """Verify CP-SAT solver returns OPTIMAL on 9/9 tasks with zero conflict violations."""
        solver = BlockOptimizerSolver(self.tasks_df, self.windows_df)
        schedule, status, infeasible_reasons, trace = solver.solve()

        self.assertEqual(status, "OPTIMAL")
        self.assertEqual(len(schedule), 9)
        self.assertIsNone(infeasible_reasons)
        self.assertIn("bundled_pairs", trace)
        self.assertGreater(len(trace["bundled_pairs"]), 0)

        # Verify NoOverlap for all conflicts
        graph = TaskGraphBuilder(self.tasks_df)
        conflicts = graph.get_conflicts()
        sched_map = {e.task_id: (e.start_minute, e.end_minute) for e in schedule}

        for u, v, _ in conflicts:
            if u in sched_map and v in sched_map:
                u_start, u_end = sched_map[u]
                v_start, v_end = sched_map[v]
                no_overlap = (u_end <= v_start) or (v_end <= u_start)
                self.assertTrue(no_overlap, f"Conflict violation detected between {u} [{u_start}-{u_end}] and {v} [{v_start}-{v_end}]")

    def test_04_explainability_engine(self):
        """Verify explainability engine creates informative reasons for all tasks."""
        solver = BlockOptimizerSolver(self.tasks_df, self.windows_df)
        schedule, status, _, trace = solver.solve()
        explainer = ExplainabilityEngine(self.tasks_df, self.windows_df)
        explanations = explainer.generate_explanations(schedule, trace)

        self.assertEqual(len(explanations), len(schedule))
        for exp in explanations:
            self.assertTrue(len(exp.reason_text) > 10)
            self.assertIn(exp.constraint_involved, ["synergy_bundling", "power_isolation_conflict", "criticality_priority"])

    def test_05_metrics_comparison(self):
        """Verify optimizer achieves block reduction and downtime savings compared to baseline."""
        baseline_sched = schedule_greedy(self.tasks_df, self.windows_df)
        base_metrics = compute_schedule_metrics(baseline_sched, self.tasks_df, self.windows_df)

        solver = BlockOptimizerSolver(self.tasks_df, self.windows_df)
        opt_sched, _, _, _ = solver.solve()
        opt_metrics = compute_schedule_metrics(opt_sched, self.tasks_df, self.windows_df)

        self.assertLess(opt_metrics["total_blocks_used"], base_metrics["total_blocks_used"])
        self.assertLess(opt_metrics["total_downtime_minutes"], base_metrics["total_downtime_minutes"])
    def test_06_ml_priority_scoring(self):
        """Verify ML priority model training, real validation metrics, explainability, and solver feeding."""
        from optimizer.ml_priority import MaintenancePriorityMLModel

        ml_model = MaintenancePriorityMLModel(random_state=42)
        train_res = ml_model.train()

        # 1. Real validation metric checks
        metrics = train_res["metrics"]
        self.assertIn("mae", metrics)
        self.assertIn("r2_score", metrics)
        self.assertGreater(metrics["r2_score"], 0.90, f"R² should exceed 0.90, got {metrics['r2_score']}")
        self.assertLess(metrics["mae"], 0.50, f"MAE should be under 0.50, got {metrics['mae']}")

        # 2. Feature importance verification
        importances = train_res["feature_importances"]
        self.assertIn("criticality", importances)
        self.assertIn("days_overdue", importances)
        self.assertGreater(importances["criticality"], 0.40)

        # 3. Scoring and explainability verification
        scored_df, explanations = ml_model.score_tasks(self.tasks_df, planning_date=date(2026, 9, 1))
        self.assertEqual(len(scored_df), 9)
        self.assertEqual(len(explanations), 9)

        # Overdue task E2 should receive a priority boost
        e2_row = scored_df[scored_df["id"] == "E2"].iloc[0]
        self.assertGreater(e2_row["ml_priority_score"], 10.0)

        # 4. Solver optimization verification with ML scored tasks
        solver = BlockOptimizerSolver(scored_df, self.windows_df)
        schedule, status, _, _ = solver.solve()
        self.assertEqual(status, "OPTIMAL")
        self.assertEqual(len(schedule), 9)


if __name__ == "__main__":
    unittest.main()

