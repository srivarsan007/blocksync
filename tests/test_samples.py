"""
Unit and integration tests verifying the sample files in samples/
can be run by a user or automated harness successfully.
"""

import json
import unittest
import pandas as pd
from pathlib import Path
from starlette.testclient import TestClient

from backend.main import app
from optimizer.solver import BlockOptimizerSolver


class TestSamplesWorkflow(unittest.TestCase):
    """Verifies that the distributed sample files operate cleanly with the engine."""

    def test_samples_demo_tasks_with_solver(self):
        """Verify BlockOptimizerSolver runs on samples/demo_tasks.csv and yields OPTIMAL with 9 tasks."""
        demo_tasks_path = Path("samples/demo_tasks.csv")
        windows_path = Path("data/maintenance_windows.csv")

        self.assertTrue(demo_tasks_path.exists(), "samples/demo_tasks.csv must exist")
        self.assertTrue(windows_path.exists(), "data/maintenance_windows.csv must exist")

        tasks_df = pd.read_csv(demo_tasks_path)
        windows_df = pd.read_csv(windows_path)

        self.assertEqual(len(tasks_df), 9)

        solver = BlockOptimizerSolver(tasks_df, windows_df)
        schedule, status, infeasible_reasons, _ = solver.solve()

        self.assertEqual(status, "OPTIMAL")
        self.assertEqual(len(schedule), 9)
        self.assertIsNone(infeasible_reasons)

    def test_samples_new_request_post(self):
        """Verify POST /tasks with samples/new_request.json successfully processes and optimizes."""
        sample_req_path = Path("samples/new_request.json")
        self.assertTrue(sample_req_path.exists(), "samples/new_request.json must exist")

        with open(sample_req_path, "r", encoding="utf-8") as f:
            payload = json.load(f)

        with TestClient(app) as client:
            response = client.post("/tasks", json=payload)
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn(data["status"], ("OPTIMAL", "FEASIBLE"))
            self.assertIn("tasks", data)

            matching = [t for t in data["tasks"] if t["description"] == payload["description"]]
            self.assertGreaterEqual(len(matching), 1)
            self.assertEqual(matching[0]["department"], payload["department"])
            self.assertEqual(matching[0]["section_id"], payload["section_id"])


if __name__ == "__main__":
    unittest.main()
