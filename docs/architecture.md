# BLOCKSYNC MASTER TECHNICAL ARCHITECTURE
### Cross-Department Railway Maintenance Block Optimization Engine
### Technical reference and specification for system architecture and solver design.

---

## SECTION 1 — PROJECT EXECUTIVE SUMMARY

Indian Railways has three departments — Engineering, Signal & Telecom (S&T), and Traction Distribution (TRD) — that each need the same shared resource (a stretch of track, temporarily closed to trains) to do maintenance. Today each department requests its closure separately, and a human manually tries to fit the requests together, often missing chances to combine compatible requests into one shared closure instead of two or three.

BlockSync takes all departments' requests, automatically finds which ones conflict (can't happen together), which ones could be safely combined, and produces an explained, optimized schedule for a human coordinator to approve, modify, or reject. It never finalizes anything on its own.

**What it is:** a decision-support and optimization layer using deterministic constraint programming (Google OR-Tools CP-SAT) — not machine learning, not an autonomous control system.

**What it is not:** a replacement for Indian Railways' existing systems (BDMS, COA, TMS, SMMS, TDMS, SATSaNG all remain real and unreplaced); a claim to have invented railway scheduling optimization (the technique is 25+ years established internationally); a system that can approve a real railway block by itself.

---

## SECTION 2 — THE EXACT PROBLEM WE ARE SOLVING

Three departments submit maintenance requests independently:
- **Engineering** — track, ballast, points/switches, bridges, civil structures.
- **S&T** — signals, track circuits, interlocking, point machines, communications.
- **TRD** — overhead electrical equipment (OHE), substations, power isolation.

Requests compete for the same limited resource: a **maintenance block** (a temporary closure of a track section to train traffic, authorized within a limited available time window).

**The gap, precisely:** Indian Railways' own systems (see Section 4 for detail) track and record these requests — but nothing computes the *jointly optimal* cross-department schedule. That reconciliation is manual today. BlockSync fills exactly that gap — no more, no less.

**Never claim:** that Indian Railways has no digital systems, that BDMS does nothing, that we invented scheduling optimization, or that AI autonomously controls real railway blocks. All false and easily disproven by anyone who inspects standard railway operating manuals.

---

## SECTION 3 — PROJECT OBJECTIVES

**MVP OBJECTIVES (build these):**
- Realistic synthetic dataset of maintenance requests across the three departments, one railway division.
- Deterministic conflict detection between requests.
- Deterministic synergy/bundling detection between requests.
- A working CP-SAT model that produces a valid, optimized schedule.
- A baseline (naive/greedy) scheduler for honest before/after comparison.
- Explanations generated for every scheduling decision.
- A FastAPI backend exposing the pipeline.
- A React frontend showing the full flow end to end.
- A human approval step (approve/modify/reject) — simulated, not connected to any real system.
- Metrics computed directly from the prototype's own run (never fabricated).

**FUTURE SCOPE (do not build, do not imply is built):**
- Real integration with BDMS/TMS/SMMS/TDMS/SATSaNG APIs.
- Multi-division, zone-wide, or national deployment.
- Any real Indian Railways data.
- Authentication, multi-user support, cloud deployment, Docker.

---

## SECTION 4 — FINAL SYSTEM ARCHITECTURE

```
Engineering Requests  +  S&T Requests  +  TRD Requests   (synthetic, generated)
                         ↓
                DATA NORMALIZATION
   (standardize department, section, duration, criticality, due date)
                         ↓
        CONFLICT + SYNERGY GRAPH CONSTRUCTION
   CONFLICT edge = cannot coexist   SYNERGY edge = could share one block
                         ↓
            AVAILABLE MAINTENANCE WINDOWS
        (synthetic, timetable-derived, per section)
                         ↓
                  CONSTRAINT MODEL
  HARD: no conflicting overlap · window capacity · required duration ·
        operational restrictions (e.g. TRD isolation incompatibility)
  SOFT (objective): maximize bundling · prioritize criticality ·
        minimize block count · minimize overdue delay
                         ↓
         CP-SAT OPTIMIZER  (Google OR-Tools)
                         ↓
              EXPLAINABILITY ENGINE
      (deterministic reason generated per decision)
                         ↓
                  FASTAPI BACKEND
                         ↓
                  REACT FRONTEND
                         ↓
         HUMAN COORDINATOR: Approve / Modify / Reject
```

**Existing Indian Railways systems this conceptually sits above (VERIFIED via CRIS's system directory — do not contradict this in any generated content):** BDMS (block/disconnection request tracking), COA (control-room charting), TMS/SMMS/TDMS (department-specific maintenance records), SATSaNG (train timetabling — this is the real-world source of what our synthetic "available windows" represent). None of these compute a joint cross-department schedule. BlockSync's MVP does not connect to any of them — it uses synthetic data structured the same way they would provide it.

---

## SECTION 5 — DATA ARCHITECTURE

**MaintenanceTask (a "maintenance request"):**
```json
{
  "request_id": "E1",
  "department": "Engineering",
  "railway_section": "A",
  "task_description": "Rail joint repair",
  "duration_minutes": 45,
  "priority": "High",
  "criticality": 5,
  "due_date": "2026-09-01",
  "required_resources": ["track_crew"],
  "status": "pending"
}
```

**MaintenanceWindow:**
```json
{
  "window_id": "W-A-morning",
  "railway_section": "A",
  "start_time": "2026-09-01T10:00:00",
  "end_time": "2026-09-01T12:00:00",
  "available_duration_minutes": 120
}
```

**Conflict:**
```json
{
  "task_id_1": "T1",
  "task_id_2": "E1",
  "reason": "Same section, overlapping time, TRD requires power isolation incompatible with concurrent non-isolated crew"
}
```

**Synergy / Bundling:**
```json
{
  "task_id_1": "E1",
  "task_id_2": "S1",
  "reason": "Same section, compatible departments (Engineering + S&T), overlapping preferred window"
}
```

**Optimized Schedule (one entry):**
```json
{
  "task_id": "E1",
  "assigned_window_id": "W-A-morning",
  "bundle_group_id": "BUNDLE-1",
  "start_offset_minutes": 0
}
```

**Explanation:**
```json
{
  "schedule_entry_task_id": "E1",
  "reason_text": "Bundled with S1 — same section, compatible work, overlapping preferred window.",
  "constraint_involved": "synergy_bundling",
  "conflict_avoided": null,
  "synergy_captured": ["E1", "S1"]
}
```

**Human Decision:**
```json
{
  "schedule_entry_task_id": "E1",
  "action": "approved",
  "note": "",
  "timestamp": "2026-09-01T09:15:00"
}
```

---

## SECTION 6 — PROJECT DIRECTORY STRUCTURE

```
blocksync/
    ├── README.md
    ├── requirements.txt
    ├── .gitignore
    ├── data_gen/
    │   └── generate.py
    ├── data/
    │   └── sample_dataset.csv
    ├── backend/
    │   ├── main.py
    │   ├── models.py
    │   └── routes/
    │       ├── tasks.py
    │       ├── graph.py
    │       ├── schedule.py
    │       └── decisions.py
    ├── optimizer/
    │   ├── graph.py
    │   ├── baseline.py
    │   ├── solver.py
    │   ├── explain.py
    │   └── metrics.py
    ├── frontend/
    │   └── src/
    ├── tests/
    │   └── test_*.py
    └── docs/
        └── architecture.md   (a copy of this handover file)
```

**Never delete existing files in this folder automatically.** If the folder already contains partial work from a previous attempt, inspect it first and report what's there before changing anything.

---

## SECTION 7 — DETAILED MODULE ARCHITECTURE

| # | Module | Purpose | Input | Processing | Output | Files | Dependencies | Tests | Failure cases |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Data Models | Define every entity's shape | — | Pydantic class definitions | Importable schema | `backend/models.py` | pydantic | Instantiate each model with valid + invalid data | Field type mismatches silently accepted |
| 2 | Synthetic Data Generator | Produce the demo dataset | Generation rules (Section 10) | Rule-based generation, not random noise | `data/sample_dataset.csv` | `data_gen/generate.py` | pandas | Manually verify guaranteed conflict/synergy pairs exist | Dataset with no overlaps — proves nothing |
| 3 | Data Normalization | Standardize raw request fields | Raw generated/loaded records | Type coercion, field validation | Clean Task objects | `optimizer/graph.py` (top of file) or a dedicated `optimizer/normalize.py` | Module 1 | Malformed record raises a clear error, not a silent skip | Silently dropping bad records |
| 4 | Conflict Detection | Find CONFLICT edges | Task list | Pairwise rule check (Section 11) | Conflict list | `optimizer/graph.py` | Module 3 | Compare against hand-verified fixture pairs | Missing symmetric pair (A-B found but not B-A checked once) |
| 5 | Synergy Detection | Find SYNERGY edges | Task list | Pairwise rule check (Section 12) | Synergy list | `optimizer/graph.py` | Module 3 | Same approach as Module 4 | Marking incompatible departments as synergistic |
| 6 | Maintenance Window Processing | Load/serve available windows | Synthetic window data | Filter by section/time | Window list per section | `optimizer/graph.py` or `data_gen/generate.py` | Module 2 | Confirm windows are tight enough to force real scheduling decisions | Windows so generous that optimization has nothing to prove |
| 7 | CP-SAT Optimization | Solve for the best schedule | Tasks + conflicts + synergies + windows | CP-SAT model (Section 13) | Schedule assignment | `optimizer/solver.py` | OR-Tools, Modules 4/5/6 | Verify zero hard-constraint violations in output | Infeasible case crashing instead of reporting cleanly |
| 8 | Explainability Engine | Generate reasons | Solver's internal decision trace | Deterministic template-based text generation (Section 14) | Explanation objects | `optimizer/explain.py` | Module 7 | Every scheduled task has a non-generic explanation | Explanation text disconnected from actual solver logic |
| 9 | SQLite Database Layer | Persist the dataset for the demo | CSV/JSON data | Load into SQLite tables matching Section 5 | Queryable DB | `backend/models.py` + a small `backend/db.py` | Module 1 | Insert + query round-trip | Schema mismatch with Pydantic models |
| 10 | FastAPI Backend | Serve everything | HTTP requests | Route to the right module | JSON responses | `backend/main.py`, `backend/routes/*.py` | Modules 1–9 | Hit every endpoint with `curl`, check status codes | Unhandled exception returning a raw stack trace |
| 11 | React Frontend | Coordinator UI | API responses | Render views (Section 16) | Visual demo | `frontend/src/` | Module 10 | Manual click-through of the full flow | Over-building UI at the expense of the working pipeline |
| 12 | Testing | Confidence before demo | All modules | Section 17's test list | Pass/fail report | `tests/` | All modules | — | Skipping a failed test instead of fixing it |
| 13 | Demo Scenario | The actual presented example | Fixed dataset | Section 18's worked example | Rehearsed, reliable demo | `data/sample_dataset.csv` (frozen) | All modules | Full dry run, timed | Regenerating the demo dataset randomly right before presenting |

---

## SECTION 8 — IMPLEMENTATION ORDER

**PHASE 1 — Environment Setup.** Python venv, dependencies installed, folder structure created exactly as Section 6. Do not proceed until `python3 --version` and `pip list` both work inside the venv.

**PHASE 2 — Project Structure.** Create every file listed in Section 6 (empty is fine initially). Commit to git.

**PHASE 3 — Data Models.** Implement Section 1 of the module table. Test before moving on.

**PHASE 4 — Synthetic Data Generator.** Implement Module 2. Manually inspect the CSV. Hand-verify the guaranteed conflict/synergy pairs exist *before* writing any detection code.

**PHASE 5 — Conflict + Synergy Detection.** Implement Modules 3, 4, 5. Test against the hand-verified fixture from Phase 4.

**PHASE 6 — Baseline Scheduler.** A simple greedy/first-come scheduler with zero bundling — this is the honest "before" comparison, and it must exist before the optimizer so there's something real to compare against.

**PHASE 7 — CP-SAT Optimizer.** Implement Module 7. This is the highest-risk, most important phase — budget the most time here. Confirm it beats the baseline on block count on the fixed dataset.

**PHASE 8 — Explainability Engine.** Implement Module 8, tied directly to Phase 7's actual solver output.

**PHASE 9 — Database Layer + FastAPI Backend.** Implement Modules 9 and 10. Confirm every endpoint works via `curl` before touching the frontend.

**PHASE 10 — React Frontend.** Implement Module 11 — only after Phase 9 is fully working end-to-end via `curl`. Do not start the frontend before the backend actually produces real results.

**PHASE 11 — Testing.** Fill out Section 17's test list properly.

**PHASE 12 — Demo Scenario Rehearsal.** Freeze the dataset, run the full flow at least twice, time it.

**Do not skip ahead to the frontend before the backend and optimizer are proven correct on the fixed dataset.**

---

## SECTION 9 — FILE-BY-FILE IMPLEMENTATION PLAN

**`backend/models.py`** — Purpose: Pydantic schemas for every Section 5 entity. Classes: `MaintenanceTask`, `MaintenanceWindow`, `Conflict`, `Synergy`, `ScheduleEntry`, `Explanation`, `HumanDecision`. Inputs: none (pure definitions). Outputs: importable classes. Dependencies: pydantic. Test: instantiate each with a valid example from Section 5 and one deliberately invalid example, confirm validation behaves as expected.

**`data_gen/generate.py`** — Purpose: produce `data/sample_dataset.csv`. Functions: `generate_tasks(n)`, `generate_windows()`, `write_dataset(path)`. Inputs: generation rules (Section 10). Outputs: CSV file. Dependencies: pandas. Test: run it, open the CSV, manually confirm at least 2 guaranteed conflict pairs and 2 guaranteed synergy pairs exist as designed, not left to chance.

**`optimizer/graph.py`** — Purpose: build conflict + synergy edges from tasks. Functions: `build_conflicts(tasks) -> list[Conflict]`, `build_synergies(tasks) -> list[Synergy]`, `is_compatible(dept_a, dept_b) -> bool`. Inputs: task list. Outputs: two edge lists. Dependencies: Module 1. Test: run against a small hand-built fixture (3–4 tasks with a known expected conflict and a known expected synergy) and assert the exact expected pairs come back — no more, no less.

**`optimizer/baseline.py`** — Purpose: naive/greedy scheduler. Functions: `schedule_greedy(tasks, windows) -> list[ScheduleEntry]`. Logic: process tasks in input order, assign each to the earliest non-conflicting window, never check for bundling. Test: confirm output has zero bundled pairs by construction and zero hard-conflict violations.

**`optimizer/solver.py`** — Purpose: CP-SAT optimization. Functions: `build_model(tasks, conflicts, synergies, windows) -> CpModel`, `solve(model) -> Solution | InfeasibleResult`. Logic: Section 13 in full. Test: run on the fixed dataset, assert zero hard-constraint violations, assert block count ≤ baseline's block count, and separately test a deliberately over-constrained mini-scenario returns a clean infeasibility report, not a crash.

**`optimizer/explain.py`** — Purpose: generate a reason per scheduled task. Functions: `explain_entry(entry, solver_trace) -> Explanation`. Test: every task in a solved schedule has a non-empty, non-identical-across-tasks explanation string.

**`optimizer/metrics.py`** — Purpose: compute before/after comparison numbers. Functions: `compute_metrics(schedule) -> dict` (blocks used, total downtime, bundled pairs, conflicts resolved, on-time critical tasks, overdue tasks). Test: manually recompute one metric by hand on the fixed dataset and confirm it matches.

**`backend/main.py`** — Purpose: FastAPI app entry point, mounts routers. Test: `uvicorn backend.main:app --reload` starts without error.

**`backend/routes/tasks.py`** — Endpoint: `GET /tasks`. Purpose: return the current dataset. Test: `curl localhost:8000/tasks` returns valid JSON matching Section 5's shape.

**`backend/routes/graph.py`** — Endpoint: `GET /graph`. Purpose: return conflicts + synergies. Test: matches Module 4/5's fixture-verified output.

**`backend/routes/schedule.py`** — Endpoints: `POST /schedule/baseline`, `POST /schedule/optimize`. Purpose: trigger Module 6/7. Test: both return valid schedules; optimize returns a clean infeasibility object (not a 500 error) on a deliberately bad input.

**`backend/routes/decisions.py`** — Endpoint: `POST /decisions`. Purpose: record a human approve/modify/reject action. Test: posts and persists correctly.

**`frontend/src/*`** — Screens per Section 16. Build only after every backend endpoint above is confirmed working via `curl`.

---

## SECTION 10 — SYNTHETIC DATA DESIGN

Generate 15–25 tasks, roughly evenly split across Engineering/S&T/TRD. Durations: Engineering 20–60 min, S&T 15–45 min, TRD 20–50 min — realistic ranges, not arbitrary. Criticality: mostly medium/low, a deliberate handful high, to create real priority tension. Assign `railway_section` so **several tasks deliberately share a section** — this is what creates anything interesting to detect.

**Explicitly construct, not leave to chance:**
- At least 2–3 guaranteed synergy pairs (same section, compatible departments — Engineering+S&T is the compatible pairing in the MVP compatibility table; TRD is incompatible with both others by default because of its power-isolation requirement).
- At least 1–2 guaranteed conflicts (typically TRD vs. another department, same section, overlapping time).
- At least one overdue task.
- At least one section with all three departments requesting the same day (genuine three-way tension).
- Windows tight enough that the naive baseline visibly wastes time compared to the optimized result — otherwise the demo proves nothing.

**Label every generated file/dataset explicitly as synthetic** (a header comment or a `"synthetic": true` metadata field) — never let it look like a real export.

---

## SECTION 11 — CONFLICT DETECTION LOGIC

```
for each pair (task_i, task_j):
    if task_i.railway_section == task_j.railway_section:
        if time_windows_overlap(task_i, task_j):
            if not is_compatible(task_i.department, task_j.department):
                record_conflict(task_i, task_j, reason=...)
```

**MVP compatibility table (deterministic, not learned):**
| Dept A | Dept B | Compatible? |
|---|---|---|
| Engineering | S&T | Yes |
| Engineering | TRD | No (TRD's power isolation requirement) |
| S&T | TRD | No (same reasoning) |

This table is a data-driven rule set, not a hard-coded if/else chain — keep it as a small lookup structure so it's easy to extend later without touching the detection logic itself.

---

## SECTION 12 — SYNERGY / BUNDLING LOGIC

```
for each pair (task_i, task_j):
    if task_i.railway_section == task_j.railway_section:
        if time_windows_overlap_or_adjacent(task_i, task_j):
            if is_compatible(task_i.department, task_j.department):
                record_synergy(task_i, task_j, reason=...)
```

A pair can appear as a synergy candidate only — whether it's *actually* bundled in the final schedule is the optimizer's decision (Section 13), not the graph-construction step's. Do not conflate "could bundle" with "will bundle."

---

## SECTION 13 — CP-SAT OPTIMIZATION DESIGN

**Decision variables:** `start[i]`, `end[i]` (integer, minutes from day start) and an `interval[i] = NewIntervalVar(...)` per task; `bundled[i][j]` (boolean) for every synergy-eligible pair.

**Hard constraints:**
- Every task's interval falls within one of its section's available windows.
- For every CONFLICT pair on the same section: `NoOverlap([interval_i, interval_j])`.
- For every SYNERGY pair: if `bundled[i][j]` is true, force `start[i] == start[j]`; if false, treat as an ordinary non-overlapping pair.
- Already-overdue, high-criticality tasks (criticality ≥ 4) must be scheduled within the current planning horizon.

**Objective function (exact form, reuse consistently across all code and documentation):**
`Maximize: (w1 × Σ bundled[i][j]) + (w2 × Σ criticality[i] for on-time completions) − (w3 × total_distinct_blocks_used) − (w4 × Σ delay_days for overdue tasks)`
Starting weights: `w1=10, w2=5, w3=3, w4=8` — tune during testing, document any change and why.

**Priority logic:** criticality multiplies the on-time-completion reward term directly.

**Bundling logic:** only ever offered on SYNERGY edges; never forced.

**Unschedulable task handling:** if CP-SAT returns `INFEASIBLE`, do not crash or silently drop tasks — report which specific hard constraints are in tension (typically: too many high-criticality conflicting requests for the available windows).

**Explainability inputs:** the solver's variable assignments and which constraints were binding for each task are exactly what Section 14 consumes — don't discard this information after solving.

---

## SECTION 14 — EXPLAINABILITY ENGINE DESIGN

Generate explanations **deterministically from the solver's actual output**, never as a separate, independently-written narrative that could drift from what really happened.

```
Decision: Task {id} scheduled in Window {window_id}[, bundled with {other_id}]
Reason: [same section, compatible departments, overlapping window] OR [no synergy candidate found]
Constraint involved: synergy_bundling | criticality_priority | window_capacity
Conflict avoided: [task_id if a conflicting task was displaced to a different window]
Synergy captured: [task_id list if bundled]
```

Template-based generation reading directly from the solver's variable values is sufficient — no LLM call needed or appropriate here.

---

## SECTION 15 — FASTAPI API DESIGN

- `GET /tasks` → current dataset
- `GET /graph` → `{"conflicts": [...], "synergies": [...]}`
- `POST /schedule/baseline` → greedy schedule
- `POST /schedule/optimize` → CP-SAT schedule + explanations, or `{"status": "infeasible", "conflicting_constraints": [...]}`
- `GET /metrics?baseline_id=&optimized_id=` → Section 19's comparison numbers
- `POST /decisions` → record a human approve/modify/reject action

Standard FastAPI validation errors for malformed input; a distinct, explicit infeasibility object (not a generic 500) when the solver genuinely can't find a solution.

---

## SECTION 16 — REACT FRONTEND DESIGN

Minimum screens, in order: **Dashboard** (overview) → **Maintenance Requests** (raw task list by department) → **Detected Conflicts** → **Bundling Opportunities** → **Optimized Schedule** (vs. baseline, side by side) → **Explanation panel** (click any scheduled task) → **Human Approval Controls** (approve/modify/reject buttons, clearly simulated, not connected to any real system).

Keep it plain — no authentication, no multi-user support, no real-time data feed.

---

## SECTION 17 — TESTING PLAN

| Module | Test |
|---|---|
| Data Generator | Guaranteed conflict/synergy pairs present after generation |
| Conflict Detection | Matches hand-verified fixture exactly |
| Synergy Detection | Matches hand-verified fixture exactly |
| CP-SAT Solver | Zero hard-constraint violations on fixed dataset; clean infeasibility report on a deliberately over-constrained mini-case |
| Explainability | Every scheduled task has a non-generic explanation |
| Metrics | One metric manually recomputed by hand matches system output |
| API | Every endpoint returns correct status/shape via `curl` |
| Frontend | Full click-through of every screen at least once |
| Demo | Full timed dry run, at least twice |

---

## SECTION 18 — DEMONSTRATION SCENARIO

**BEFORE BLOCKSYNC (baseline):** Section A, one day — E1 (Engineering, 45 min), S1 (S&T, 30 min), T1 (TRD, 40 min) scheduled sequentially, no bundling check: 3 separate closures, 115 minutes total downtime.

**AFTER BLOCKSYNC (optimized):** E1 + S1 recognized as compatible (same section, non-electrical, overlapping window) → bundled into one 45-minute closure. T1 kept separate (power isolation requirement, correctly not bundled). Result: 2 closures, 85 minutes total downtime, same work completed, all high-criticality tasks still done same-day.

This exact scenario should be the frozen, rehearsed demo dataset — not regenerated randomly before presenting.

---

## SECTION 19 — EVALUATION EVIDENCE AND METRICS

Only ever report numbers computed directly from the system's own run: total blocks used (baseline vs. optimized), total block-minutes/downtime, bundled task-pairs, conflicts detected and resolved, criticality-weighted on-time completions, overdue tasks remaining, schedule utilization. Always state: *"Measured on our prototype scenario using synthetic data and published Indian Railways timetable gaps — not a claim of real railway-wide savings."*

