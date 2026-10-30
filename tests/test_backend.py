"""
Integration Tests for FastAPI Backend Endpoints
Tests /auth/login, /auth/accounts, /auth/me, /tasks, /tasks/optimize, /graph, /schedule/baseline, /schedule/optimize, /metrics, /decisions
"""

import unittest
from starlette.testclient import TestClient
from backend.main import app


class TestBackendAPI(unittest.TestCase):
    def test_01_root_endpoint(self):
        with TestClient(app) as client:
            response = client.get("/")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["status"], "online")
            self.assertIn("/tasks", data["endpoints"])
            self.assertIn("/auth/login", data["endpoints"])

    def test_02_auth_endpoints(self):
        with TestClient(app) as client:
            # 1. Test Coordinator Login & Signed JWT Token
            res = client.post("/auth/login", json={"username": "coordinator_desk", "password": "coordinator123"})
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data["role"], "coordinator")
            token = data["token"]
            # Verify JWT structure (header.payload.signature)
            parts = token.split(".")
            self.assertEqual(len(parts), 3, "Token should be a valid 3-segment JWT")
            coord_token = token

            # 2. Test Department Logins
            res_eng = client.post("/auth/login", json={"username": "engineering_desk", "password": "engineer123"})
            self.assertEqual(res_eng.status_code, 200)
            self.assertEqual(res_eng.json()["role"], "Engineering")
            self.assertEqual(len(res_eng.json()["token"].split(".")), 3)

            res_snt = client.post("/auth/login", json={"username": "snt_desk", "password": "snt123"})
            self.assertEqual(res_snt.status_code, 200)
            self.assertEqual(res_snt.json()["role"], "S&T")
            self.assertEqual(len(res_snt.json()["token"].split(".")), 3)

            res_trd = client.post("/auth/login", json={"username": "trd_desk", "password": "trd123"})
            self.assertEqual(res_trd.status_code, 200)
            self.assertEqual(res_trd.json()["role"], "TRD")
            self.assertEqual(len(res_trd.json()["token"].split(".")), 3)

            # 3. Test Invalid Password Rejection (401)
            res_fail = client.post("/auth/login", json={"username": "coordinator_desk", "password": "wrongpassword"})
            self.assertEqual(res_fail.status_code, 401)

            # 4. Test Accounts List
            res_acc = client.get("/auth/accounts")
            self.assertEqual(res_acc.status_code, 200)
            self.assertEqual(len(res_acc.json()), 4)

            # 5. Test /auth/me Profile Verification with Valid JWT
            res_me = client.get("/auth/me", headers={"Authorization": f"Bearer {coord_token}"})
            self.assertEqual(res_me.status_code, 200)
            self.assertEqual(res_me.json()["username"], "coordinator_desk")
            self.assertEqual(res_me.json()["role"], "coordinator")

            # 6. Test /auth/me with Tampered / Invalid JWT (401)
            res_bad = client.get("/auth/me", headers={"Authorization": "Bearer invalid.jwt.token"})
            self.assertEqual(res_bad.status_code, 401)

    def test_03_tasks_endpoint(self):
        with TestClient(app) as client:
            response = client.get("/tasks")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["status"], "OPTIMAL")
            self.assertGreaterEqual(len(data["tasks"]), 9)
            self.assertGreaterEqual(len(data["schedule"]), 9)
            self.assertIn("metrics", data)
            self.assertIn("baseline_metrics", data)

    def test_04_create_task_endpoint(self):
        with TestClient(app) as client:
            new_task_payload = {
                "department": "Engineering",
                "section_id": "A",
                "duration_minutes": 30,
                "criticality": 4,
                "due_date": "2026-09-05",
                "description": "Track inspection test"
            }
            response = client.post("/tasks", json=new_task_payload)
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn(data["status"], ("OPTIMAL", "FEASIBLE"))
            # Verify the new task was added and description was preserved
            created_tasks = [t for t in data["tasks"] if t["description"] == "Track inspection test"]
            self.assertTrue(len(created_tasks) > 0)
            self.assertEqual(created_tasks[0]["department"], "Engineering")
            self.assertEqual(created_tasks[0]["duration_minutes"], 30)

    def test_05_graph_endpoint(self):
        with TestClient(app) as client:
            response = client.get("/graph")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertGreaterEqual(len(data["conflicts"]), 5)
            self.assertGreaterEqual(len(data["synergies"]), 4)

    def test_06_schedule_endpoints(self):
        with TestClient(app) as client:
            response = client.post("/schedule/baseline", json={})
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertGreaterEqual(len(data["schedule"]), 9)

            response = client.post("/schedule/optimize", json={})
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn(data["status"], ("OPTIMAL", "FEASIBLE"))
            self.assertGreaterEqual(len(data["schedule"]), 9)
            self.assertGreaterEqual(len(data["explanations"]), 9)

    def test_07_metrics_endpoint(self):
        with TestClient(app) as client:
            response = client.get("/metrics")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("baseline", data)
            self.assertIn("optimized", data)

    def test_08_decisions_endpoints(self):
        with TestClient(app) as client:
            payload = {
                "schedule_entry_id": "T1",
                "action": "approved",
                "timestamp": "2026-09-01T12:00:00",
                "note": "Verified power isolation window."
            }
            response = client.post("/decisions", json=payload)
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["status"], "success")

            response = client.get("/decisions")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIsInstance(data, list)
            self.assertGreater(len(data), 0)

    def test_09_weekly_schedule_endpoint(self):
        """Verify full 7-day weekly horizon scheduling and multi-day deferral tracking."""
        with TestClient(app) as client:
            res = client.get("/schedule/weekly")
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data["status"], "OPTIMAL")
            self.assertGreaterEqual(data["total_tasks"], 16)
            self.assertGreaterEqual(data["scheduled_tasks"], 16)
            self.assertIn("deferrals", data)
            self.assertGreater(len(data["deferrals"]), 0, "Expected at least one task deferred to a later day")
            # Verify task T0 deferral to Day 2
            deferred_ids = [d["task_id"] for d in data["deferrals"]]
            self.assertIn("T0", deferred_ids, "Task T0 should be deferred due to window capacity")

    def test_10_provenance_endpoint(self):
        """Verify data provenance metadata endpoint returns valid source classifications and health."""
        with TestClient(app) as client:
            res = client.get("/data/provenance")
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data["status"], "healthy")
            self.assertIn("datasets", data)
            self.assertIn("indian_railways_timetable", data["datasets"])
            self.assertEqual(data["datasets"]["indian_railways_timetable"]["source"], "real_public")
            self.assertGreater(data["datasets"]["indian_railways_timetable"]["record_count"], 100000)
            self.assertIn("maintenance_windows", data["datasets"])
            self.assertEqual(data["datasets"]["maintenance_windows"]["source"], "real_public_derived")
            self.assertIn("ml_priority_model", data["datasets"])
            self.assertEqual(data["datasets"]["ml_priority_model"]["source"], "synthetic_trained")
            self.assertIn("r2_score", data["datasets"]["ml_priority_model"]["metrics"])

    def test_11_about_endpoint(self):
        """Verify public unauthenticated /about architectural and operational context endpoint."""
        with TestClient(app) as client:
            res = client.get("/about")
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data["problem_id"], "BLOCKSYNC-TPJ")
            self.assertEqual(data["division"], "Southern Railway · Tiruchirappalli Division (TPJ)")
            self.assertIn("corridors", data)
            self.assertEqual(len(data["corridors"]), 3)
            self.assertIn("problem_context", data)
            self.assertIn("separation_of_concerns", data)
            self.assertIn("ml_role", data["separation_of_concerns"])
            self.assertIn("cpsat_role", data["separation_of_concerns"])
            self.assertIn("human_role", data["separation_of_concerns"])
            self.assertIn("data_provenance", data)
            self.assertIn("ml_model_specifications", data)
            self.assertIn("optimizer_specifications", data)
            self.assertIn("operational_limitations", data)


if __name__ == "__main__":
    unittest.main()


