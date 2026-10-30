"""
Pytest session configuration for BlockSync.
Ensures tests execute against an isolated temporary SQLite database,
preventing mutation of the real data/blocksync.db.
Also sets BLOCKSYNC_DEMO_MODE=true and PYJWT_SECRET for the test suite.
"""

import os
import tempfile
import pytest
from pathlib import Path


_temp_dir = tempfile.TemporaryDirectory()
_temp_db_path = Path(_temp_dir.name) / "test_blocksync.db"

# Direct environment variable and module attribute to temporary database
os.environ["BLOCKSYNC_DB_PATH"] = str(_temp_db_path)
os.environ["BLOCKSYNC_DEMO_MODE"] = "true"
os.environ["PYJWT_SECRET"] = "test-secret-key-for-blocksync-testing-suite-32chars"

import backend.db
backend.db.DB_PATH = _temp_db_path
backend.db.init_db()


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    yield
    _temp_dir.cleanup()
