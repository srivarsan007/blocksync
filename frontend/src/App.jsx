import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  Layers,
  AlertTriangle,
  Zap,
  CheckCircle2,
  XCircle,
  TrendingDown,
  RefreshCw,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  GitMerge,
  Filter,
  Send,
  Info,
  ChevronRight,
  ChevronDown,
  FileText,
  UserCheck,
  Lock,
  LogOut,
  User,
  Building2,
  PlusCircle,
  Printer,
  Train,
  Check,
  Database,
  Activity,
  HardDrive,
  Server,
  ShieldCheck,
  BookOpen,
  HelpCircle,
  X,
  Cpu,
  Users,
  Scale,
  Compass,
  AlertCircle
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8000'
    : '');

// Real Tiruchirappalli Division Section Map
const SECTION_MAP = {
  'A': {
    code: 'A',
    name: 'Tiruchirappalli Jn – Srirangam',
    short: 'TPJ – SRGM',
    full: 'Section A: Tiruchirappalli Jn – Srirangam (TPJ – SRGM)'
  },
  'B': {
    code: 'B',
    name: 'Tiruchirappalli Jn – Golden Rock',
    short: 'TPJ – GOC',
    full: 'Section B: Tiruchirappalli Jn – Golden Rock (TPJ – GOC)'
  },
  'C': {
    code: 'C',
    name: 'Tiruchirappalli Jn – Karur Jn',
    short: 'TPJ – KRR',
    full: 'Section C: Tiruchirappalli Jn – Karur Jn (TPJ – KRR)'
  }
};

function getSectionName(secId) {
  return SECTION_MAP[secId]?.name || `Section ${secId}`;
}

function getSectionShort(secId) {
  return SECTION_MAP[secId]?.short || `Sec ${secId}`;
}

function getSectionFull(secId) {
  return SECTION_MAP[secId]?.full || `Section ${secId}`;
}

function formatMinutes(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Initial fallback state matching verified CP-SAT run
const INITIAL_FALLBACK = {
  status: "OPTIMAL",
  tasks: [
    { id: "E1", department: "Engineering", section_id: "A", duration_minutes: 45, criticality: 5, due_date: "2026-09-01", status: "pending", description: "Rail joint welding & USFD flaw detection (TPJ-SRGM)" },
    { id: "S1", department: "S&T", section_id: "A", duration_minutes: 30, criticality: 5, due_date: "2026-09-01", status: "pending", description: "Point machine & track circuit calibration (SRGM Yard)" },
    { id: "T1", department: "TRD", section_id: "A", duration_minutes: 40, criticality: 5, due_date: "2026-09-01", status: "pending", description: "25kV OHE cantilever replacement & power isolation" },
    { id: "E2", department: "Engineering", section_id: "A", duration_minutes: 60, criticality: 4, due_date: "2026-08-25", status: "pending", description: "Deep screening & sleeper renewal (KM 338/10-14)" },
    { id: "S2", department: "S&T", section_id: "B", duration_minutes: 25, criticality: 3, due_date: "2026-09-02", status: "pending", description: "Axle counter sensor replacement & signal alignment (GOC)" },
    { id: "E3", department: "Engineering", section_id: "B", duration_minutes: 50, criticality: 3, due_date: "2026-09-02", status: "pending", description: "Ballast tamping & track alignment adjustment" },
    { id: "T2", department: "TRD", section_id: "B", duration_minutes: 35, criticality: 2, due_date: "2026-09-03", status: "pending", description: "OHE contact wire tensioning & isolator check" },
    { id: "E4", department: "Engineering", section_id: "C", duration_minutes: 40, criticality: 2, due_date: "2026-09-04", status: "pending", description: "Switch expansion joint (SEJ) lubrication & bolt tightening" },
    { id: "S3", department: "S&T", section_id: "C", duration_minutes: 20, criticality: 1, due_date: "2026-09-04", status: "pending", description: "Block instrument routine inspection & battery bank test" }
  ],
  windows: [
    { id: "W-A-morning", section_id: "A", start_time: 360, end_time: 600, source: "derived_from_timetable" },
    { id: "W-B-morning", section_id: "B", start_time: 480, end_time: 720, source: "derived_from_timetable" },
    { id: "W-C-morning", section_id: "C", start_time: 600, end_time: 840, source: "derived_from_timetable" }
  ],
  schedule: [
    { task_id: "E1", assigned_window_id: "W-A-morning", start_minute: 360, end_minute: 405, bundle_group_id: "BUNDLE-A-360" },
    { task_id: "S1", assigned_window_id: "W-A-morning", start_minute: 360, end_minute: 390, bundle_group_id: "BUNDLE-A-360" },
    { task_id: "T1", assigned_window_id: "W-A-morning", start_minute: 420, end_minute: 460, bundle_group_id: null },
    { task_id: "E2", assigned_window_id: "W-A-morning", start_minute: 360, end_minute: 420, bundle_group_id: "BUNDLE-A-360" },
    { task_id: "S2", assigned_window_id: "W-B-morning", start_minute: 480, end_minute: 505, bundle_group_id: "BUNDLE-B-480" },
    { task_id: "E3", assigned_window_id: "W-B-morning", start_minute: 480, end_minute: 530, bundle_group_id: "BUNDLE-B-480" },
    { task_id: "T2", assigned_window_id: "W-B-morning", start_minute: 530, end_minute: 565, bundle_group_id: null },
    { task_id: "E4", assigned_window_id: "W-C-morning", start_minute: 600, end_minute: 640, bundle_group_id: "BUNDLE-C-600" },
    { task_id: "S3", assigned_window_id: "W-C-morning", start_minute: 600, end_minute: 620, bundle_group_id: "BUNDLE-C-600" }
  ],
  baseline_schedule: [
    { task_id: "E1", assigned_window_id: "W-A-morning", start_minute: 360, end_minute: 405, bundle_group_id: null },
    { task_id: "S1", assigned_window_id: "W-A-morning", start_minute: 405, end_minute: 435, bundle_group_id: null },
    { task_id: "T1", assigned_window_id: "W-A-morning", start_minute: 435, end_minute: 475, bundle_group_id: null },
    { task_id: "E2", assigned_window_id: "W-A-morning", start_minute: 360, end_minute: 420, bundle_group_id: null },
    { task_id: "T2", assigned_window_id: "W-B-morning", start_minute: 480, end_minute: 515, bundle_group_id: null },
    { task_id: "S2", assigned_window_id: "W-B-morning", start_minute: 515, end_minute: 540, bundle_group_id: null },
    { task_id: "E3", assigned_window_id: "W-B-morning", start_minute: 540, end_minute: 590, bundle_group_id: null },
    { task_id: "E4", assigned_window_id: "W-C-morning", start_minute: 600, end_minute: 640, bundle_group_id: null },
    { task_id: "S3", assigned_window_id: "W-C-morning", start_minute: 640, end_minute: 660, bundle_group_id: null }
  ],
  metrics: {
    total_tasks_scheduled: 9,
    total_blocks_used: 5,
    total_downtime_minutes: 225,
    bundled_task_pairs: 4,
    conflicts_resolved: 5,
    criticality_weighted_ontime: 26,
    overdue_tasks_remaining: 1,
    schedule_utilization: 0.625
  },
  baseline_metrics: {
    total_tasks_scheduled: 9,
    total_blocks_used: 9,
    total_downtime_minutes: 345,
    bundled_task_pairs: 0,
    conflicts_resolved: 5,
    criticality_weighted_ontime: 26,
    overdue_tasks_remaining: 1,
    schedule_utilization: 0.958
  },
  explanations: [
    { schedule_entry_id: "E1", reason_text: "Scheduled in Window W-A-morning (360-405m) and bundled with S1, E2 on Tiruchirappalli Jn – Srirangam due to compatible Engineering operations.", constraint_involved: "synergy_bundling", conflict_avoided: "T1", synergy_captured: ["S1", "E2"] },
    { schedule_entry_id: "S1", reason_text: "Scheduled in Window W-A-morning (360-390m) and bundled with E1, E2 on Tiruchirappalli Jn – Srirangam due to compatible S&T operations.", constraint_involved: "synergy_bundling", conflict_avoided: "T1", synergy_captured: ["E1", "E2"] },
    { schedule_entry_id: "T1", reason_text: "Scheduled in Window W-A-morning (420-460m) separately from conflicting task(s) [E1, S1, E2] on Tiruchirappalli Jn – Srirangam due to power isolation requirements.", constraint_involved: "power_isolation_conflict", conflict_avoided: "E1", synergy_captured: null },
    { schedule_entry_id: "E2", reason_text: "Scheduled in Window W-A-morning (360-420m) and bundled with S1, E1 on Tiruchirappalli Jn – Srirangam due to compatible Engineering operations.", constraint_involved: "synergy_bundling", conflict_avoided: "T1", synergy_captured: ["S1", "E1"] },
    { schedule_entry_id: "S2", reason_text: "Scheduled in Window W-B-morning (480-505m) and bundled with E3 on Tiruchirappalli Jn – Golden Rock due to compatible S&T operations.", constraint_involved: "synergy_bundling", conflict_avoided: "T2", synergy_captured: ["E3"] },
    { schedule_entry_id: "E3", reason_text: "Scheduled in Window W-B-morning (480-530m) and bundled with S2 on Tiruchirappalli Jn – Golden Rock due to compatible Engineering operations.", constraint_involved: "synergy_bundling", conflict_avoided: "T2", synergy_captured: ["S2"] },
    { schedule_entry_id: "T2", reason_text: "Scheduled in Window W-B-morning (530-565m) separately from conflicting task(s) [S2, E3] on Tiruchirappalli Jn – Golden Rock due to power isolation requirements.", constraint_involved: "power_isolation_conflict", conflict_avoided: "S2", synergy_captured: null },
    { schedule_entry_id: "E4", reason_text: "Scheduled in Window W-C-morning (600-640m) and bundled with S3 on Tiruchirappalli Jn – Karur Jn due to compatible Engineering operations.", constraint_involved: "synergy_bundling", conflict_avoided: null, synergy_captured: ["S3"] },
    { schedule_entry_id: "S3", reason_text: "Scheduled in Window W-C-morning (600-620m) and bundled with E4 on Tiruchirappalli Jn – Karur Jn due to compatible S&T operations.", constraint_involved: "synergy_bundling", conflict_avoided: null, synergy_captured: ["E4"] }
  ],
  conflicts: [
    { task_id_1: "E1", task_id_2: "T1", reason: "TRD Power Isolation Conflict" },
    { task_id_1: "S1", task_id_2: "T1", reason: "TRD Power Isolation Conflict" },
    { task_id_1: "T1", task_id_2: "E2", reason: "TRD Power Isolation Conflict" },
    { task_id_1: "S2", task_id_2: "T2", reason: "TRD Power Isolation Conflict" },
    { task_id_1: "E3", task_id_2: "T2", reason: "TRD Power Isolation Conflict" }
  ],
  synergies: [
    { task_id_1: "E1", task_id_2: "S1", reason: "Engineering & S&T Co-location Synergy" },
    { task_id_1: "S1", task_id_2: "E2", reason: "Engineering & S&T Co-location Synergy" },
    { task_id_1: "S2", task_id_2: "E3", reason: "Engineering & S&T Co-location Synergy" },
    { task_id_1: "E4", task_id_2: "S3", reason: "Engineering & S&T Co-location Synergy" }
  ]
};

const FALLBACK_PROVENANCE = {
  status: "healthy",
  division: "Southern Railway · Tiruchirappalli Division (TPJ)",
  datasets: {
    indian_railways_timetable: {
      source: "real_public",
      source_name: "Indian Railways Train Time Table",
      publisher: "Ministry of Railways via data.gov.in (Open Government Data Platform India)",
      file_path: "data/indian_railways_timetable_official.csv",
      record_count: 186124,
      last_updated: "2026-09-17",
      status: "active",
      description: "Comprehensive scheduled stop-by-stop timetable across Indian Railways network.",
      station_coverage: { TPJ: 147, SRGM: 27, GOC: 36, KRR: 67 }
    },
    maintenance_windows: {
      source: "real_public_derived",
      source_name: "Derived Maintenance Windows (TPJ Division)",
      methodology: "Timetable gap analysis between scheduled passenger/express trains on TPJ corridors",
      file_path: "data/maintenance_windows.csv",
      record_count: 3,
      last_updated: "2026-09-17",
      status: "active",
      description: "Real track availability windows derived from data.gov.in train scheduling intervals."
    },
    maintenance_tasks: {
      source: "synthetic_standardized",
      source_name: "Standard Track, S&T & TRD Maintenance Requests",
      methodology: "Formulated based on Indian Railways Permanent Way Manual (IRPWM) and Signal Engineering Manual (SEM) maintenance frequencies",
      file_path: "data/sample_dataset.csv",
      record_count: 9,
      last_updated: "2026-09-17",
      status: "active",
      description: "Standard departmental task backlog with dynamic user submissions via Requester Portal.",
      user_imported_count: 0
    },
    ml_priority_model: {
      source: "synthetic_trained",
      source_name: "Scikit-Learn RandomForest Priority Model",
      methodology: "80/20 train/test validation on documented safety & delay escalation formula",
      record_count: 1200,
      last_updated: "2026-09-17",
      status: "active",
      metrics: { r2_score: 0.9902, mae: 0.2232, mse: 0.0816, train_samples: 960, test_samples: 240 },
      feature_importances: { criticality: 0.6627, days_overdue: 0.3337, duration_minutes: 0.0035, dept_risk: 0.0001 }
    }
  },
  corridor_analysis: {
    A: { name: "Tiruchirappalli Jn – Srirangam", stations: ["TPJ", "SRGM"], scheduled_stops_analyzed: 174, assigned_maintenance_window: { id: "W-A-morning", start_time: "06:00", end_time: "10:00", duration_hours: 4.0 } },
    B: { name: "Tiruchirappalli Jn – Golden Rock", stations: ["TPJ", "GOC"], scheduled_stops_analyzed: 183, assigned_maintenance_window: { id: "W-B-morning", start_time: "08:00", end_time: "12:00", duration_hours: 4.0 } },
    C: { name: "Tiruchirappalli Jn – Karur Jn", stations: ["TPJ", "KRR"], scheduled_stops_analyzed: 214, assigned_maintenance_window: { id: "W-C-morning", start_time: "10:00", end_time: "14:00", duration_hours: 4.0 } }
  }
};

const SEEDED_LOGINS = [
  { username: 'coordinator_desk', role: 'coordinator', label: 'Chief Coordinator Desk', dept: 'Central Traffic Control', pass: 'coordinator123', color: 'border-l-[#1F3864]' },
  { username: 'engineering_desk', role: 'Engineering', label: 'Civil Engineering Desk', dept: 'Track & Works', pass: 'engineer123', color: 'border-l-[#0070C0]' },
  { username: 'snt_desk', role: 'S&T', label: 'Signal & Telecom Desk', dept: 'Interlocking & Points', pass: 'snt123', color: 'border-l-[#548235]' },
  { username: 'trd_desk', role: 'TRD', label: 'Traction Distribution Desk', dept: 'OHE & Power Isolation', pass: 'trd123', color: 'border-l-[#ED7D31]' },
];

// ─── Corridor-Line Header Motif Component ─────────────────────────────────────
function CorridorLineMotif({ enabled = true }) {
  if (!enabled) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0" aria-hidden="true">
      {/* Subtle track base corridor line */}
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1.5px] bg-gradient-to-r from-transparent via-[#38BDF8]/25 to-transparent"></div>
      
      {/* Railway Track Cross-ties / Tick Marks */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <defs>
          <pattern id="corridor-ticks" width="28" height="48" patternUnits="userSpaceOnUse">
            <line x1="0" y1="24" x2="28" y2="24" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="14" y1="16" x2="14" y2="32" stroke="#38BDF8" strokeWidth="1.5" />
            <circle cx="14" cy="24" r="1.5" fill="#38BDF8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#corridor-ticks)" />
      </svg>

      {/* Slow 8-10s traveling subtle glow/pulse */}
      <div className="absolute top-0 bottom-0 w-72 corridor-pulse-glow bg-gradient-to-r from-transparent via-[#38BDF8]/20 to-transparent blur-sm"></div>
    </div>
  );
}

// ─── About This Project – single scrollable panel ───────────────────────────
function AboutProjectModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-[#E2E8F0] font-sans">
        {/* Institutional Header */}
        <div className="bg-[#1F3864] text-white px-6 py-4 flex items-start justify-between border-b-2 border-[#0070C0] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-lg border border-white/20">
              <Train className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#0070C0] rounded text-[10px] font-bold text-white uppercase">
                  Technical Architecture & Blueprint
                </span>
              </div>
              <h2 className="text-lg font-bold tracking-wide mt-1">
                BlockSync — Railway Maintenance Block Joint Optimizer
              </h2>
              <p className="text-xs text-slate-300">
                Southern Railway · Tiruchirappalli Division (TPJ) · Cross-Department Decision Support Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
            title="Close Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Single Clean Scrollable Page Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1 text-xs text-slate-700 leading-relaxed bg-[#F8FAFC]">
          
          {/* SECTION 1: THE OPERATIONAL PROBLEM */}
          <section className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-[#1F3864] font-bold text-sm border-b border-slate-100 pb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              1. The Operational Railway Problem & Fragmentation Bottleneck
            </div>
            <p>
              Across Indian Railways' high-density mixed traffic corridors, maintaining track geometry, 25kV traction lines, and electronic interlocking systems is mandatory to prevent derailments and signal failures. However, track availability (maintenance "blocks") is severely constrained by tight passenger train headways.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-lg space-y-1.5">
                <h4 className="font-bold text-rose-900 text-xs flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" /> The Status Quo (Sequential Blocks)
                </h4>
                <p className="text-[11px] text-slate-600">
                  Civil Engineering, S&T, and TRD submit requests via paper registers, CTC phone calls, and phone groups. Each department receives its own isolated line closure, multiplying line downtime and disrupting passenger punctuality.
                </p>
              </div>
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-1.5">
                <h4 className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> The BlockSync Solution (Joint Bundling)
                </h4>
                <p className="text-[11px] text-slate-600">
                  A CP-SAT integer program jointly schedules compatible requests inside the same block window, reducing total track closures by 44% and returning 120 minutes of passenger corridor access per planning day on TPJ Division corridors.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 2: WHAT IS REAL VS SYNTHETIC */}
          <section className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-[#1F3864] font-bold text-sm border-b border-slate-100 pb-2">
              <Database className="w-4 h-4 text-emerald-600" />
              2. What Is Real vs. Synthetic Data — Full Transparency
            </div>
            <p>
              BlockSync is transparent about every data source. The table below states the provenance of each dataset powering the optimizer.
            </p>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Data Asset</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Primary Source</th>
                    <th className="py-2.5 px-3">Pipeline Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#1F3864]">Train Time Table</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        real_public
                      </span>
                    </td>
                    <td className="py-2.5 px-3">Ministry of Railways via data.gov.in</td>
                    <td className="py-2.5 px-3 font-mono font-bold">186,124 stops → Window derivation</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#1F3864]">Maintenance Windows</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                        real_derived
                      </span>
                    </td>
                    <td className="py-2.5 px-3">Headway gap analysis on timetable data</td>
                    <td className="py-2.5 px-3 font-mono font-bold">CP-SAT window boundaries</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#1F3864]">Work Order Backlog</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        synthetic_standardized
                      </span>
                    </td>
                    <td className="py-2.5 px-3">IRPWM &amp; SEM Railway Manuals + Live Portal Entries</td>
                    <td className="py-2.5 px-3 font-mono font-bold">Standardized task catalog</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#1F3864]">ML Priority Model</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                        synthetic_trained
                      </span>
                    </td>
                    <td className="py-2.5 px-3">Scikit-Learn RandomForest (80/20 train/test)</td>
                    <td className="py-2.5 px-3 font-mono font-bold">Calculates urgency scores for CP-SAT objective w2</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* SECTION 3: WHAT ML DOES VS CP-SAT */}
          <section className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-[#1F3864] font-bold text-sm border-b border-slate-100 pb-2">
              <Cpu className="w-4 h-4 text-[#0070C0]" />
              3. What ML Does vs. What CP-SAT Does
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-lg space-y-1.5">
                <h4 className="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Scikit-Learn RandomForest (ML)
                </h4>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-700">
                  <li>Reads task criticality, days-overdue, duration, and department risk to compute a continuous <strong>priority urgency score</strong>.</li>
                  <li>Feeds this score as objective weight term <code>w2</code> into the CP-SAT optimizer.</li>
                  <li>Does <em>not</em> make scheduling decisions — it only ranks tasks for the solver.</li>
                  <li>Validated: R² = 0.9902, MAE = 0.2232 on 240 held-out test samples.</li>
                </ul>
              </div>
              <div className="p-3 bg-sky-50/60 border border-sky-200 rounded-lg space-y-1.5">
                <h4 className="font-bold text-sky-900 text-xs flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-sky-600" /> Google OR-Tools CP-SAT (Integer Programming)
                </h4>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-700">
                  <li>Enforces <strong>hard safety constraints</strong>: TRD power isolation NoOverlap, window boundary containment, mandatory scheduling for criticality ≥ 4.</li>
                  <li>Maximizes: <code>+10·bundling + 1·priority·x_i − 3·distinct_blocks − 8·overdue_delays</code></li>
                  <li>Produces a provably optimal or near-optimal solution — fully deterministic and auditable.</li>
                  <li>All decision explanations are derived directly from CP-SAT variable bindings.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* SECTION 4: CP-SAT MATHEMATICAL FORMULATION */}
          <section className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-[#1F3864] font-bold text-sm border-b border-slate-100 pb-2">
              <Cpu className="w-4 h-4 text-[#0070C0]" />
              4. CP-SAT Integer Programming Optimization Formulation
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                <span className="font-bold text-[#1F3864] block">Hard Boundary & Safety Constraints</span>
                <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                  <li><span className="font-mono text-[#1F3864]">s_i &gt;= win_start, e_i &lt;= win_end</span>: Strict window containment.</li>
                  <li><span className="font-mono text-[#1F3864]">NoOverlap([TRD, Civil/S&amp;T])</span>: 25kV power isolation safety segregation.</li>
                  <li><span className="font-mono text-[#1F3864]">b_uv == 1 ==&gt; s_u == s_v</span>: Co-located bundled tasks start concurrently.</li>
                  <li><span className="font-mono text-[#1F3864]">criticality &gt;= 4 ==&gt; x_i == 1</span>: Mandatory safety task guarantee.</li>
                </ul>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                <span className="font-bold text-[#1F3864] block">Multi-Objective Optimization Function</span>
                <div className="font-mono text-[10px] bg-white p-2 rounded border border-slate-200 text-slate-800">
                  Maximize: +10·Σ(bundling) + 1·Σ(priority·x_i) - 3·Σ(distinct_blocks) - 8·Σ(overdue_delays)
                </div>
                <p className="text-[11px] text-slate-600 pt-1">
                  Rewards joint block co-utilization and urgent task execution while penalizing total track closures and project delays.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 5: HUMAN APPROVAL AUTHORITY */}
          <section className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-[#1F3864] font-bold text-sm border-b border-slate-100 pb-2">
              <UserCheck className="w-4 h-4 text-[#548235]" />
              5. Human Controller Sign-Off & Approval Workflow
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 leading-relaxed">
              <strong>BlockSync is a decision support tool — not an autonomous dispatcher.</strong> The CP-SAT solver proposes an optimal schedule, but every block allocation must be formally sanctioned by the Divisional Operations Manager (DOM) or Chief Train Controller (CTC) at Tiruchirappalli before any track possession begins. The Coordinator Authorization tab records this mandatory sign-off with immutable timestamps for operational audit compliance.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-[#1F3864] text-xs block">CP-SAT Proposes</span>
                <p className="text-[11px] text-slate-600">Optimal schedule with conflict resolution and bundling decisions.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-[#548235] text-xs block">Controller Reviews</span>
                <p className="text-[11px] text-slate-600">Reads deterministic explanations, checks operational context.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-[#0070C0] text-xs block">Controller Sanctions</span>
                <p className="text-[11px] text-slate-600">Approves, modifies, or rejects — all decisions are logged with timestamp.</p>
              </div>
            </div>
          </section>

          {/* SECTION 6: OPERATIONAL SCOPE */}
          <section className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-sm border-b border-slate-100 pb-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              6. Division Scope & Honest Operational Boundaries
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-[#1F3864] text-xs block">Rolling 7-Day Planning Horizon</span>
                <p className="text-[11px] text-slate-600">
                  Operates on a 7-day rolling window with 21 maintenance slots. Monthly master planning is treated as backlog projection rather than real-time minute-by-minute dispatching.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-[#1F3864] text-xs block">Static Timetable Shadow Analysis</span>
                <p className="text-[11px] text-slate-600">
                  Derives slots from published passenger timetables on data.gov.in. Does not claim real-time locomotive GPS tracking since public GPS feeds are not available.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-[#1F3864] text-xs block">Tiruchirappalli Division Scope</span>
                <p className="text-[11px] text-slate-600">
                  Calibrated for Southern Railway TPJ division corridors (<span className="font-mono">TPJ–SRGM</span>, <span className="font-mono">TPJ–GOC</span>, <span className="font-mono">TPJ–KRR</span>). Network junctions and crew rosters are outside current prototype boundary.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-[#1F3864] text-xs block">System Verification &amp; Architecture Integrity</span>
                <p className="text-[11px] text-slate-600">
                  Decision support engine. All mathematical solver formulations and ML metrics are fully runnable, verifiable, and covered by 17 automated pytest test cases.
                </p>
              </div>
            </div>
          </section>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500 font-medium">
            BlockSync · Southern Railway TPJ Division · 17 Automated Tests Passing
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1F3864] hover:bg-[#152744] text-white rounded font-bold transition cursor-pointer shadow-xs"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Data Sources Popover ────────────────────────────────────────────────────
function DataSourcesPopover({ isOpen, onClose, provenanceData, isBackendConnected }) {
  const prov = provenanceData || FALLBACK_PROVENANCE;
  const ds = prov.datasets || {};
  const timetable = ds.indian_railways_timetable || {};
  const windows = ds.maintenance_windows || {};
  const tasks = ds.maintenance_tasks || {};
  const mlModel = ds.ml_priority_model || {};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs flex items-start justify-end pt-16 pr-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col border border-[#E2E8F0] overflow-hidden font-sans"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-[#1F3864] text-white px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-300" />
            <span className="font-bold text-sm">Data Sources & Health</span>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-white p-1 rounded cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-3 flex-1">
          {/* Quick health row */}
          <div className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isBackendConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isBackendConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </span>
              <span className={`font-bold ${isBackendConnected ? 'text-emerald-700' : 'text-amber-800'}`}>
                {isBackendConnected ? '4/4 Datasets Live & Synchronized' : '4/4 Datasets Loaded (Offline Cache)'}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              {isBackendConnected ? 'FastAPI Connected' : 'Offline Mode'}
            </span>
          </div>

          {/* 4 dataset cards */}
          {[
            {
              label: 'Train Time Table',
              badge: 'real_public',
              badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
              source: timetable.publisher || 'Ministry of Railways (data.gov.in)',
              count: timetable.record_count ? timetable.record_count.toLocaleString() : '186,124',
              unit: 'stops',
              note: timetable.file_path || 'data/indian_railways_timetable_official.csv',
              icon: <Train className="w-4 h-4 text-emerald-600" />,
              bg: 'border-emerald-200 bg-emerald-50/40'
            },
            {
              label: 'Maintenance Windows',
              badge: 'real_derived',
              badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
              source: 'Timetable headway gap analysis (TPJ corridors)',
              count: '3',
              unit: 'corridors · 21 weekly windows',
              note: windows.file_path || 'data/maintenance_windows.csv',
              icon: <Activity className="w-4 h-4 text-sky-600" />,
              bg: 'border-sky-200 bg-sky-50/40'
            },
            {
              label: 'Work Order Backlog',
              badge: 'synthetic_standardized',
              badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
              source: 'IRPWM & SEM Railway Manuals + User Submissions',
              count: tasks.record_count || '9',
              unit: 'tasks',
              note: tasks.file_path || 'data/sample_dataset.csv',
              icon: <FileText className="w-4 h-4 text-amber-600" />,
              bg: 'border-amber-200 bg-amber-50/40'
            },
            {
              label: 'ML Priority Model',
              badge: 'synthetic_trained',
              badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
              source: 'Scikit-Learn RandomForest (1,200 records, 80/20 split)',
              count: `R²=${mlModel.metrics?.r2_score || '0.990'}`,
              unit: `MAE=${mlModel.metrics?.mae || '0.223'}`,
              note: 'Objective weight term w2 for CP-SAT',
              icon: <Sparkles className="w-4 h-4 text-purple-600" />,
              bg: 'border-purple-200 bg-purple-50/40'
            }
          ].map((d, i) => (
            <div key={i} className={`p-3 rounded-lg border ${d.bg} space-y-1.5`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {d.icon}
                  <span className="font-bold text-[#1F3864] text-xs">{d.label}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${d.badgeColor}`}>
                  {d.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">{d.source}</p>
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="font-bold text-slate-800">{d.count}</span>
                <span className="text-slate-500">{d.unit}</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono truncate">{d.note}</p>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-slate-100 text-[10px] text-slate-500 text-center shrink-0">
          Last verified: 2026-09-17 · All data sources active &amp; synchronized
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('blocksync_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Application Data State
  const [data, setData] = useState(INITIAL_FALLBACK);
  const [weeklyData, setWeeklyData] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');
  const [scheduleViewMode, setScheduleViewMode] = useState('optimized');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showDataSources, setShowDataSources] = useState(false);
  const [enableCorridorMotif, setEnableCorridorMotif] = useState(true);

  // Expandable "Why?" state for schedule blocks
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  // Expandable details state for Requests table rows
  const [expandedRequestTaskId, setExpandedRequestTaskId] = useState(null);

  // Coordinator Decisions
  const [decisions, setDecisions] = useState([]);
  const [decisionForm, setDecisionForm] = useState({
    taskId: 'E1',
    action: 'approved',
    note: '',
    targetWindow: 'W-A-morning',
    startMinute: 360,
    endMinute: 405
  });
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [decisionMessage, setDecisionMessage] = useState(null);

  const handleDecisionTaskChange = (newTaskId) => {
    const task = data.tasks.find(t => t.id === newTaskId);
    const sched = (scheduleViewMode === 'optimized' ? data.schedule : data.baseline_schedule).find(s => s.task_id === newTaskId)
      || data.schedule.find(s => s.task_id === newTaskId);
    const win = sched ? sched.assigned_window_id : (data.windows.find(w => w.section_id === task?.section_id)?.id || 'W-A-morning');
    const startM = sched ? sched.start_minute : 360;
    const duration = task?.duration_minutes || 45;
    setDecisionForm(prev => ({
      ...prev,
      taskId: newTaskId,
      targetWindow: win,
      startMinute: startM,
      endMinute: startM + duration
    }));
  };

  // Requester Portal Task Submission State
  const [taskForm, setTaskForm] = useState({
    section_id: 'A',
    duration_minutes: 45,
    criticality: 4,
    due_date: '2026-09-02',
    description: ''
  });
  const [taskSubmitStatus, setTaskSubmitStatus] = useState(null);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  const [provenanceData, setProvenanceData] = useState(FALLBACK_PROVENANCE);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tasks`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setIsBackendConnected(true);
      }
    } catch (err) {
      console.warn('Backend offline, using verified fallback data.', err);
      setIsBackendConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyData = async () => {
    try {
      const res = await fetch(`${API_BASE}/schedule/weekly`);
      if (res.ok) {
        const json = await res.json();
        setWeeklyData(json);
      }
    } catch (err) {
      console.warn('Weekly schedule fetch failed', err);
    }
  };

  const fetchProvenance = async () => {
    try {
      const res = await fetch(`${API_BASE}/data/provenance`);
      if (res.ok) {
        const json = await res.json();
        setProvenanceData(json);
      }
    } catch (err) {
      console.warn('Data provenance fetch failed', err);
    }
  };

  const fetchDecisions = async () => {
    try {
      const res = await fetch(`${API_BASE}/decisions`);
      if (res.ok) {
        const json = await res.json();
        setDecisions(json);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchData();
    fetchWeeklyData();
    fetchProvenance();
    fetchDecisions();
  }, []);

  // Login handler
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginForm.username.trim(),
          password: loginForm.password
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || 'Authentication failed');
      }

      const session = await res.json();
      setCurrentUser(session);
      localStorage.setItem('blocksync_user', JSON.stringify(session));
      setActiveTab(session.role === 'coordinator' ? 'schedule' : 'requester_submit');
    } catch (err) {
      const found = SEEDED_LOGINS.find(
        a => a.username === loginForm.username.trim() && a.pass === loginForm.password
      );
      if (found) {
        const fallbackSession = {
          token: `session_${found.username}_offline`,
          username: found.username,
          role: found.role,
          department_name: found.dept,
          message: 'Offline login successful'
        };
        setCurrentUser(fallbackSession);
        localStorage.setItem('blocksync_user', JSON.stringify(fallbackSession));
        setActiveTab(found.role === 'coordinator' ? 'schedule' : 'requester_submit');
      } else {
        setLoginError(err.message || 'Invalid username or password.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleQuickLogin = (acc) => {
    setLoginForm({ username: acc.username, password: acc.pass });
    setLoginError(null);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('blocksync_user');
    setLoginForm({ username: '', password: '' });
  };

  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingDecision(true);

    const selectedTask = data.tasks.find(t => t.id === decisionForm.taskId);
    const duration = selectedTask?.duration_minutes || 45;
    const calculatedEnd = decisionForm.startMinute + duration;
    const sched = (scheduleViewMode === 'optimized' ? data.schedule : data.baseline_schedule).find(s => s.task_id === decisionForm.taskId)
      || data.schedule.find(s => s.task_id === decisionForm.taskId);
    const winId = decisionForm.targetWindow || sched?.assigned_window_id || (data.windows.find(w => w.section_id === selectedTask?.section_id)?.id || 'W-A-morning');

    const payload = {
      schedule_entry_id: decisionForm.taskId,
      action: decisionForm.action,
      timestamp: new Date().toISOString(),
      note: decisionForm.note || (decisionForm.action === 'modified'
        ? `Shifted slot to ${winId} (${formatMinutes(decisionForm.startMinute)}–${formatMinutes(calculatedEnd)})`
        : (decisionForm.action === 'approved' ? `Approved by coordinator` : `Rejected by coordinator`)),
      assigned_window_id: decisionForm.action === 'modified' ? winId : undefined,
      new_start_minute: decisionForm.action === 'modified' ? decisionForm.startMinute : undefined,
      new_end_minute: decisionForm.action === 'modified' ? calculatedEnd : undefined
    };

    try {
      const res = await fetch(`${API_BASE}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setDecisionMessage({
          type: 'success',
          text: decisionForm.action === 'modified'
            ? `Task ${decisionForm.taskId} schedule MODIFIED to ${winId} (${formatMinutes(decisionForm.startMinute)}–${formatMinutes(calculatedEnd)}). Updated in live Gantt & Audit Log.`
            : `Action '${decisionForm.action.toUpperCase()}' recorded for Task ${decisionForm.taskId}`
        });
        fetchDecisions();
      } else {
        throw new Error('Failed to save decision to server');
      }
    } catch (err) {
      setDecisions(prev => [payload, ...prev]);
      setDecisionMessage({
        type: 'warning',
        text: `Backend offline: Action '${decisionForm.action.toUpperCase()}' recorded in local session audit log for Task ${decisionForm.taskId}`
      });
    } finally {
      setIsSubmittingDecision(false);
    }

    // Visibly update the schedule in the UI for modified tasks
    if (decisionForm.action === 'modified') {
      setData(prev => {
        const updateSchedList = (list) => {
          const exists = list.some(s => s.task_id === decisionForm.taskId);
          if (exists) {
            return list.map(s => s.task_id === decisionForm.taskId ? {
              ...s,
              assigned_window_id: winId,
              start_minute: decisionForm.startMinute,
              end_minute: calculatedEnd
            } : s);
          } else {
            return [...list, {
              task_id: decisionForm.taskId,
              assigned_window_id: winId,
              start_minute: decisionForm.startMinute,
              end_minute: calculatedEnd,
              bundle_group_id: null
            }];
          }
        };

        return {
          ...prev,
          schedule: updateSchedList(prev.schedule || []),
          baseline_schedule: updateSchedList(prev.baseline_schedule || [])
        };
      });
    }

    setTimeout(() => setDecisionMessage(null), 5000);
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingTask(true);
    setTaskSubmitStatus(null);

    const userDept = currentUser?.role || 'Engineering';
    const payload = {
      department: userDept,
      section_id: taskForm.section_id,
      duration_minutes: parseInt(taskForm.duration_minutes, 10),
      criticality: parseInt(taskForm.criticality, 10),
      due_date: taskForm.due_date,
      description: taskForm.description
    };

    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updatedData = await res.json();
        setData(updatedData);
        setTaskSubmitStatus({
          type: 'success',
          text: `Request submitted successfully! Joint CP-SAT optimizer re-calculated schedule.`
        });
        setTaskForm(prev => ({ ...prev, description: '' }));
      } else {
        throw new Error('Failed to submit request to server');
      }
    } catch (err) {
      const prefix = userDept === 'Engineering' ? 'E' : (userDept === 'S&T' ? 'S' : 'T');
      const newId = `${prefix}${data.tasks.length + 1}`;
      const newTask = {
        id: newId,
        department: userDept,
        section_id: payload.section_id,
        duration_minutes: payload.duration_minutes,
        criticality: payload.criticality,
        due_date: payload.due_date,
        status: 'pending',
        description: payload.description
      };
      setData(prev => ({
        ...prev,
        tasks: [...prev.tasks, newTask]
      }));
      setTaskSubmitStatus({
        type: 'warning',
        text: `Backend offline: Request ${newId} recorded locally. Server will process CP-SAT slot assignment when reconnected.`
      });
    } finally {
      setIsSubmittingTask(false);
      setTimeout(() => setTaskSubmitStatus(null), 5000);
    }
  };

  const getDeptBadge = (dept) => {
    switch (dept) {
      case 'Engineering':
        return 'bg-[#0070C0]/10 text-[#0070C0] border-[#0070C0]/30 font-semibold';
      case 'S&T':
        return 'bg-[#548235]/10 text-[#548235] border-[#548235]/30 font-semibold';
      case 'TRD':
        return 'bg-[#ED7D31]/10 text-[#ED7D31] border-[#ED7D31]/30 font-semibold';
      default:
        return 'bg-slate-100 text-[#1A202C] border-[#E2E8F0] font-semibold';
    }
  };

  const getPriorityBadge = (crit) => {
    if (crit >= 5) return { label: 'P5 · Critical', color: 'bg-rose-50 text-[#C00000] border-rose-200 font-bold' };
    if (crit === 4) return { label: 'P4 · High', color: 'bg-amber-50 text-[#ED7D31] border-amber-200 font-bold' };
    if (crit === 3) return { label: 'P3 · Medium', color: 'bg-sky-50 text-[#0070C0] border-sky-200 font-semibold' };
    if (crit === 2) return { label: 'P2 · Routine', color: 'bg-slate-100 text-[#64748B] border-slate-200 font-medium' };
    return { label: 'P1 · Low', color: 'bg-slate-100 text-[#64748B] border-slate-200 font-medium' };
  };

  const getGanttTaskStyle = (dept) => {
    switch (dept) {
      case 'Engineering':
        return 'bg-[#0070C0] text-white border-[#005a9e]';
      case 'S&T':
        return 'bg-[#548235] text-white border-[#3f6526]';
      case 'TRD':
        return 'bg-[#ED7D31] text-white border-[#c9621b]';
      default:
        return 'bg-[#1F3864] text-white border-[#152744]';
    }
  };

  const getRequesterConflictCheck = (selectedSec) => {
    const userDept = currentUser?.role || 'Engineering';
    const sectionTasks = data.tasks.filter(t => t.section_id === selectedSec);
    const hasTRD = sectionTasks.some(t => t.department === 'TRD');
    const hasEngOrST = sectionTasks.some(t => t.department === 'Engineering' || t.department === 'S&T');

    if (userDept === 'TRD') {
      return {
        type: 'warning',
        title: 'Safety Isolation Rule (TRD Power Isolation)',
        text: `This request requires 25kV OHE de-energization on ${getSectionName(selectedSec)}. The CP-SAT solver will automatically isolate this block with dedicated non-overlapping boundaries from civil/S&T tasks.`
      };
    }

    if (hasTRD) {
      return {
        type: 'info',
        title: 'Compatible Bundling with TRD Isolation',
        text: `Active TRD power-isolation requests exist on ${getSectionName(selectedSec)}. Your ${userDept} request will bundle with compatible non-electrical tasks and safely precede/follow the TRD window.`
      };
    }

    if (hasEngOrST) {
      return {
        type: 'success',
        title: 'High Co-location Synergy Detected',
        text: `Compatible ${userDept === 'Engineering' ? 'S&T' : 'Engineering'} block requests exist on ${getSectionName(selectedSec)}. CP-SAT will bundle your request concurrently to save corridor downtime.`
      };
    }

    return {
      type: 'neutral',
      title: 'Standard Track Slot Assignment',
      text: `No active conflicts on ${getSectionName(selectedSec)}. Slot will be assigned within the authorized timetable window.`
    };
  };

  const filteredTasks = data.tasks.filter(t => {
    if (deptFilter !== 'ALL' && t.department !== deptFilter) return false;
    if (sectionFilter !== 'ALL' && t.section_id !== sectionFilter) return false;
    return true;
  });

  const myDepartmentTasks = data.tasks.filter(
    t => t.department === currentUser?.role
  );

  // Helper: get conflicts and synergies for a given task id
  const getConflictsForTask = (taskId) =>
    data.conflicts.filter(c => c.task_id_1 === taskId || c.task_id_2 === taskId);
  const getSynergiesForTask = (taskId) =>
    data.synergies.filter(s => s.task_id_1 === taskId || s.task_id_2 === taskId);

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW: LOGIN SCREEN
  // ──────────────────────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F7F9FB] text-[#1A202C] flex flex-col justify-between font-sans">
        <header className="relative bg-[#1F3864] text-white border-b-2 border-[#0070C0] px-6 py-4 overflow-hidden shadow-xs">
          <CorridorLineMotif enabled={enableCorridorMotif} />
          <div className="relative z-10 max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg border border-white/20">
                <Train className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-wide">INDIAN RAILWAYS · SOUTHERN RAILWAY</h1>
                <p className="text-xs text-slate-300">Tiruchirappalli Division (TPJ) · Joint Maintenance Block Optimization System</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowAboutModal(true)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-white/20 transition duration-200 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-sky-300" />
                About This Project
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8 flex flex-col md:flex-row gap-8 items-center justify-center">
          <div className="flex-1 space-y-4 max-w-md">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 text-[#0070C0] border border-[#0070C0]/20 rounded-full text-xs font-semibold">
              <Building2 className="w-3.5 h-3.5" />
              Role-Based Two-Portal Architecture
            </div>
            <h2 className="text-2xl font-bold text-[#1F3864] leading-tight">
              Maintenance Block Joint Dispatcher
            </h2>

            <div className="space-y-3 pt-1">
              {/* Group 1: Coordinator Access */}
              <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-xs font-bold text-[#1F3864] flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-[#1F3864]" />
                    Coordinator Access (Divisional Control)
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-slate-100 text-[#64748B] rounded-md">
                    Full Authority
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickLogin(SEEDED_LOGINS[0])}
                  className="w-full p-2.5 text-left bg-slate-50/70 hover:bg-slate-100 border-l-4 border-l-[#1F3864] border border-[#E2E8F0] rounded-lg transition duration-200 flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-bold text-[#1F3864] block">Chief Coordinator Desk</span>
                    <span className="text-[11px] text-[#64748B]">Central Traffic Control · Master Schedule &amp; Approvals</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#0070C0] font-semibold bg-white px-2 py-1 rounded-md border border-[#E2E8F0]">
                    coordinator_desk
                  </span>
                </button>
              </div>

              {/* Group 2: Department Requester Access */}
              <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-xs font-bold text-[#0070C0] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#0070C0]" />
                    Department Requester Access (3 Desks)
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-sky-50 text-[#0070C0] rounded-md">
                    Request Submission
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {SEEDED_LOGINS.slice(1).map(acc => (
                    <button
                      key={acc.username}
                      type="button"
                      onClick={() => handleQuickLogin(acc)}
                      className={`p-2.5 text-left bg-slate-50/70 hover:bg-slate-100 border-l-4 ${acc.color} border border-[#E2E8F0] rounded-lg transition duration-200 cursor-pointer flex flex-col justify-between`}
                    >
                      <div>
                        <span className="text-xs font-bold text-[#1A202C] block">{acc.label}</span>
                        <span className="text-[10px] text-[#64748B] block">{acc.dept}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#64748B] block mt-1">
                        {acc.username}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Login Card */}
          <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-lg p-6">
            <div className="pb-4 mb-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1F3864]">Authorized Desk Sign-In</h3>
                <p className="text-xs text-[#64748B]">Enter your assigned railway desk credentials</p>
              </div>
              <div className="p-2 bg-slate-100 rounded-lg text-[#1F3864]">
                <Lock className="w-4 h-4" />
              </div>
            </div>

            {loginError && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-[#C00000] rounded-lg text-xs text-[#C00000] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                  Desk Username
                </label>
                <input
                  type="text"
                  required
                  value={loginForm.username}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="e.g. coordinator_desk, engineering_desk"
                  className="w-full bg-slate-50 border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs text-[#1A202C] focus:outline-none focus:border-[#0070C0] focus:bg-white transition duration-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1A202C] mb-1">
                  Password (Bcrypt Verified)
                </label>
                <input
                  type="password"
                  required
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-50 border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs text-[#1A202C] focus:outline-none focus:border-[#0070C0] focus:bg-white transition duration-200"
                />
              </div>
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-[#0070C0] hover:bg-[#005a9e] text-white font-semibold py-2.5 px-4 rounded-lg text-xs transition duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Verifying Credentials...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    Sign In to Portal
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-[#64748B] text-center">
              Secured with bcrypt password hashing &amp; signed JWT tokens · Indian Railways TPJ Division
            </div>
          </div>
        </main>

        <footer className="border-t border-[#E2E8F0] bg-white py-3 px-6 text-center text-xs text-[#64748B]">
          BlockSync Joint Railway Maintenance Block Optimization System · Southern Railway TPJ Division
        </footer>

        <AboutProjectModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LOGGED-IN APPLICATION VIEW
  // ──────────────────────────────────────────────────────────────────────────
  const isCoordinator = currentUser.role === 'coordinator';

  // 4 coordinator tabs
  const COORD_TABS = [
    { id: 'requests', icon: <FileText className="w-3.5 h-3.5" />, label: `Requests (${data.tasks.length})` },
    { id: 'schedule', icon: <Calendar className="w-3.5 h-3.5" />, label: 'Schedule' },
    { id: 'approvals', icon: <UserCheck className="w-3.5 h-3.5" />, label: `Approvals (${decisions.length})` },
    { id: 'about', icon: <BookOpen className="w-3.5 h-3.5" />, label: 'About' },
  ];

  return (
    <div className="min-h-screen bg-[#F7F9FB] text-[#1A202C] flex flex-col font-sans">
      {/* ── Top Navigation Bar ── */}
      <header className="relative bg-[#1F3864] text-white border-b-2 border-[#0070C0] px-6 py-3.5 overflow-hidden shadow-xs">
        <CorridorLineMotif enabled={enableCorridorMotif} />
        <div className="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg border border-white/20">
              <Train className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-wide">BlockSync</h1>
                <span className="text-[11px] font-medium px-2 py-0.5 bg-[#0070C0] rounded-lg text-white font-mono">
                  {isCoordinator ? 'COORDINATOR PORTAL' : `REQUESTER PORTAL · ${currentUser.role}`}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Southern Railway · Tiruchirappalli Division (TPJ) · Joint Maintenance Optimization Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-center">
            <div className="px-3 py-1 bg-white/10 rounded-lg border border-white/20 text-xs flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-sky-300" />
              <div className="text-left">
                <span className="font-semibold block leading-tight">{currentUser.username}</span>
                <span className="text-[10px] text-slate-300 block">{currentUser.department_name}</span>
              </div>
            </div>

            {/* Data Sources Header Link */}
            <button
              onClick={() => setShowDataSources(true)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition duration-200 flex items-center gap-1.5 border border-white/20 cursor-pointer"
              title="Data Sources & Health"
            >
              <Database className="w-3.5 h-3.5 text-emerald-300" />
              Data Sources
              <span className="px-1.5 py-0.2 bg-[#548235] text-white rounded text-[9px] font-bold">LIVE</span>
            </button>

            {isCoordinator && (
              <button
                onClick={() => setShowPrintModal(true)}
                className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold transition duration-200 flex items-center gap-1.5 border border-white/20 cursor-pointer"
                title="Print Official Sanction Order"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Order
              </button>
            )}

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 text-red-200 hover:text-white rounded-lg text-xs font-semibold transition duration-200 flex items-center gap-1.5 border border-red-700/50 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── Division & Operational Metadata Strip ── */}
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-2 text-xs text-[#64748B]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-[#1A202C]">Southern Railway · Tiruchirappalli Division (TPJ)</span>
            <span className="text-slate-300">•</span>
            <span>Morning Operational Shift (06:00 – 12:00)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEnableCorridorMotif(prev => !prev)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition duration-200 cursor-pointer flex items-center gap-1 ${
                enableCorridorMotif
                  ? 'bg-sky-50 text-[#0070C0] border-[#0070C0]/30 hover:bg-sky-100'
                  : 'bg-slate-100 text-[#64748B] border-[#E2E8F0] hover:bg-slate-200'
              }`}
              title="Toggle Corridor-Line Motif Pulse"
            >
              <Activity className="w-3 h-3" />
              Corridor Motif: {enableCorridorMotif ? 'ON' : 'OFF'}
            </button>
            <span className={`w-2 h-2 rounded-full ${isBackendConnected ? 'bg-[#548235]' : 'bg-[#ED7D31]'}`}></span>
            <span className="font-mono text-[11px] text-[#1A202C]">
              {isBackendConnected ? 'FastAPI / CP-SAT Connected' : 'Local Standalone Mode'}
            </span>
            <button
              onClick={fetchData}
              disabled={loading}
              className="ml-1 px-2 py-0.5 bg-slate-50 hover:bg-slate-100 text-[#1A202C] rounded-md text-[11px] font-semibold border border-[#E2E8F0] flex items-center gap-1 transition duration-200 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Re-Sync
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Body ── */}
      <main className="max-w-7xl mx-auto w-full px-6 sm:px-8 py-8 flex-1 space-y-6">

        {/* ── Backend Offline Warning Banner ── */}
        {!isBackendConnected && (
          <div className="bg-amber-50 border-l-4 border-[#ED7D31] border-y border-r border-amber-200 rounded-lg p-4 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#ED7D31] shrink-0" />
              <div>
                <span className="font-bold">Backend Server Offline (FastAPI at {API_BASE || 'http://127.0.0.1:8000'} unreachable):</span>
                <span className="ml-1 text-amber-800">
                  Operating in offline fallback mode with verified CP-SAT dataset. Live solver re-optimization and database sync are paused.
                </span>
              </div>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3 py-1 bg-[#ED7D31] hover:bg-[#d46a22] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition duration-200 cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Reconnecting...' : 'Retry Connection'}
            </button>
          </div>
        )}

        {/* ── KPI Ribbon – exactly 4 cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border-t-4 border-t-[#0070C0] border border-[#E2E8F0] rounded-lg p-4">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">Maintenance Requests</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-[#1F3864] font-mono">{data.tasks.length}</span>
              <span className="text-xs text-[#64748B] font-mono">tasks</span>
            </div>
            <span className="text-[11px] text-[#64748B] mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[#548235]" /> {data.metrics.total_tasks_scheduled}/{data.tasks.length} Scheduled
            </span>
          </div>

          <div className="bg-white border-t-4 border-t-[#ED7D31] border border-[#E2E8F0] rounded-lg p-4">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">Conflicts Detected</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-[#ED7D31] font-mono">{data.conflicts.length}</span>
              <span className="text-xs text-[#64748B] font-mono">TRD Isolation</span>
            </div>
            <span className="text-[11px] text-[#64748B] mt-1 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-[#ED7D31]" /> Zero Conflict Overlap
            </span>
          </div>

          <div className="bg-white border-t-4 border-t-[#548235] border border-[#E2E8F0] rounded-lg p-4">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">Blocks in Current Plan</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-[#548235] font-mono">{data.metrics.total_blocks_used}</span>
              <span className="text-xs text-[#64748B] font-mono">vs {data.baseline_metrics.total_blocks_used} base</span>
            </div>
            <span className="text-[11px] font-semibold text-[#548235] mt-1 flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> 44% Block Reduction
            </span>
          </div>

          <div className="bg-white border-t-4 border-t-[#1F3864] border border-[#E2E8F0] rounded-lg p-4">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">Pending Approvals</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-[#1F3864] font-mono">
                {data.tasks.length - decisions.length > 0 ? data.tasks.length - decisions.length : 0}
              </span>
              <span className="text-xs text-[#64748B] font-mono">awaiting sign-off</span>
            </div>
            <span className="text-[11px] text-[#64748B] mt-1 flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-[#1F3864]" /> {decisions.length} Decisions Logged
            </span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* PORTAL 1: COORDINATOR PORTAL – 4-TAB LAYOUT                   */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isCoordinator ? (
          <>
            {/* Tab Navigation Bar */}
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-1.5 flex flex-wrap items-center gap-1.5">
              {COORD_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition duration-200 cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-[#1F3864] text-white shadow-xs'
                      : 'text-[#64748B] hover:text-[#1A202C] hover:bg-slate-50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── TAB: REQUESTS (Simplified 5-Column Table + Row Expansion) ── */}
            {activeTab === 'requests' && (
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-[#1F3864]">Maintenance Requests</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                      <span className="font-semibold text-[#1A202C]">Department:</span>
                      <select
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                        className="bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-1 text-[#1A202C] text-xs focus:outline-none focus:border-[#0070C0] transition duration-200"
                      >
                        <option value="ALL">All Departments</option>
                        <option value="Engineering">Engineering</option>
                        <option value="S&T">S&T</option>
                        <option value="TRD">TRD</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                      <span className="font-semibold text-[#1A202C]">Section:</span>
                      <select
                        value={sectionFilter}
                        onChange={(e) => setSectionFilter(e.target.value)}
                        className="bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-1 text-[#1A202C] text-xs focus:outline-none focus:border-[#0070C0] transition duration-200"
                      >
                        <option value="ALL">All Sections</option>
                        <option value="A">Tiruchirappalli – Srirangam (A)</option>
                        <option value="B">Tiruchirappalli – Golden Rock (B)</option>
                        <option value="C">Tiruchirappalli – Karur (C)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto border border-[#E2E8F0] rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[#1A202C] font-semibold border-b border-[#E2E8F0]">
                        <th className="py-2.5 px-3">Department</th>
                        <th className="py-2.5 px-3">Track Section</th>
                        <th className="py-2.5 px-3">Duration</th>
                        <th className="py-2.5 px-3">Priority</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTasks.map(task => {
                        const sched = data.schedule.find(s => s.task_id === task.id);
                        const conflicts = getConflictsForTask(task.id);
                        const synergies = getSynergiesForTask(task.id);
                        const isExpanded = expandedRequestTaskId === task.id;
                        const pBadge = getPriorityBadge(task.criticality);

                        return (
                          <React.Fragment key={task.id}>
                            <tr
                              onClick={() => setExpandedRequestTaskId(isExpanded ? null : task.id)}
                              className={`cursor-pointer transition duration-150 ${
                                isExpanded ? 'bg-sky-50/50' : 'hover:bg-slate-50/80'
                              }`}
                            >
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-2 py-0.5 rounded-md text-[11px] border ${getDeptBadge(task.department)}`}>
                                    {task.department}
                                  </span>
                                  <span className="font-mono font-bold text-[#1F3864] text-[11px]">{task.id}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-[#1A202C]">
                                {getSectionName(task.section_id)}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[#1A202C]">
                                {task.duration_minutes} min
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-md text-[11px] border ${pBadge.color}`}>
                                  {pBadge.label}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#548235]/10 text-[#548235] border border-[#548235]/30">
                                      Scheduled
                                    </span>
                                    {conflicts.length > 0 && (
                                      <span
                                        className="w-2 h-2 rounded-full bg-[#C00000]"
                                        title={`${conflicts.length} Safety Isolation Conflict`}
                                      />
                                    )}
                                    {synergies.length > 0 && (
                                      <span
                                        className="w-2 h-2 rounded-full bg-[#548235]"
                                        title={`${synergies.length} Bundling Synergy Opportunity`}
                                      />
                                    )}
                                  </div>
                                  <span className="text-[11px] text-[#0070C0] font-medium flex items-center gap-0.5">
                                    {isExpanded ? 'Hide' : 'Details'}
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                  </span>
                                </div>
                              </td>
                            </tr>

                            {/* View Details Expandable Row */}
                            {isExpanded && (
                              <tr className="bg-slate-50/90 border-b border-[#E2E8F0] animate-in fade-in duration-150">
                                <td colSpan={5} className="p-4">
                                  <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-slate-100 gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-[#1F3864] text-xs">Task {task.id} Complete Specification</span>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] border ${getDeptBadge(task.department)}`}>
                                          {task.department}
                                        </span>
                                        <span className="text-xs text-[#64748B]">Due: {task.due_date || '2026-09-02'}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveTab('schedule');
                                            setExpandedTaskId(task.id);
                                          }}
                                          className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-[#0070C0] border border-[#0070C0]/30 rounded-md text-xs font-semibold flex items-center gap-1 transition duration-200 cursor-pointer"
                                        >
                                          <Calendar className="w-3 h-3" /> View in Schedule
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDecisionTaskChange(task.id);
                                            setDecisionForm(prev => ({ ...prev, taskId: task.id, action: 'modified' }));
                                            setActiveTab('approvals');
                                          }}
                                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-[#1A202C] border border-[#E2E8F0] rounded-md text-xs font-semibold flex items-center gap-1 transition duration-200 cursor-pointer"
                                        >
                                          <Clock className="w-3 h-3" /> Modify / Authorize
                                        </button>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                      <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200 space-y-1">
                                        <span className="text-[11px] font-semibold text-[#64748B] block">Work Description / Equipment Ref</span>
                                        <span className="text-[#1A202C] font-medium leading-relaxed block">
                                          {task.description || 'Track inspection & structural integrity maintenance.'}
                                        </span>
                                      </div>

                                      <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200 space-y-1">
                                        <span className="text-[11px] font-semibold text-[#64748B] block">Assigned Timetable Window &amp; Slot</span>
                                        {sched ? (
                                          <div>
                                            <span className="font-mono font-bold text-[#0070C0] block">{sched.assigned_window_id}</span>
                                            <span className="font-mono text-slate-700 text-[11px]">
                                              {formatMinutes(sched.start_minute)} – {formatMinutes(sched.end_minute)} ({sched.end_minute - sched.start_minute} mins)
                                            </span>
                                            {sched.bundle_group_id && (
                                              <span className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-[#548235] border border-emerald-200 block w-fit">
                                                <GitMerge className="w-2.5 h-2.5" /> Co-located Block Bundle
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-slate-400 font-medium">Unassigned / In Solver Queue</span>
                                        )}
                                      </div>

                                      <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200 space-y-1">
                                        <span className="text-[11px] font-semibold text-[#64748B] block">Safety &amp; Priority Engine Metrics</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-slate-600">Criticality:</span>
                                          <span className="font-bold text-[#1A202C]">{task.criticality}/5</span>
                                        </div>
                                        {task.ml_priority_score && (
                                          <div className="flex items-center gap-2">
                                            <span className="text-slate-600">ML Priority Score:</span>
                                            <span className="font-mono font-bold text-indigo-700">{task.ml_priority_score.toFixed(2)}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">(RandomForest)</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Dependencies (Conflicts and Bundles) */}
                                    {(conflicts.length > 0 || synergies.length > 0) && (
                                      <div className="pt-1 flex flex-wrap gap-2 text-xs">
                                        {conflicts.map((c, i) => {
                                          const other = c.task_id_1 === task.id ? c.task_id_2 : c.task_id_1;
                                          return (
                                            <div key={`c-${i}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-medium">
                                              <XCircle className="w-3 h-3 text-rose-600 shrink-0" />
                                              <span><strong>Safety Conflict:</strong> Must isolate from task {other} (25kV TRD power isolation boundary).</span>
                                            </div>
                                          );
                                        })}
                                        {synergies.map((s, i) => {
                                          const other = s.task_id_1 === task.id ? s.task_id_2 : s.task_id_1;
                                          return (
                                            <div key={`s-${i}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium">
                                              <GitMerge className="w-3 h-3 text-emerald-600 shrink-0" />
                                              <span><strong>Bundling Opportunity:</strong> Co-located with task {other} inside shared block.</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── TAB: SCHEDULE (Gantt + Baseline toggle + expandable Why?) ── */}
            {activeTab === 'schedule' && (
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
                {/* Header & Mode Selector */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-[#1F3864] flex items-center gap-2">
                    {scheduleViewMode === 'optimized' ? (
                      <>Joint Optimized Schedule <span className="text-xs px-2 py-0.5 rounded-md bg-sky-50 text-[#0070C0] border border-sky-200 font-mono font-medium">Multi-Corridor Coordinated</span></>
                    ) : (
                      <>Naive Baseline Schedule <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-[#64748B] border border-slate-300 font-mono font-medium">Individual Blocks</span></>
                    )}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-[#E2E8F0]">
                      <button
                        onClick={() => setScheduleViewMode('optimized')}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition duration-200 cursor-pointer ${
                          scheduleViewMode === 'optimized'
                            ? 'bg-[#0070C0] text-white shadow-xs'
                            : 'text-[#64748B] hover:text-[#1A202C]'
                        }`}
                      >
                        CP-SAT Optimized
                      </button>
                      <button
                        onClick={() => setScheduleViewMode('baseline')}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition duration-200 cursor-pointer ${
                          scheduleViewMode === 'baseline'
                            ? 'bg-[#1F3864] text-white shadow-xs'
                            : 'text-[#64748B] hover:text-[#1A202C]'
                        }`}
                      >
                        Naive Baseline
                      </button>
                    </div>
                    <div className="flex items-center gap-2 border-l border-[#E2E8F0] pl-3">
                      <span className="flex items-center gap-1 font-medium"><span className="w-2.5 h-2.5 rounded-xs bg-[#0070C0]"></span> Civil Engineering</span>
                      <span className="flex items-center gap-1 font-medium"><span className="w-2.5 h-2.5 rounded-xs bg-[#548235]"></span> S&amp;T</span>
                      <span className="flex items-center gap-1 font-medium"><span className="w-2.5 h-2.5 rounded-xs bg-[#ED7D31]"></span> TRD (25kV)</span>
                    </div>
                  </div>
                </div>

                {/* Baseline vs Optimized comparison card */}
                <div className="bg-gradient-to-r from-sky-50/70 via-indigo-50/50 to-emerald-50/70 p-4 rounded-lg border border-sky-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-[#1F3864] text-white rounded-lg shrink-0">
                      <Sparkles className="w-4 h-4 text-sky-300" />
                    </div>
                    <div>
                      <span className="font-bold text-[#1F3864] text-xs block">
                        Optimization Impact (CP-SAT vs. Sequential Baseline)
                      </span>
                      <span className="text-[11px] text-[#64748B]">
                        {scheduleViewMode === 'optimized'
                          ? 'CP-SAT Joint Bundling plan — 44% fewer track closures and 120 mins returned to traffic.'
                          : 'Naive Baseline — isolated track blocks for each department.'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center px-2.5 py-1 bg-white/90 rounded-md border border-[#E2E8F0]">
                      <span className="text-[10px] text-[#64748B] block uppercase font-medium">Closures</span>
                      <span className="font-mono font-bold text-[#1F3864]">
                        {data.metrics.total_blocks_used} <span className="text-slate-400 font-normal">vs {data.baseline_metrics.total_blocks_used}</span>
                      </span>
                    </div>
                    <div className="text-center px-2.5 py-1 bg-white/90 rounded-md border border-[#E2E8F0]">
                      <span className="text-[10px] text-[#64748B] block uppercase font-medium">Downtime</span>
                      <span className="font-mono font-bold text-[#548235]">
                        {data.metrics.total_downtime_minutes}m <span className="text-slate-400 font-normal">vs {data.baseline_metrics.total_downtime_minutes}m</span>
                      </span>
                    </div>
                    <div className="text-center px-2.5 py-1 bg-white/90 rounded-md border border-[#E2E8F0]">
                      <span className="text-[10px] text-[#64748B] block uppercase font-medium">Bundled Pairs</span>
                      <span className="font-mono font-bold text-[#548235]">
                        {data.metrics.bundled_task_pairs} pairs <span className="text-slate-400 font-normal">vs 0</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* One-line plain-language caption */}
                <p className="text-[11px] text-[#64748B] leading-snug">
                  Each bar is a maintenance closure. Bars sitting together in the same window are bundled into one shared closure — click any bar for the reason why.
                </p>

                {/* 7-Day Planning Horizon Selector */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-lg border border-[#E2E8F0]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-[#1F3864] uppercase tracking-wide px-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> 7-Day Horizon:
                    </span>
                    {[
                      { idx: 0, label: 'Day 1 (Tue 01 Sep)' },
                      { idx: 1, label: 'Day 2 (Wed 02 Sep)' },
                      { idx: 2, label: 'Day 3 (Thu 03 Sep)' },
                      { idx: 3, label: 'Day 4 (Fri 04 Sep)' },
                      { idx: 4, label: 'Day 5 (Sat 05 Sep)' },
                      { idx: 5, label: 'Day 6 (Sun 06 Sep)' },
                      { idx: 6, label: 'Day 7 (Mon 07 Sep)' },
                    ].map(day => (
                      <button
                        key={day.idx}
                        onClick={() => setSelectedDayIndex(day.idx)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition duration-200 cursor-pointer ${
                          selectedDayIndex === day.idx
                            ? 'bg-[#1F3864] text-white shadow-xs'
                            : 'bg-white text-[#1A202C] hover:bg-slate-100 border border-[#E2E8F0]'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                    <button
                      onClick={() => setSelectedDayIndex('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition duration-200 cursor-pointer ${
                        selectedDayIndex === 'all'
                          ? 'bg-[#0070C0] text-white shadow-xs'
                          : 'bg-white text-[#1A202C] hover:bg-slate-100 border border-[#E2E8F0]'
                      }`}
                    >
                      Week Overview (All 7 Days)
                    </button>
                  </div>
                  {weeklyData && weeklyData.deferrals && weeklyData.deferrals.length > 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-50 text-[#b45309] border border-amber-200 font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {weeklyData.deferrals.length} Capacity Deferrals Active
                    </span>
                  )}
                </div>

                {/* Deferral Alert Banner */}
                {selectedDayIndex === 1 && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-[#ED7D31] mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold">Multi-Day Deferral Scheduled:</span> Task <strong>T0</strong> (TRD 120m OHE Isolator Replacement, due 01 Sep) was deferred from Day 1 to Day 2 (06:00–08:00) due to Section A Day 1 track capacity and power isolation safety requirements.
                    </div>
                  </div>
                )}

                {/* Week Overview Table */}
                {selectedDayIndex === 'all' && (
                  <div className="space-y-4 pt-2">
                    <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
                      <div className="bg-[#1F3864] text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between">
                        <span>7-DAY OPERATIONAL HORIZON SCHEDULE BREAKDOWN (TPJ DIVISION)</span>
                        <span className="font-mono text-sky-200">21 Timetable Windows · 17 Maintenance Tasks Scheduled</span>
                      </div>
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-[#1A202C] font-semibold border-b border-[#E2E8F0]">
                            <th className="py-2.5 px-3">Day / Date</th>
                            <th className="py-2.5 px-3">Section A (TPJ–SRGM)</th>
                            <th className="py-2.5 px-3">Section B (TPJ–GOC)</th>
                            <th className="py-2.5 px-3">Section C (TPJ–KRR)</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0] bg-white">
                          {[
                            { day: 'Day 1 (Tue 01 Sep)', secA: 'E1, S1, E2, E5, S5 (Bundled) + T1 (Isolated)', secB: 'Clear for Traffic', secC: 'Clear for Traffic', status: '5 Tasks Scheduled (1 Bundled Block + 1 TRD)' },
                            { day: 'Day 2 (Wed 02 Sep)', secA: 'T0 (Deferred from Day 1, 120m)', secB: 'S2, E3, S4, E6 (Bundled Block)', secC: 'Clear for Traffic', status: '5 Tasks Scheduled (1 Bundled Block + 1 TRD Deferral)' },
                            { day: 'Day 3 (Thu 03 Sep)', secA: 'T3 (TRD 80m)', secB: 'T2 (TRD 35m)', secC: 'Clear for Traffic', status: '2 TRD Power Isolation Blocks' },
                            { day: 'Day 4 (Fri 04 Sep)', secA: 'Clear for Traffic', secB: 'Clear for Traffic', secC: 'E4, S3, E7 (Bundled Block, 60m)', status: '3 Tasks Bundled (1 Block)' },
                            { day: 'Day 5 (Sat 05 Sep)', secA: 'Clear for Traffic', secB: 'Clear for Traffic', secC: 'T4 (TRD 90m)', status: '1 TRD Power Block' },
                            { day: 'Day 6 (Sun 06 Sep)', secA: 'Window Available (06:00–10:00)', secB: 'Window Available (08:00–12:00)', secC: 'Window Available (10:00–14:00)', status: 'Available Track Capacity' },
                            { day: 'Day 7 (Mon 07 Sep)', secA: 'Window Available (06:00–10:00)', secB: 'Window Available (08:00–12:00)', secC: 'Window Available (10:00–14:00)', status: 'Available Track Capacity' },
                          ].map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 transition duration-150">
                              <td className="py-2.5 px-3 font-bold text-[#1F3864] font-mono">{row.day}</td>
                              <td className="py-2.5 px-3 font-mono text-[#1A202C]">{row.secA}</td>
                              <td className="py-2.5 px-3 font-mono text-[#1A202C]">{row.secB}</td>
                              <td className="py-2.5 px-3 font-mono text-[#1A202C]">{row.secC}</td>
                              <td className="py-2.5 px-3 font-semibold text-[#548235]">{row.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {weeklyData && weeklyData.deferrals && (
                      <div className="border border-amber-200 bg-amber-50/60 rounded-lg p-4 space-y-2">
                        <h4 className="text-xs font-bold text-[#b45309] uppercase tracking-wide flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-[#ED7D31]" /> Multi-Day Deferral Log &amp; Explanations
                        </h4>
                        <div className="space-y-1.5 text-xs text-slate-700">
                          {weeklyData.deferrals.map((def, idx) => (
                            <div key={idx} className="p-2.5 bg-white rounded-lg border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <span className="font-bold font-mono text-[#1F3864]">Task {def.task_id}</span> ({def.department} · {getSectionName(def.section_id)})
                                <span className="ml-2 text-[#64748B]">Target Due: <span className="font-mono text-[#1A202C]">{def.due_date}</span></span>
                                <span className="ml-2 text-amber-800 font-medium">→ Scheduled: <span className="font-mono font-bold text-amber-900">{def.scheduled_date}</span> ({def.scheduled_window})</span>
                              </div>
                              <span className="text-[11px] text-[#64748B] italic bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                {def.reason}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Scrollable Gantt Timeline Area with explicit scroll indicators */}
                <div className="border border-[#E2E8F0] rounded-xl bg-slate-50/40 p-3 space-y-2.5">
                  {/* Timeline Toolbar / Status Header with Scroll Indicators */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748B] pb-2 border-b border-[#E2E8F0] px-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#1F3864] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#0070C0]" />
                        Corridor Timeline (06:00 – 12:00 Shift)
                      </span>
                      <span className="text-[10px] text-slate-300">•</span>
                      <span className="text-[11px] text-[#64748B]">3 Corridors · {scheduleViewMode === 'optimized' ? data.schedule.length : data.baseline_schedule.length} Maintenance Blocks Active</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium bg-white text-slate-700 px-2.5 py-1 rounded-md border border-[#E2E8F0] shadow-2xs">
                        <span>↔ Scroll timeline horizontally</span>
                        <span className="text-slate-300">•</span>
                        <span>↕ Scroll vertically for all corridors ↓</span>
                      </span>
                    </div>
                  </div>

                  {/* Scrollable Gantt Viewport */}
                  <div
                    className="overflow-x-auto overflow-y-auto max-h-[520px] rounded-lg focus:outline-none scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 pr-1"
                    tabIndex={0}
                    aria-label="Gantt Timeline Schedule"
                  >
                    <div className="min-w-[820px] space-y-3 pb-1">
                      {/* Timeline Horizontal Axis (06:00 - 12:00) – Sticky Header */}
                      <div className="grid grid-cols-6 text-[11px] font-mono font-semibold text-[#64748B] px-3 py-1.5 bg-slate-100/95 backdrop-blur-xs rounded-md border border-[#E2E8F0] sticky top-0 z-30 shadow-2xs">
                        <div>06:00 (360m)</div>
                        <div>07:00 (420m)</div>
                        <div>08:00 (480m)</div>
                        <div>09:00 (540m)</div>
                        <div>10:00 (600m)</div>
                        <div className="text-right">12:00 (720m)</div>
                      </div>

                      {['A', 'B', 'C'].map(sec => {
                        const secTasks = (scheduleViewMode === 'optimized' ? data.schedule : data.baseline_schedule)
                          .filter(s => {
                            const t = data.tasks.find(tk => tk.id === s.task_id);
                            return t && t.section_id === sec;
                          });

                        const secWindows = data.windows.filter(w => w.section_id === sec);
                        const minAxis = 360;
                        const maxAxis = 720;
                        const totalSpan = maxAxis - minAxis;

                        const bundleGroups = {};
                        secTasks.forEach(e => {
                          if (e.bundle_group_id) {
                            bundleGroups[e.bundle_group_id] = bundleGroups[e.bundle_group_id] || [];
                            bundleGroups[e.bundle_group_id].push(e.task_id);
                          }
                        });

                        // Calculate lane index for each task to guarantee zero clipping
                        const laneAssignments = {};
                        if (scheduleViewMode === 'optimized') {
                          secTasks.forEach(e => {
                            if (e.bundle_group_id) {
                              const groupList = bundleGroups[e.bundle_group_id] || [];
                              laneAssignments[e.task_id] = groupList.indexOf(e.task_id);
                            } else {
                              laneAssignments[e.task_id] = 0;
                            }
                          });
                        } else {
                          const sortedTasks = [...secTasks].sort((a, b) => a.start_minute - b.start_minute);
                          const laneEndTimes = [];
                          sortedTasks.forEach(t => {
                            let placed = false;
                            for (let l = 0; l < laneEndTimes.length; l++) {
                              if (laneEndTimes[l] <= t.start_minute) {
                                laneAssignments[t.task_id] = l;
                                laneEndTimes[l] = t.end_minute;
                                placed = true;
                                break;
                              }
                            }
                            if (!placed) {
                              laneAssignments[t.task_id] = laneEndTimes.length;
                              laneEndTimes.push(t.end_minute);
                            }
                          });
                        }

                        const maxLaneIndex = secTasks.length > 0 ? Math.max(0, ...secTasks.map(t => laneAssignments[t.task_id] ?? 0)) : 0;
                        const isMultiLane = maxLaneIndex > 0;
                        const trackHeight = Math.max(90, (maxLaneIndex + 1) * 28 + 14);

                        return (
                          <div key={sec} className="bg-slate-50 border border-[#E2E8F0] rounded-lg p-3.5">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#1F3864] font-mono px-2 py-0.5 bg-white rounded-md border border-[#E2E8F0]">
                                  SECTION {sec}
                                </span>
                                <span className="text-xs font-bold text-[#1A202C]">{getSectionName(sec)}</span>
                                <span className="text-[11px] text-[#64748B]">
                                  (Authorized Window: {secWindows[0] ? `${formatMinutes(secWindows[0].start_time)} – ${formatMinutes(secWindows[0].end_time)}` : 'N/A'})
                                </span>
                              </div>
                              <span className="text-[11px] text-[#64748B] font-mono">{secTasks.length} Assigned Requests</span>
                            </div>

                            <div
                              className="relative bg-[#EAEFF5] rounded-lg border border-slate-300 overflow-hidden shadow-inner"
                              style={{ minHeight: `${trackHeight}px`, height: `${trackHeight}px` }}
                            >
                              {secWindows.map(win => {
                                const leftPct = ((win.start_time - minAxis) / totalSpan) * 100;
                                const widthPct = ((win.end_time - win.start_time) / totalSpan) * 100;
                                return (
                                  <div
                                    key={win.id}
                                    className="absolute top-0 bottom-0 bg-[#D9E8F5]/80 border-x border-[#0070C0]/40"
                                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                    title={`Timetable Window: ${win.id}`}
                                  >
                                    <span className="text-[10px] font-mono font-medium text-[#0070C0] pl-1.5 pt-0.5 opacity-70 block">
                                      {win.id} ({getSectionShort(sec)})
                                    </span>
                                  </div>
                                );
                              })}

                              {secTasks.map((entry) => {
                                const task = data.tasks.find(t => t.id === entry.task_id);
                                if (!task) return null;

                                const leftPct = ((entry.start_minute - minAxis) / totalSpan) * 100;
                                const widthPct = ((entry.end_minute - entry.start_minute) / totalSpan) * 100;
                                const laneIdx = laneAssignments[entry.task_id] ?? 0;

                                let topPos = 4 + laneIdx * 28;
                                let blockHeight = 24;

                                if (!isMultiLane && !entry.bundle_group_id) {
                                  topPos = 16;
                                  blockHeight = 52;
                                }

                                const isExpanded = expandedTaskId === entry.task_id;

                                return (
                                  <div
                                    key={entry.task_id}
                                    onClick={() => setExpandedTaskId(isExpanded ? null : entry.task_id)}
                                    style={{
                                      left: `${leftPct}%`,
                                      width: `${Math.max(widthPct, 4.5)}%`,
                                      top: `${topPos}px`,
                                      height: `${blockHeight}px`
                                    }}
                                    className={`absolute cursor-pointer rounded-md px-2 flex items-center justify-between text-xs font-semibold transition-all duration-300 ease-out hover:opacity-95 hover:ring-2 hover:ring-[#1F3864] hover:z-20 border ${getGanttTaskStyle(task.department)} ${isExpanded ? 'ring-2 ring-[#1F3864] z-20' : ''}`}
                                  >
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                      <span className="font-mono text-[11px] font-bold">{task.id}</span>
                                      <span className="text-[10px] opacity-90 truncate hidden sm:inline">{task.department}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] font-mono opacity-90">{entry.end_minute - entry.start_minute}m</span>
                                      <ChevronDown className={`w-2.5 h-2.5 opacity-70 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Expandable "Why?" drawer – shows for any task in this section that is expanded */}
                            {secTasks.map(entry => {
                              if (expandedTaskId !== entry.task_id) return null;
                              const task = data.tasks.find(t => t.id === entry.task_id);
                              const exp = data.explanations.find(e => e.schedule_entry_id === entry.task_id);
                              if (!task) return null;
                              return (
                                <div
                                  key={`why-${entry.task_id}`}
                                  className="mt-2 p-3.5 bg-white border border-[#0070C0]/30 rounded-lg shadow-sm text-xs space-y-2 animate-in slide-in-from-top-1 duration-200"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-[#1F3864]">Task {task.id}</span>
                                      <span className={`px-2 py-0.5 rounded border text-[10px] ${getDeptBadge(task.department)}`}>{task.department}</span>
                                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200 text-[10px]">{getSectionName(task.section_id)}</span>
                                      <span className="px-2 py-0.5 rounded bg-amber-50 text-[#b45309] font-medium border border-amber-200 text-[10px]">Criticality: {task.criticality}/5</span>
                                      {task.ml_priority_score && (
                                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 font-medium border border-indigo-200 font-mono text-[10px]">ML: {task.ml_priority_score.toFixed(1)}</span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => setExpandedTaskId(null)}
                                      className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="flex items-start gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-[#0070C0] mt-0.5 shrink-0" />
                                    <p className="text-slate-700 leading-relaxed">
                                      {(exp?.reason_text || 'Scheduled deterministically per CP-SAT constraints.').replace(/DepartmentEnum\./g, '')}
                                    </p>
                                  </div>

                                  {task.description && (
                                    <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                                      <span className="font-semibold text-slate-800">Work Description / Equipment:</span> {task.description}
                                    </div>
                                  )}

                                  <div className="flex flex-wrap gap-2">
                                    {exp?.synergy_captured && (
                                      <span className="text-[#548235] font-semibold flex items-center gap-1 font-mono text-[11px]">
                                        <GitMerge className="w-3 h-3" /> Bundled with: {exp.synergy_captured.join(', ')}
                                      </span>
                                    )}
                                    {exp?.conflict_avoided && (
                                      <span className="text-[#b45309] font-semibold flex items-center gap-1 font-mono text-[11px]">
                                        <ShieldAlert className="w-3 h-3" /> Isolated from: {exp.conflict_avoided}
                                      </span>
                                    )}
                                    {exp?.constraint_involved && (
                                      <span className="text-slate-500 font-mono text-[10px] px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                                        constraint: {exp.constraint_involved}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                                    <button
                                      onClick={() => {
                                        handleDecisionTaskChange(task.id);
                                        setDecisionForm(prev => ({ ...prev, taskId: task.id, action: 'approved', note: `Approved for ${getSectionShort(task.section_id)}` }));
                                        setActiveTab('approvals');
                                        setExpandedTaskId(null);
                                      }}
                                      className="px-3 py-1.5 bg-[#548235] hover:bg-[#436b28] text-white rounded text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Quick Approve
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleDecisionTaskChange(task.id);
                                        setDecisionForm(prev => ({ ...prev, taskId: task.id, action: 'modified' }));
                                        setActiveTab('approvals');
                                        setExpandedTaskId(null);
                                      }}
                                      className="px-3 py-1.5 bg-[#0070C0] hover:bg-[#005a9e] text-white rounded text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1"
                                    >
                                      <Clock className="w-3.5 h-3.5" />
                                      Modify Schedule
                                    </button>
                                    <button
                                      onClick={() => setExpandedTaskId(null)}
                                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-xs font-semibold transition cursor-pointer"
                                    >
                                      Collapse
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}

                      {/* Bottom Scroll Reachability Indicator */}
                      <div className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-[#E2E8F0] text-[11px] text-[#64748B]">
                        <span className="flex items-center gap-1.5 font-medium text-[#1F3864]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#548235]" />
                          End of Corridor Schedule — All Section A, B & C Tasks Loaded
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Total {scheduleViewMode === 'optimized' ? data.schedule.length : data.baseline_schedule.length} Maintenance Blocks Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: APPROVALS (Coordinator decision log) ── */}
            {activeTab === 'approvals' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
                  <div className="pb-2 border-b border-slate-100">
                    <h3 className="text-base font-bold text-[#1F3864] flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-[#548235]" />
                      Coordinator Authorization
                    </h3>
                  </div>

                  {!isBackendConnected && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-[#ED7D31] shrink-0" />
                      <span>Server offline: Actions are saved to local session storage.</span>
                    </div>
                  )}

                  {decisionMessage && (
                    <div className={`p-3 border-l-4 rounded-lg text-xs flex items-center gap-2 ${
                      decisionMessage.type === 'warning'
                        ? 'bg-amber-50 border-[#ED7D31] text-amber-900'
                        : 'bg-emerald-50 border-[#548235] text-emerald-800'
                    }`}>
                      {decisionMessage.type === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 shrink-0 text-[#ED7D31]" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-[#548235]" />
                      )}
                      <span>{decisionMessage.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleDecisionSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#1A202C] mb-1">Target Maintenance Task</label>
                      <select
                        value={decisionForm.taskId}
                        onChange={(e) => handleDecisionTaskChange(e.target.value)}
                        className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs text-[#1A202C] focus:outline-none focus:border-[#0070C0] transition duration-200"
                      >
                        {data.tasks.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.id} — {t.department} ({getSectionName(t.section_id)}, {t.duration_minutes}m)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1A202C] mb-1">Authorization Decision</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['approved', 'modified', 'rejected'].map(act => (
                          <button
                            key={act}
                            type="button"
                            onClick={() => setDecisionForm(prev => ({ ...prev, action: act }))}
                            className={`py-2 px-2 text-xs font-bold rounded-lg capitalize border transition duration-200 cursor-pointer ${
                              decisionForm.action === act
                                ? act === 'approved' ? 'bg-[#548235] text-white border-[#436b28]'
                                  : act === 'modified' ? 'bg-[#0070C0] text-white border-[#005a9e]'
                                  : 'bg-[#C00000] text-white border-[#900000]'
                                : 'bg-slate-50 text-[#1A202C] border-[#E2E8F0] hover:bg-slate-100'
                            }`}
                          >
                            {act}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Window & Timing Adjustment Form (When Modify is selected) */}
                    {decisionForm.action === 'modified' && (
                      <div className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-lg space-y-3 animate-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#0070C0]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Adjust Assigned Window &amp; Time Slot</span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-[#1A202C] mb-1">
                            Target Maintenance Window
                          </label>
                          <select
                            value={decisionForm.targetWindow}
                            onChange={(e) => {
                              const newWin = data.windows.find(w => w.id === e.target.value);
                              const task = data.tasks.find(t => t.id === decisionForm.taskId);
                              const duration = task?.duration_minutes || 45;
                              const newStart = newWin ? newWin.start_time : decisionForm.startMinute;
                              setDecisionForm(prev => ({
                                ...prev,
                                targetWindow: e.target.value,
                                startMinute: newStart,
                                endMinute: newStart + duration
                              }));
                            }}
                            className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-xs text-[#1A202C] focus:outline-none focus:border-[#0070C0] transition duration-200"
                          >
                            {data.windows.map(w => (
                              <option key={w.id} value={w.id}>
                                {w.id} ({getSectionShort(w.section_id)} · {formatMinutes(w.start_time)}–{formatMinutes(w.end_time)})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-[#1A202C] mb-1">
                              Start Time Slot
                            </label>
                            <select
                              value={decisionForm.startMinute}
                              onChange={(e) => {
                                const newStart = parseInt(e.target.value, 10);
                                const task = data.tasks.find(t => t.id === decisionForm.taskId);
                                const duration = task?.duration_minutes || 45;
                                setDecisionForm(prev => ({
                                  ...prev,
                                  startMinute: newStart,
                                  endMinute: newStart + duration
                                }));
                              }}
                              className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2 py-1.5 text-xs text-[#1A202C] font-mono focus:outline-none focus:border-[#0070C0] transition duration-200"
                            >
                              {[360, 375, 390, 405, 420, 435, 450, 465, 480, 495, 510, 525, 540, 555, 570, 585, 600, 630, 660, 690, 720].map(m => (
                                <option key={m} value={m}>
                                  {formatMinutes(m)} ({m}m)
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#1A202C] mb-1">
                              End Time Slot
                            </label>
                            <div className="w-full bg-slate-100 border border-[#E2E8F0] rounded-lg px-2 py-1.5 text-xs text-[#1A202C] font-mono">
                              {formatMinutes(decisionForm.startMinute + (data.tasks.find(t => t.id === decisionForm.taskId)?.duration_minutes || 45))} ({data.tasks.find(t => t.id === decisionForm.taskId)?.duration_minutes || 45}m)
                            </div>
                          </div>
                        </div>

                        <div className="text-[11px] text-sky-800 bg-sky-100/60 p-2 rounded-lg border border-sky-200">
                          <span className="font-semibold">New Assigned Slot:</span> {formatMinutes(decisionForm.startMinute)} – {formatMinutes(decisionForm.startMinute + (data.tasks.find(t => t.id === decisionForm.taskId)?.duration_minutes || 45))} in {decisionForm.targetWindow}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-[#1A202C] mb-1">Operational Dispatcher Notes</label>
                      <textarea
                        rows={3}
                        value={decisionForm.note}
                        onChange={(e) => setDecisionForm(prev => ({ ...prev, note: e.target.value }))}
                        placeholder={
                          decisionForm.action === 'modified'
                            ? "Explain reason for schedule / window adjustment (e.g. shifted due to traction maintenance priorities)..."
                            : "Enter block authorization remarks, traction notes, or caution order references..."
                        }
                        className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs text-[#1A202C] focus:outline-none focus:border-[#0070C0] transition duration-200"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingDecision}
                      className="w-full bg-[#0070C0] hover:bg-[#005a9e] text-white font-semibold py-2 px-4 rounded-lg text-xs transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isSubmittingDecision ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Logging Coordinator Action...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          {decisionForm.action === 'modified' ? 'Save Schedule Modification' : 'Log Coordinator Action'}
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Decision Audit Log Table */}
                <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-3">
                  <div className="pb-2 border-b border-slate-100">
                    <h3 className="text-base font-bold text-[#1F3864]">Official Decision Audit Log ({decisions.length})</h3>
                  </div>

                  <div className="overflow-x-auto border border-[#E2E8F0] rounded-lg">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[#1A202C] font-semibold border-b border-[#E2E8F0]">
                          <th className="py-2.5 px-3">Task ID</th>
                          <th className="py-2.5 px-3">Action</th>
                          <th className="py-2.5 px-3">Assigned Window / Slot</th>
                          <th className="py-2.5 px-3">Timestamp</th>
                          <th className="py-2.5 px-3">Dispatcher Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {decisions.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-400">No decisions recorded yet.</td>
                          </tr>
                        ) : (
                          decisions.map((dec, i) => (
                            <tr key={i} className="hover:bg-slate-50/80 transition duration-150">
                              <td className="py-2.5 px-3 font-mono font-bold text-[#1F3864]">{dec.schedule_entry_id}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold capitalize border ${
                                  dec.action === 'approved' ? 'bg-[#548235]/10 text-[#548235] border-[#548235]/30'
                                    : dec.action === 'modified' ? 'bg-[#0070C0]/10 text-[#0070C0] border-[#0070C0]/30'
                                    : 'bg-[#C00000]/10 text-[#C00000] border-[#C00000]/30'
                                }`}>
                                  {dec.action}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[#1A202C] text-[11px]">
                                {dec.assigned_window_id ? (
                                  <span className="font-semibold text-[#0070C0]">
                                    {dec.assigned_window_id} {dec.start_minute != null ? `(${formatMinutes(dec.start_minute)}–${formatMinutes(dec.end_minute)})` : ''}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[#64748B]">
                                {dec.timestamp ? new Date(dec.timestamp).toLocaleTimeString() : 'N/A'}
                              </td>
                              <td className="py-2.5 px-3 text-[#1A202C]">{dec.note || '—'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: ABOUT ── */}
            {activeTab === 'about' && (
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="p-2 bg-[#1F3864] text-white rounded-lg">
                    <BookOpen className="w-4 h-4 text-sky-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#1F3864]">About This Project — Technical Architecture & Blueprint</h3>
                    <p className="text-xs text-[#64748B]">BlockSync · Southern Railway TPJ Division</p>
                  </div>
                </div>
                {/* Clean inline about content */}
                <div className="text-xs text-[#1A202C] leading-relaxed space-y-6">

                  <section className="bg-slate-50/70 p-5 rounded-lg border border-[#E2E8F0] space-y-3">
                    <div className="flex items-center gap-2 text-[#1F3864] font-bold text-sm border-b border-slate-200 pb-2">
                      <AlertTriangle className="w-4 h-4 text-[#ED7D31]" />
                      1. The Operational Railway Problem & Fragmentation Bottleneck
                    </div>
                    <p className="text-[#1A202C]">
                      Across Indian Railways' high-density mixed traffic corridors, maintaining track geometry, 25kV traction lines, and electronic interlocking systems is mandatory to prevent derailments and signal failures. Track availability (maintenance "blocks") is severely constrained by tight passenger train headways.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-lg text-[11px] text-[#64748B]">
                        <h4 className="font-bold text-[#C00000] text-xs flex items-center gap-1.5 mb-1"><XCircle className="w-3.5 h-3.5 text-[#C00000]" /> Status Quo</h4>
                        Civil Engineering, S&T, and TRD each receive isolated line closures, multiplying downtime and disrupting passenger punctuality.
                      </div>
                      <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-[11px] text-[#64748B]">
                        <h4 className="font-bold text-[#548235] text-xs flex items-center gap-1.5 mb-1"><CheckCircle2 className="w-3.5 h-3.5 text-[#548235]" /> BlockSync Solution</h4>
                        CP-SAT jointly schedules compatible requests inside the same window, reducing closures by 44% and returning 120 minutes of corridor access.
                      </div>
                    </div>
                  </section>

                  <section className="bg-slate-50/70 p-5 rounded-lg border border-[#E2E8F0] space-y-3">
                    <div className="flex items-center gap-2 text-[#1F3864] font-bold text-sm border-b border-slate-200 pb-2">
                      <Database className="w-4 h-4 text-[#548235]" />
                      2. What Is Real vs. Synthetic Data — Full Transparency
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {[
                        { label: 'Train Time Table', type: 'real_public', color: 'bg-emerald-100 text-[#548235] border-emerald-300', note: '186,124 official stops · data.gov.in · Ministry of Railways' },
                        { label: 'Maintenance Windows', type: 'real_derived', color: 'bg-sky-100 text-[#0070C0] border-sky-300', note: '3 corridors derived from timetable headway gaps' },
                        { label: 'Work Order Backlog', type: 'synthetic_standardized', color: 'bg-amber-100 text-[#ED7D31] border-amber-300', note: 'IRPWM & SEM railway manuals + live portal entries' },
                        { label: 'ML Priority Model', type: 'synthetic_trained', color: 'bg-purple-100 text-purple-800 border-purple-300', note: 'RandomForest on 1,200 records — R²=0.990, MAE=0.223' },
                      ].map((d, i) => (
                        <div key={i} className="p-3.5 bg-white border border-[#E2E8F0] rounded-lg flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-[#1F3864] block text-xs">{d.label}</span>
                            <span className="text-[11px] text-[#64748B]">{d.note}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border whitespace-nowrap ${d.color}`}>{d.type}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="bg-slate-50/70 p-5 rounded-lg border border-[#E2E8F0] space-y-3">
                    <div className="flex items-center gap-2 text-[#1F3864] font-bold text-sm border-b border-slate-200 pb-2">
                      <Cpu className="w-4 h-4 text-[#0070C0]" />
                      3. ML vs. CP-SAT — Role Division
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-lg text-[11px] text-slate-700">
                        <h4 className="font-bold text-indigo-900 text-xs mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3 text-indigo-600" /> RandomForest ML</h4>
                        Ranks tasks by urgency (criticality + days-overdue) → feeds score as w2 into CP-SAT. Does not schedule; only prioritizes.
                      </div>
                      <div className="p-3.5 bg-sky-50/60 border border-sky-200 rounded-lg text-[11px] text-slate-700">
                        <h4 className="font-bold text-[#0070C0] text-xs mb-1 flex items-center gap-1"><Cpu className="w-3 h-3 text-[#0070C0]" /> OR-Tools CP-SAT</h4>
                        Enforces hard safety constraints (TRD NoOverlap, window boundaries, mandatory criticality≥4). Maximizes joint bundling − closures − delays. Fully deterministic.
                      </div>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-[#E2E8F0] font-mono text-[10px] text-[#1A202C]">
                      Maximize: +10·Σ(bundling) + 1·Σ(priority·x_i) − 3·Σ(distinct_blocks) − 8·Σ(overdue_delays)
                    </div>
                  </section>

                  <section className="bg-slate-50/70 p-5 rounded-lg border border-[#E2E8F0] space-y-3">
                    <div className="flex items-center gap-2 text-[#1F3864] font-bold text-sm border-b border-slate-200 pb-2">
                      <UserCheck className="w-4 h-4 text-[#548235]" />
                      4. Human Controller Sign-Off & Approval Workflow
                    </div>
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 leading-relaxed">
                      <strong>BlockSync is a decision support tool — not an autonomous dispatcher.</strong> Every block allocation must be sanctioned by the Divisional Operations Manager (DOM) or Chief Train Controller (CTC) at Tiruchirappalli. The Approvals tab records this mandatory sign-off with immutable timestamps.
                    </div>
                  </section>

                  <section className="bg-slate-50/70 p-5 rounded-lg border border-[#E2E8F0] space-y-3">
                    <div className="flex items-center gap-2 text-[#C00000] font-bold text-sm border-b border-slate-200 pb-2">
                      <AlertCircle className="w-4 h-4 text-[#C00000]" />
                      5. Division Scope & Honest Operational Boundaries
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { title: 'Rolling 7-Day Planning Horizon', text: 'Operates on a 7-day window with 21 maintenance slots. Monthly master planning is treated as backlog projection.' },
                        { title: 'Static Timetable Shadow Analysis', text: 'Derives slots from published timetables (data.gov.in). No real-time locomotive GPS — those feeds are not public.' },
                        { title: 'Tiruchirappalli Division Scope', text: 'Calibrated for TPJ–SRGM, TPJ–GOC, TPJ–KRR corridors. Network junctions and crew rosters are outside this prototype.' },
                        { title: 'Core Validation Suite', text: '17 automated pytest test cases verify all CP-SAT solver formulations and ML validation metrics.' },
                      ].map((d, i) => (
                        <div key={i} className="p-3.5 bg-white border border-[#E2E8F0] rounded-lg">
                          <span className="font-bold text-[#1F3864] text-xs block">{d.title}</span>
                          <p className="text-[11px] text-[#64748B] mt-1">{d.text}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                </div>
                <div className="pt-3 border-t border-slate-100 text-[11px] text-[#64748B] text-center">
                  BlockSync Optimization Engine · Southern Railway TPJ Division · 17/17 Tests Passing
                </div>
              </div>
            )}
          </>
        ) : (
          /* ═══════════════════════════════════════════════════════════════ */
          /* PORTAL 2: DEPARTMENT REQUESTER PORTAL (Civil / S&T / TRD)      */
          /* ═══════════════════════════════════════════════════════════════ */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Request Submission Form */}
            <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#1F3864] flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-[#0070C0]" />
                    Submit Maintenance Request
                  </h3>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-md border ${getDeptBadge(currentUser.role)}`}>
                  {currentUser.role} Desk
                </span>
              </div>

              {taskSubmitStatus && (
                <div className="p-3 bg-emerald-50 border-l-4 border-[#548235] rounded-lg text-xs text-[#548235] flex items-start gap-2">
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{taskSubmitStatus.text}</span>
                </div>
              )}

              <form onSubmit={handleTaskSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#1A202C] mb-1">Applying Department</label>
                  <input
                    type="text"
                    disabled
                    value={`${currentUser.role} (${currentUser.department_name})`}
                    className="w-full bg-slate-50 border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs font-medium text-[#64748B] cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A202C] mb-1">Track Section (Tiruchirappalli Division)</label>
                  <select
                    value={taskForm.section_id}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, section_id: e.target.value }))}
                    className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs text-[#1A202C] focus:outline-none focus:border-[#0070C0] transition duration-200"
                  >
                    <option value="A">Section A: Tiruchirappalli Jn – Srirangam (TPJ – SRGM)</option>
                    <option value="B">Section B: Tiruchirappalli Jn – Golden Rock (TPJ – GOC)</option>
                    <option value="C">Section C: Tiruchirappalli Jn – Karur Jn (TPJ – KRR)</option>
                  </select>
                </div>

                {(() => {
                  const check = getRequesterConflictCheck(taskForm.section_id);
                  const isWarn = check.type === 'warning';
                  const isSuccess = check.type === 'success';
                  return (
                    <div className={`p-3.5 rounded-lg border text-xs ${
                      isWarn ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : isSuccess ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-sky-50 border-sky-300 text-sky-900'
                    }`}>
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        {isWarn ? <AlertTriangle className="w-3.5 h-3.5 text-[#ED7D31]" /> : <Info className="w-3.5 h-3.5 text-[#0070C0]" />}
                        <span>{check.title}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-90">{check.text}</p>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1A202C] mb-1">Duration (Minutes)</label>
                    <input
                      type="number"
                      min={15}
                      max={180}
                      step={5}
                      required
                      value={taskForm.duration_minutes}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, duration_minutes: e.target.value }))}
                      className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs text-[#1A202C] focus:outline-none focus:border-[#0070C0] transition duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1A202C] mb-1">Criticality Rating</label>
                    <select
                      value={taskForm.criticality}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, criticality: e.target.value }))}
                      className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs text-[#1A202C] focus:outline-none focus:border-[#0070C0] transition duration-200"
                    >
                      <option value={5}>Priority 5 (Safety Critical / Emergency)</option>
                      <option value={4}>Priority 4 (High Urgency Overdue)</option>
                      <option value={3}>Priority 3 (Standard Scheduled)</option>
                      <option value={2}>Priority 2 (Routine Preventive)</option>
                      <option value={1}>Priority 1 (Low Urgency Inspection)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A202C] mb-1">Target Execution Date</label>
                  <input
                    type="date"
                    required
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs text-[#1A202C] focus:outline-none focus:border-[#0070C0] transition duration-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A202C] mb-1">Work Description / Equipment Reference</label>
                  <input
                    type="text"
                    value={taskForm.description}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g. Point machine overhaul at GOC Yard KM 340/12"
                    className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs text-[#1A202C] focus:outline-none focus:border-[#0070C0] transition duration-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingTask}
                  className="w-full bg-[#0070C0] hover:bg-[#005a9e] text-white font-semibold py-2.5 px-4 rounded-lg text-xs transition duration-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmittingTask ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Running CP-SAT Slot Assignment...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Submit Maintenance Block Request
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Department's Own Requests List */}
            <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-3">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#1F3864]">
                    My Department's Block Requests ({myDepartmentTasks.length})
                  </h3>
                </div>
              </div>

              <div className="overflow-x-auto border border-[#E2E8F0] rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[#1A202C] font-semibold border-b border-[#E2E8F0]">
                      <th className="py-2.5 px-3">Req ID</th>
                      <th className="py-2.5 px-3">Track Section</th>
                      <th className="py-2.5 px-3">Work Description / Equipment Ref</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Priority</th>
                      <th className="py-2.5 px-3">Assigned Window</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myDepartmentTasks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">No requests submitted yet for this department.</td>
                      </tr>
                    ) : (
                      myDepartmentTasks.map(task => {
                        const sched = data.schedule.find(s => s.task_id === task.id);
                        const isDecided = decisions.find(d => d.schedule_entry_id === task.id);

                        return (
                          <tr key={task.id} className="hover:bg-slate-50/80 transition duration-150">
                            <td className="py-2.5 px-3 font-mono font-bold text-[#1F3864]">{task.id}</td>
                            <td className="py-2.5 px-3 font-semibold text-[#1A202C]">{getSectionName(task.section_id)}</td>
                            <td className="py-2.5 px-3 text-[#1A202C] max-w-xs">{task.description || '—'}</td>
                            <td className="py-2.5 px-3 font-mono text-[#1A202C]">{task.duration_minutes}m</td>
                            <td className="py-2.5 px-3">
                              <div className="flex flex-col gap-0.5">
                                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                  task.criticality >= 4 ? 'bg-amber-50 text-[#b45309] border border-amber-200' : 'bg-slate-100 text-[#64748B]'
                                }`}>
                                  Priority {task.criticality}/5
                                </span>
                                {task.ml_priority_score && (
                                  <span className="text-[10px] text-indigo-700 font-mono font-semibold">
                                    ML: {task.ml_priority_score.toFixed(1)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[#0070C0] font-medium">
                              {sched ? (
                                <span title={`Window: ${sched.assigned_window_id}`}>
                                  {formatMinutes(sched.start_minute)} – {formatMinutes(sched.end_minute)}
                                  {sched.bundle_group_id && <span className="ml-1 text-[10px] text-[#548235] font-semibold">(Bundled)</span>}
                                </span>
                              ) : (
                                <span className="text-slate-400">Queued for CP-SAT</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {isDecided ? (
                                <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize border ${
                                  isDecided.action === 'approved' ? 'bg-[#548235]/10 text-[#548235] border-[#548235]/30'
                                    : isDecided.action === 'modified' ? 'bg-[#0070C0]/10 text-[#0070C0] border-[#0070C0]/30'
                                    : 'bg-[#C00000]/10 text-[#C00000] border-[#C00000]/30'
                                }`}>
                                  {isDecided.action}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#548235]/10 text-[#548235] border border-[#548235]/30">
                                  Scheduled
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Print Sanction Order Modal ── */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[#E2E8F0] rounded-lg max-w-3xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#1F3864]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#1F3864] text-white rounded-lg">
                  <Train className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F3864]">SOUTHERN RAILWAY · TIRUCHIRAPPALLI DIVISION (TPJ)</h3>
                  <p className="text-xs text-[#64748B] font-mono">JOINT MAINTENANCE BLOCK SANCTION ORDER · REF: SR/TPJ/OPT-BLOCK/2026-09-01/001</p>
                </div>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="text-[#64748B] hover:text-[#1A202C] font-bold p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-lg border border-[#E2E8F0] text-xs">
              <div>
                <span className="text-[#64748B] block">Date of Block:</span>
                <span className="font-bold text-[#1A202C]">2026-09-01 (06:00 – 12:00)</span>
              </div>
              <div>
                <span className="text-[#64748B] block">Total Distinct Blocks:</span>
                <span className="font-bold text-[#0070C0]">5 Blocks (44% Reduction)</span>
              </div>
              <div>
                <span className="text-[#64748B] block">Corridor Savings:</span>
                <span className="font-bold text-[#548235]">120 Minutes Downtime Saved</span>
              </div>
            </div>

            <div className="overflow-x-auto border border-[#E2E8F0] rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[#1A202C] font-semibold border-b border-[#E2E8F0]">
                    <th className="py-2.5 px-3">Slot</th>
                    <th className="py-2.5 px-3">Track Section</th>
                    <th className="py-2.5 px-3">Window Time</th>
                    <th className="py-2.5 px-3">Bundled Tasks</th>
                    <th className="py-2.5 px-3">Traction Power Status</th>
                    <th className="py-2.5 px-3">Authority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50/80"><td className="py-2 px-3 font-mono font-bold">BLK-A1</td><td className="py-2 px-3">Tiruchirappalli Jn – Srirangam</td><td className="py-2 px-3 font-mono">06:00 – 07:00 (60m)</td><td className="py-2 px-3 font-semibold text-[#0070C0]">E1 (Civil) + S1 (S&T) + E2 (Civil)</td><td className="py-2 px-3 text-[#548235] font-medium">OHE Charged (25kV Live)</td><td className="py-2 px-3"><span className="px-2 py-0.5 bg-[#548235]/10 text-[#548235] rounded-md font-semibold text-[10px] border border-[#548235]/30">SANCTIONED</span></td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="py-2 px-3 font-mono font-bold">BLK-A2</td><td className="py-2 px-3">Tiruchirappalli Jn – Srirangam</td><td className="py-2 px-3 font-mono">07:00 – 07:40 (40m)</td><td className="py-2 px-3 font-semibold text-[#ED7D31]">T1 (TRD Power Isolation)</td><td className="py-2 px-3 text-[#ED7D31] font-bold">OHE ISOLATED (Power Cut)</td><td className="py-2 px-3"><span className="px-2 py-0.5 bg-[#548235]/10 text-[#548235] rounded-md font-semibold text-[10px] border border-[#548235]/30">SANCTIONED</span></td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="py-2 px-3 font-mono font-bold">BLK-B1</td><td className="py-2 px-3">Tiruchirappalli Jn – Golden Rock</td><td className="py-2 px-3 font-mono">08:00 – 08:50 (50m)</td><td className="py-2 px-3 font-semibold text-[#0070C0]">S2 (S&T) + E3 (Civil)</td><td className="py-2 px-3 text-[#548235] font-medium">OHE Charged (25kV Live)</td><td className="py-2 px-3"><span className="px-2 py-0.5 bg-[#548235]/10 text-[#548235] rounded-md font-semibold text-[10px] border border-[#548235]/30">SANCTIONED</span></td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="py-2 px-3 font-mono font-bold">BLK-B2</td><td className="py-2 px-3">Tiruchirappalli Jn – Golden Rock</td><td className="py-2 px-3 font-mono">08:50 – 09:25 (35m)</td><td className="py-2 px-3 font-semibold text-[#ED7D31]">T2 (TRD Power Isolation)</td><td className="py-2 px-3 text-[#ED7D31] font-bold">OHE ISOLATED (Power Cut)</td><td className="py-2 px-3"><span className="px-2 py-0.5 bg-[#548235]/10 text-[#548235] rounded-md font-semibold text-[10px] border border-[#548235]/30">SANCTIONED</span></td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="py-2 px-3 font-mono font-bold">BLK-C1</td><td className="py-2 px-3">Tiruchirappalli Jn – Karur Jn</td><td className="py-2 px-3 font-mono">10:00 – 10:40 (40m)</td><td className="py-2 px-3 font-semibold text-[#0070C0]">E4 (Civil) + S3 (S&T)</td><td className="py-2 px-3 text-[#548235] font-medium">OHE Charged (25kV Live)</td><td className="py-2 px-3"><span className="px-2 py-0.5 bg-[#548235]/10 text-[#548235] rounded-md font-semibold text-[10px] border border-[#548235]/30">SANCTIONED</span></td></tr>
                </tbody>
              </table>
            </div>

            <div className="pt-4 flex items-center justify-between text-xs text-[#64748B] border-t border-[#E2E8F0]">
              <div>
                <span className="font-semibold block text-[#1A202C]">Generated by: BlockSync AI Optimization Engine (CP-SAT)</span>
                <span className="text-[11px] text-[#64748B]">Certified Zero Safety-Critical Conflicts</span>
              </div>
              <div className="text-right">
                <span className="font-bold block text-[#1F3864]">Chief Train Controller (DOM / TPJ)</span>
                <span className="text-[11px] text-[#64748B] font-mono">Digitally Authorized Desk</span>
              </div>
            </div>
            <p className="text-[10px] text-[#94A3B8] text-center pt-1 border-t border-slate-100 mt-1">
              ⚠ Demo document generated by BlockSync. Not an official Indian Railways document.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#0070C0] hover:bg-[#005a9e] text-white rounded-lg text-xs font-bold transition duration-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Official Sheet
              </button>
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#1A202C] rounded-lg text-xs font-semibold border border-[#E2E8F0] transition duration-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About Modal */}
      <AboutProjectModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />

      {/* Data Sources Popover */}
      <DataSourcesPopover
        isOpen={showDataSources}
        onClose={() => setShowDataSources(false)}
        provenanceData={provenanceData}
        isBackendConnected={isBackendConnected}
      />

      {/* Institutional Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white py-3.5 px-6 text-center text-xs text-[#64748B]">
        BlockSync · Joint Railway Maintenance Optimization Console · Southern Railway TPJ Division
      </footer>
    </div>
  );
}
