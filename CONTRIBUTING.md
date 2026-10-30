# Contributing to BlockSync

Thank you for your interest in contributing to BlockSync!

---

## Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/srivarsan007/blocksync.git
   cd blocksync
   ```

2. Set up the Python virtual environment and dependencies:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements-dev.txt
   ```

3. Set up the frontend:
   ```bash
   cd frontend
   npm ci
   cd ..
   ```

---

## Running Verification

Before submitting a Pull Request, verify that all backend tests pass and the frontend compiles cleanly:

```bash
# Run backend test suite
PYTHONPATH=. venv/bin/pytest tests/ -v

# Run frontend production build
cd frontend && npm run build
```

---

## Code Quality Guidelines

- **Solver Integrity**: Do not weaken or bypass CP-SAT hard constraints (e.g., 25kV traction power isolation conflict prevention or window boundary checks).
- **Safety & Disclaimers**: Preserve the human-in-the-loop decision-support principle and all demo disclaimers.
- **Dependencies**: Keep runtime dependencies minimal and permissive (MIT, Apache 2.0, BSD).
