"""
Unit and integration tests verifying security posture and production defaults:
1. When BLOCKSYNC_DEMO_MODE is off/default and PYJWT_SECRET is missing,
   application startup is refused with a clear error.
2. When BLOCKSYNC_DEMO_MODE is off/default, GET /auth/accounts returns an empty list
   (no demo accounts or password hints exposed).
"""

import os
import unittest
from starlette.testclient import TestClient

from backend.main import app


class TestSecurityDefaults(unittest.TestCase):
    """Validates production default behaviors and startup guardrails."""

    def test_startup_refused_when_demo_mode_off_and_no_jwt_secret(self):
        """Verify startup raises RuntimeError when demo mode is off and PYJWT_SECRET is unset."""
        orig_demo = os.environ.get("BLOCKSYNC_DEMO_MODE")
        orig_secret = os.environ.get("PYJWT_SECRET")
        orig_jwt = os.environ.get("JWT_SECRET")

        try:
            # Simulate production defaults without secret
            os.environ["BLOCKSYNC_DEMO_MODE"] = "false"
            os.environ.pop("PYJWT_SECRET", None)
            os.environ.pop("JWT_SECRET", None)

            with self.assertRaises(RuntimeError) as ctx:
                with TestClient(app):
                    pass

            self.assertIn("PYJWT_SECRET", str(ctx.exception))
            self.assertIn("disabled", str(ctx.exception))
        finally:
            # Restore environment
            if orig_demo is not None:
                os.environ["BLOCKSYNC_DEMO_MODE"] = orig_demo
            else:
                os.environ.pop("BLOCKSYNC_DEMO_MODE", None)

            if orig_secret is not None:
                os.environ["PYJWT_SECRET"] = orig_secret
            else:
                os.environ.pop("PYJWT_SECRET", None)

            if orig_jwt is not None:
                os.environ["JWT_SECRET"] = orig_jwt
            else:
                os.environ.pop("JWT_SECRET", None)

    def test_auth_accounts_empty_when_demo_mode_off(self):
        """Verify GET /auth/accounts returns an empty list when demo mode is not enabled."""
        orig_demo = os.environ.get("BLOCKSYNC_DEMO_MODE")
        try:
            # Explicitly turn demo mode off
            os.environ["BLOCKSYNC_DEMO_MODE"] = "false"

            with TestClient(app) as client:
                res = client.get("/auth/accounts")
                self.assertEqual(res.status_code, 200)
                data = res.json()
                self.assertEqual(data, [], "Demo accounts and password hints must not be exposed when demo mode is off")
        finally:
            if orig_demo is not None:
                os.environ["BLOCKSYNC_DEMO_MODE"] = orig_demo
            else:
                os.environ.pop("BLOCKSYNC_DEMO_MODE", None)


if __name__ == "__main__":
    unittest.main()
