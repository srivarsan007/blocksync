# Dataset Documentation & Provenance

This directory contains the operational and public datasets utilized by BlockSync for railway maintenance block scheduling and corridor gap analysis.

---

## 1. Indian Railways Timetable Dataset (`indian_railways_timetable_official.csv`)

- **Dataset Name**: Indian Railways Train Time Table
- **Source**: Ministry of Railways via [data.gov.in](https://data.gov.in/resource/indian-railways-train-time-table)
- **License**: [Government Open Data License - India (GODL-India)](https://data.gov.in/government-open-data-license-india)
- **Original Size**: 186,124 scheduled train stop records across the entire national rail network (~16 MB).
- **Committed Subset**: 277 rows (~26 KB).

### Filtering Details
To keep the public repository lightweight and immediately cloneable without Git LFS, the raw dataset was filtered to include only scheduled train movements across the Tiruchirappalli (TPJ) division corridors evaluated by BlockSync:
- `TPJ`: Tiruchirappalli Junction
- `SRGM`: Srirangam
- `GOC`: Golden Rock
- `KRR`: Karur Junction

### Reproduction Script
To reproduce this filtered subset from the raw national dataset:
```python
import pandas as pd

# Load raw dataset from data.gov.in
raw_df = pd.read_csv("indian_railways_timetable_raw.csv", low_memory=False)

# Filter for TPJ division corridor stations
stations = ["TPJ", "SRGM", "GOC", "KRR"]
filtered_df = raw_df[raw_df["Station Code"].isin(stations)]

# Save filtered CSV
filtered_df.to_csv("data/indian_railways_timetable_official.csv", index=False)
```

---

## 2. Derived Maintenance Windows (`maintenance_windows.csv`)

- **Origin**: Derived programmatically from `indian_railways_timetable_official.csv` using `optimizer/derive_windows.py`.
- **Methodology**: Analyzes consecutive passenger train arrivals and departures during daytime shifts (06:00 – 15:00) to identify timetable gaps exceeding 180 minutes.
- **Records**: 3 calibrated maintenance windows corresponding to Section A (TPJ–SRGM), Section B (TPJ–GOC), and Section C (TPJ–KRR).

---

## 3. Maintenance Backlog Requests (`sample_dataset.csv`)

- **Origin**: Synthetic standardized maintenance work orders formulated in accordance with the Indian Railways Permanent Way Manual (IRPWM) and Signal Engineering Manual (SEM).
- **Records**: 9 baseline tasks across Civil Engineering, Signal & Telecom (S&T), and Traction Distribution (TRD).
- **Usage**: Serves as the initial backlog scenario for baseline scheduling and CP-SAT joint bundling optimization.

---

## 4. Metadata Provenance (`metadata.json`)

Contains machine-readable provenance metadata, corridor definitions, record counts, and schema mappings surfaced in the application's Data Sources modal.
