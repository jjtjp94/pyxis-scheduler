import React, { useState, useMemo, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import {
  ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// ─── FALLBACK DATA (used when no CSV is loaded) ──────────────────────────────
const FALLBACK_DATA = [
  { id: '3CDU',   median: 6.8,  p85: 10, max: 15.2,  group: 'South' },
  { id: '3NE',    median: 14.3, p85: 19, max: 24.0,  group: 'North' },
  { id: '3NSCCT', median: 22.3, p85: 30, max: 141.3, group: 'SCCT'  },
  { id: '3NW',    median: 7.9,  p85: 11, max: 16.6,  group: 'North' },
  { id: '3SE',    median: 32.4, p85: 40, max: 42.6,  group: 'South' },
  { id: '3SSCCT', median: 24.2, p85: 38, max: 121.2, group: 'SCCT'  },
  { id: '3SW',    median: 31.1, p85: 39, max: 50.3,  group: 'South' },
  { id: '4NE',    median: 26.3, p85: 32, max: 101.1, group: 'North' },
  { id: '4NSCCT', median: 21.0, p85: 30, max: 76.2,  group: 'SCCT'  },
  { id: '4NW',    median: 24.1, p85: 29, max: 38.6,  group: 'North' },
  { id: '4SE',    median: 29.0, p85: 33, max: 60.0,  group: 'South' },
  { id: '4SW',    median: 28.5, p85: 35, max: 51.7,  group: 'South' },
  { id: '5NE',    median: 26.6, p85: 33, max: 47.2,  group: 'North' },
  { id: '5NSCCT', median: 21.4, p85: 32, max: 73.9,  group: 'SCCT'  },
  { id: '5NW',    median: 26.9, p85: 32, max: 37.0,  group: 'North' },
  { id: '5SE',    median: 28.0, p85: 37, max: 43.4,  group: 'South' },
  { id: '5SSCCT', median: 21.0, p85: 29, max: 41.0,  group: 'SCCT'  },
  { id: '5SW',    median: 26.5, p85: 33, max: 40.1,  group: 'South' },
  { id: '6ICU',   median: 5.2,  p85: 7,  max: 10.0,  group: 'South' },
  { id: '6NE',    median: 23.2, p85: 31, max: 41.2,  group: 'North' },
  { id: '6NSCCT', median: 23.9, p85: 35, max: 50.1,  group: 'SCCT'  },
  { id: '6NW',    median: 26.5, p85: 34, max: 77.3,  group: 'North' },
  { id: '6SE',    median: 23.7, p85: 31, max: 52.2,  group: 'South' },
  { id: '6SSCCT', median: 28.7, p85: 42, max: 47.7,  group: 'SCCT'  },
  { id: '6SW',    median: 21.8, p85: 28, max: 30.4,  group: 'South' },
  { id: '7NE',    median: 27.1, p85: 32, max: 87.8,  group: 'North' },
  { id: '7NSCCT', median: 20.5, p85: 30, max: 404.9, group: 'SCCT'  },
  { id: '7NW',    median: 25.0, p85: 29, max: 40.9,  group: 'North' },
  { id: '7SE',    median: 27.2, p85: 34, max: 42.6,  group: 'South' },
  { id: '7SSCCT', median: 20.1, p85: 31, max: 367.8, group: 'SCCT'  },
  { id: '7SW',    median: 27.8, p85: 35, max: 44.9,  group: 'South' },
  { id: '8NE',    median: 22.4, p85: 27, max: 40.6,  group: 'North' },
  { id: '8NSCCT', median: 18.7, p85: 28, max: 95.0,  group: 'SCCT'  },
  { id: '8NW',    median: 19.9, p85: 26, max: 44.9,  group: 'North' },
  { id: '8SE',    median: 21.9, p85: 27, max: 33.4,  group: 'South' },
  { id: '8SSCCT', median: 18.0, p85: 27, max: 403.8, group: 'SCCT'  },
  { id: '8SW',    median: 21.1, p85: 26, max: 46.1,  group: 'South' },
];

const GROUP_COLORS  = { North: '#3b82f6', South: '#ef4444', SCCT: '#a855f7', Other: '#64748b' };
const GROUP_LIGHT   = { North: '#dbeafe', South: '#fee2e2', SCCT: '#f3e8ff', Other: '#f1f5f9' };
const GROUP_BORDER  = { North: '#93c5fd', South: '#fca5a5', SCCT: '#d8b4fe', Other: '#cbd5e1' };
const GROUP_TEXT    = { North: '#1d4ed8', South: '#b91c1c', SCCT: '#7e22ce', Other: '#475569' };
const DEVICE_PALETTE = [
  '#3b82f6','#ef4444','#a855f7','#22c55e','#f59e0b',
  '#14b8a6','#f97316','#8b5cf6','#ec4899','#06b6d4',
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const parseSessionMinutes = (str) => {
  if (!str) return 0;
  const p = str.trim().split(':').map(Number);
  if (p.length === 3) return p[0] * 60 + p[1] + p[2] / 60;
  if (p.length === 2) return p[0] + p[1] / 60;
  return 0;
};

const parseDateKey = (str) => {
  if (!str) return null;
  const d = str.trim().split(' ')[0];
  const parts = d.split('/');
  if (parts.length !== 3) return null;
  const [m, day, y] = parts;
  return `${y}-${m.padStart(2,'0')}-${day.padStart(2,'0')}`;
};

const fmtLabel = (key) => {
  if (!key) return '';
  const [, m, d] = key.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
};

const deriveGroup = (id) => {
  const u = (id || '').toUpperCase();
  if (u.includes('SCCT')) return 'SCCT';
  if (u.includes('ICU') || u.includes('CDU')) return 'South';
  if (/\d(NE|NW)$/.test(u)) return 'North';
  if (/\d(SE|SW)$/.test(u)) return 'South';
  return 'Other';
};

const pctOf = (sorted, p) => {
  if (!sorted.length) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
};

const calculateTime = (unit, pct) => {
  if (pct <= 50) return Math.round(unit.median);
  if (pct <= 85) return Math.round(unit.median + ((pct - 50) / 35) * (unit.p85 - unit.median));
  return Math.round(unit.p85 + ((pct - 85) / 15) * (unit.max - unit.p85));
};

const computeDeviceStats = (rows) => {
  // Build daily session totals per device, then find median/p85/max of those totals.
  // This gives "how long to refill this device on a typical/busy/worst day."
  const deviceDaily = {};
  rows.forEach(r => {
    if (!deviceDaily[r.device]) deviceDaily[r.device] = {};
    deviceDaily[r.device][r.dateKey] = (deviceDaily[r.device][r.dateKey] || 0) + r.sessionMinutes;
  });
  return Object.entries(deviceDaily).map(([id, daily]) => {
    const sorted = Object.values(daily).sort((a, b) => a - b);
    return {
      id,
      median: parseFloat(pctOf(sorted, 50).toFixed(1)),
      p85:    parseFloat(pctOf(sorted, 85).toFixed(1)),
      max:    parseFloat(sorted[sorted.length - 1].toFixed(1)),
      group:  deriveGroup(id),
    };
  });
};

const processCSVData = (papaResults) => {
  const rows = [];
  papaResults.data.forEach(row => {
    if ((row['MedClass'] || '').trim() !== 'Non-CS Med') return;
    const dateKey = parseDateKey((row['TransactionDateTime'] || '').trim());
    if (!dateKey) return;
    const device = (row['Device'] || '').trim();
    if (!device) return;
    rows.push({
      device,
      dateKey,
      sessionMinutes: parseSessionMinutes((row['SessionLength'] || '').trim()),
      isCancelled: (row['TransactionType'] || '').trim() === 'Refill CANCELLED',
    });
  });
  return rows;
};

// ─── ICONS ───────────────────────────────────────────────────────────────────

const IconSettings = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const IconPlay = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);

const IconPresentation = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/>
  </svg>
);

const IconDatabase = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>
  </svg>
);

const IconChart = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);

const IconUpload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

const IconClose = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label, metric }) => {
  if (!active || !payload || !payload.length) return null;
  const unit = metric === 'volume' ? ' refills' : ' min';
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm text-xs min-w-[160px]">
      <p className="font-bold text-slate-700 mb-2 text-sm">{label}</p>
      {payload.map(entry => (
        <div key={entry.dataKey} className="flex justify-between gap-4 mb-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: entry.fill || entry.color }} />
            {entry.dataKey}
          </span>
          <span className="font-semibold text-slate-800">
            {typeof entry.value === 'number' ? entry.value.toFixed(metric === 'volume' ? 0 : 1) : entry.value}{unit}
          </span>
        </div>
      ))}
    </div>
  );
};

const InterruptionTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm text-xs">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map(entry => (
        <div key={entry.dataKey} className="flex justify-between gap-4">
          <span>{entry.dataKey}</span>
          <span className="font-semibold">{entry.value} cancellations</span>
        </div>
      ))}
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  // ── Core state
  const [activeTab, setActiveTab]       = useState('scheduler');
  const [percentile, setPercentile]     = useState(85);
  const [showSummary, setShowSummary]   = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [loadError, setLoadError]       = useState('');
  const [pasteText, setPasteText]       = useState('');
  const [activeLoadTab, setActiveLoadTab] = useState('paste');
  const fileInputRef = useRef(null);

  // ── Data segments (each represents one loaded CSV batch)
  const [segments, setSegments] = useState([]);

  // ── Analytics state
  const [viewMode, setViewMode]             = useState('group');   // 'group' | 'device'
  const [activeMetric, setActiveMetric]     = useState('session'); // 'session' | 'volume'
  const [selectedDevices, setSelectedDevices] = useState(new Set());
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd]     = useState('');

  // ── Scheduler state
  const [assignments, setAssignments] = useState({
    unassigned: [], tech1: [], tech2: [], tech3: [], tech4: [],
  });
  const [settings, setSettings] = useState({
    shiftMinutes: 600, lunchMinutes: 45, cartCapacity: 4,
    reloadPenalty: 18, travelPerUnit: 5,
  });
  const [draggedId, setDraggedId]       = useState(null);
  const [sourceColumn, setSourceColumn] = useState(null);

  // ── Derived: all rows from all segments
  const allRows = useMemo(() => segments.flatMap(s => s.rows), [segments]);

  // ── Derived: device stats for scheduler (from CSV if loaded, else fallback)
  const liveDeviceData = useMemo(() => {
    if (!allRows.length) return FALLBACK_DATA;
    return computeDeviceStats(allRows);
  }, [allRows]);

  // ── Derived: extent of loaded dates
  const dateExtent = useMemo(() => {
    if (!allRows.length) return { min: '', max: '' };
    const dates = [...new Set(allRows.map(r => r.dateKey))].sort();
    return { min: dates[0], max: dates[dates.length - 1] };
  }, [allRows]);

  // ── Initialize date range when data loads
  const prevExtentRef = useRef({ min: '', max: '' });
  useMemo(() => {
    if (dateExtent.min && dateExtent.min !== prevExtentRef.current.min) {
      setDateStart(prev => prev || dateExtent.min);
      setDateEnd(prev => prev || dateExtent.max);
      prevExtentRef.current = dateExtent;
    }
  }, [dateExtent]);

  // ── Derived: rows filtered by date range
  const filteredRows = useMemo(() => {
    if (!allRows.length) return [];
    return allRows.filter(r => {
      if (dateStart && r.dateKey < dateStart) return false;
      if (dateEnd   && r.dateKey > dateEnd)   return false;
      return true;
    });
  }, [allRows, dateStart, dateEnd]);

  // ── Derived: all unique devices in filtered rows, sorted
  const allDevices = useMemo(() => {
    const s = new Set(filteredRows.map(r => r.device));
    return [...s].sort();
  }, [filteredRows]);

  // ── Derived: all sorted dates in filtered range
  const allDates = useMemo(() => {
    const s = new Set(filteredRows.map(r => r.dateKey));
    return [...s].sort();
  }, [filteredRows]);

  // ── Derived: which devices to show in device view
  const visibleDevices = useMemo(() => {
    if (selectedDevices.size === 0) return allDevices.slice(0, 8);
    return allDevices.filter(d => selectedDevices.has(d));
  }, [selectedDevices, allDevices]);

  // ── Derived: per-device, per-day aggregates
  const deviceDayMap = useMemo(() => {
    // { device: { dateKey: { vol, session, cancel } } }
    const map = {};
    filteredRows.forEach(r => {
      if (!map[r.device]) map[r.device] = {};
      if (!map[r.device][r.dateKey]) map[r.device][r.dateKey] = { vol: 0, session: 0, cancel: 0 };
      map[r.device][r.dateKey].vol++;
      map[r.device][r.dateKey].session += r.sessionMinutes;
      if (r.isCancelled) map[r.device][r.dateKey].cancel++;
    });
    return map;
  }, [filteredRows]);

  // ── Derived: chart data (one object per date)
  const chartData = useMemo(() => {
    if (!allDates.length) return [];
    const step = allDates.length > 60 ? 7 : allDates.length > 30 ? 3 : 1;
    return allDates.map((date, i) => {
      const point = { date: fmtLabel(date), fullDate: date, _showLabel: i % step === 0 };

      if (viewMode === 'group') {
        const groups = { North: 0, South: 0, SCCT: 0, Other: 0 };
        const gCancel = { North: 0, South: 0, SCCT: 0, Other: 0 };
        allDevices.forEach(device => {
          const day = deviceDayMap[device]?.[date];
          if (!day) return;
          const g = deriveGroup(device);
          groups[g] += activeMetric === 'session' ? day.session : day.vol;
          gCancel[g] += day.cancel;
        });
        Object.assign(point, groups);
        point.North_cancel = gCancel.North;
        point.South_cancel = gCancel.South;
        point.SCCT_cancel  = gCancel.SCCT;
        point.total_cancel = gCancel.North + gCancel.South + gCancel.SCCT + gCancel.Other;
      } else {
        visibleDevices.forEach(device => {
          const day = deviceDayMap[device]?.[date];
          point[device]            = day ? (activeMetric === 'session' ? parseFloat(day.session.toFixed(1)) : day.vol) : 0;
          point[`${device}_cancel`] = day ? day.cancel : 0;
        });
        point.total_cancel = visibleDevices.reduce((s, d) => s + (deviceDayMap[d]?.[date]?.cancel || 0), 0);
      }

      return point;
    });
  }, [allDates, allDevices, visibleDevices, deviceDayMap, viewMode, activeMetric]);

  // ── Derived: summary stats
  const summaryStats = useMemo(() => {
    if (!filteredRows.length) return { totalVol: 0, pctDailySession: 0, totalCancel: 0 };

    const totalVol    = filteredRows.length;
    const totalCancel = filteredRows.filter(r => r.isCancelled).length;

    // Compute daily session totals across all devices, find Xth percentile
    const byDay = {};
    filteredRows.forEach(r => {
      byDay[r.dateKey] = (byDay[r.dateKey] || 0) + r.sessionMinutes;
    });
    const sortedDailyTotals = Object.values(byDay).sort((a, b) => a - b);
    const pctDailySession = pctOf(sortedDailyTotals, percentile);

    return { totalVol, pctDailySession, totalCancel };
  }, [filteredRows, percentile]);

  // ─── DATA LOADING ──────────────────────────────────────────────────────────

  const loadCSVText = useCallback((text, name) => {
    setIsLoading(true);
    setLoadError('');
    setTimeout(() => {
      try {
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        if (!result.data.length) {
          setLoadError('No rows found. Check that the file has data.');
          setIsLoading(false);
          return;
        }
        const rows = processCSVData(result);
        if (!rows.length) {
          setLoadError('No Non-CS Med rows found after filtering. Check the MedClass column.');
          setIsLoading(false);
          return;
        }
        const dates = rows.map(r => r.dateKey).sort();
        const segment = {
          id: Date.now(),
          name: name || `Batch ${segments.length + 1}`,
          rowCount: rows.length,
          minDate: dates[0],
          maxDate: dates[dates.length - 1],
          rows,
        };
        setSegments(prev => [...prev, segment]);
        setPasteText('');
        setShowDataModal(false);
        setActiveTab('analytics');
      } catch (e) {
        setLoadError('Parse error: ' + e.message);
      }
      setIsLoading(false);
    }, 50);
  }, [segments.length]);

  const handleFileLoad = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => loadCSVText(ev.target.result, file.name);
    reader.readAsText(file);
    e.target.value = '';
  }, [loadCSVText]);

  const handlePasteLoad = useCallback(() => {
    if (!pasteText.trim()) {
      setLoadError('Paste some CSV text first.');
      return;
    }
    loadCSVText(pasteText, 'Pasted data');
  }, [pasteText, loadCSVText]);

  const deleteSegment = useCallback((id) => {
    setSegments(prev => prev.filter(s => s.id !== id));
  }, []);

  // ─── SCHEDULER LOGIC ──────────────────────────────────────────────────────

  const getUnitData = useCallback((id) => {
    const unit = liveDeviceData.find(u => u.id === id) || FALLBACK_DATA.find(u => u.id === id) || { id, median: 10, p85: 20, max: 30, group: 'Other' };
    return { ...unit, currentTime: calculateTime(unit, percentile) };
  }, [liveDeviceData, percentile]);

  const getColorClass = (group) => {
    const colors = {
      North: 'bg-blue-50 border-blue-200 text-blue-900',
      South: 'bg-red-50 border-red-200 text-red-900',
      SCCT:  'bg-purple-50 border-purple-200 text-purple-900',
      Other: 'bg-gray-50 border-gray-200 text-gray-900',
    };
    return colors[group] || colors.Other;
  };

  const calculateMetrics = (unitIds) => {
    const units = unitIds.map(getUnitData);
    const activeFillTime = units.reduce((sum, u) => sum + u.currentTime, 0);
    const numUnits = units.length;
    const trips = Math.ceil(numUnits / settings.cartCapacity);
    const reloadTime = trips > 1 ? (trips - 1) * settings.reloadPenalty : 0;
    const travelTime = numUnits * settings.travelPerUnit;
    const totalCommitted = activeFillTime + reloadTime + travelTime + settings.lunchMinutes;
    const bufferRemaining = settings.shiftMinutes - totalCommitted;
    return { activeFillTime, numUnits, trips, reloadTime, travelTime, totalCommitted, bufferRemaining };
  };

  const loadOptionA = () => setAssignments({
    unassigned: [],
    tech1: ['3NW','3NE','3NSCCT','3SSCCT','4NW','4NE','4NSCCT','5NW','5NE','5NSCCT','5SSCCT'],
    tech2: ['6NW','6NE','6NSCCT','6SSCCT','7NW','7NE','7NSCCT','7SSCCT','8NW','8NE','8NSCCT','8SSCCT'],
    tech3: ['3SW','3SE','3CDU','4SW','4SE','5SW','5SE'],
    tech4: ['6SW','6SE','6ICU','7SW','7SE','8SW','8SE'],
  });

  const loadOptionB = () => setAssignments({
    unassigned: [],
    tech1: ['3NW','3NE','4NW','4NE','5NW','5NE','6NW','6NE','7NW','7NE','8NW','8NE'],
    tech2: ['3NSCCT','3SSCCT','4NSCCT','5NSCCT','5SSCCT','6NSCCT','6SSCCT','7NSCCT','7SSCCT','8NSCCT','8SSCCT'],
    tech3: ['3SW','3SE','3CDU','4SW','4SE','5SW','5SE'],
    tech4: ['6SW','6SE','6ICU','7SW','7SE','8SW','8SE'],
  });

  const clearAll = () => setAssignments({
    unassigned: liveDeviceData.map(u => u.id),
    tech1: [], tech2: [], tech3: [], tech4: [],
  });

  const handleDragStart = (e, id, sourceKey) => {
    setDraggedId(id);
    setSourceColumn(sourceKey);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e, targetKey) => {
    e.preventDefault();
    if (!draggedId || sourceColumn === targetKey) return;
    setAssignments(prev => ({
      ...prev,
      [sourceColumn]: prev[sourceColumn].filter(id => id !== draggedId),
      [targetKey]:    [...prev[targetKey], draggedId],
    }));
    setDraggedId(null);
    setSourceColumn(null);
  };

  const updateSetting = (key, val) =>
    setSettings(prev => ({ ...prev, [key]: Number(val) }));

  // ─── SUBCOMPONENTS ────────────────────────────────────────────────────────

  const Column = ({ title, columnKey, unitIds }) => {
    const metrics = calculateMetrics(unitIds);
    const isOverworked = metrics.bufferRemaining < 30;
    const fillPct   = Math.min((metrics.activeFillTime / settings.shiftMinutes) * 100, 100);
    const travelPct = Math.min(((metrics.travelTime + metrics.reloadTime) / settings.shiftMinutes) * 100, 100);
    const lunchPct  = (settings.lunchMinutes / settings.shiftMinutes) * 100;

    return (
      <div
        className={`flex-1 min-w-[260px] bg-white p-4 rounded-xl border-2 flex flex-col ${isOverworked ? 'border-red-400' : 'border-slate-200'}`}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, columnKey)}
      >
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-slate-800 text-lg">{title}</h2>
          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-sm font-semibold border border-slate-200">
            {metrics.numUnits} Units
          </span>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1 font-medium">
            <span>Shift Load ({settings.shiftMinutes / 60}h)</span>
            <span className={isOverworked ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>
              {metrics.bufferRemaining}m Buffer
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full flex overflow-hidden border border-slate-200">
            <div className="bg-blue-500 h-full transition-all"  style={{ width: `${fillPct}%` }} />
            <div className="bg-amber-400 h-full transition-all" style={{ width: `${travelPct}%` }} />
            <div className="bg-green-500 h-full transition-all" style={{ width: `${lunchPct}%` }} />
            {isOverworked && <div className="bg-red-500 h-full" style={{ width: '100%' }} />}
          </div>
        </div>

        <div className="text-xs text-slate-600 mb-4 bg-slate-50 p-2.5 rounded border border-slate-100 grid grid-cols-2 gap-2">
          <div>Task: <strong className="text-slate-800">{metrics.activeFillTime}m</strong></div>
          <div>Travel/Reload: <strong className="text-slate-800">{metrics.travelTime + metrics.reloadTime}m</strong></div>
        </div>

        <div className="space-y-2 flex-1 overflow-y-auto min-h-[150px] pr-1">
          {unitIds.map(id => {
            const unit = getUnitData(id);
            return (
              <div
                key={id}
                draggable
                onDragStart={(e) => handleDragStart(e, id, columnKey)}
                className={`p-2 border rounded cursor-grab active:cursor-grabbing flex justify-between items-center transition-transform hover:-translate-y-0.5 ${getColorClass(unit.group)}`}
              >
                <span className="font-bold text-sm">{unit.id}</span>
                <span className="text-xs font-semibold bg-white px-1.5 py-0.5 rounded shadow-sm">
                  {unit.currentTime}m
                </span>
              </div>
            );
          })}
          {unitIds.length === 0 && (
            <div className="text-slate-400 text-center text-sm py-8 border-2 border-dashed border-slate-200 rounded">
              Drop units here
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  const hasData = allRows.length > 0;
  const isUsingLiveData = hasData;

  // Build chart bar keys
  const groupKeys   = ['North', 'South', 'SCCT'];
  const cancelKeys  = viewMode === 'group'
    ? ['North_cancel', 'South_cancel', 'SCCT_cancel']
    : visibleDevices.map(d => `${d}_cancel`);

  const xAxisTickFormatter = (val, i) => {
    const point = chartData[i];
    return point?._showLabel ? val : '';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">

      {/* ─── HEADER ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 pt-6 px-6">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex justify-between items-end mb-5">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Pyxis Strategy Center</h1>
              <p className="text-slate-500 mt-1 text-sm">
                {isUsingLiveData
                  ? `Live data: ${allRows.length.toLocaleString()} transactions from ${fmtLabel(dateExtent.min)} to ${fmtLabel(dateExtent.max)}`
                  : 'No CSV loaded. Scheduler is running on baseline data.'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDataModal(true)}
                className="flex items-center gap-2 bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-200 transition"
              >
                <IconUpload /> Load Data
              </button>
              <button
                onClick={() => setShowSummary(true)}
                className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-700 transition"
              >
                <IconPresentation /> Executive Summary
              </button>
            </div>
          </div>

          <div className="flex gap-6">
            {[
              { key: 'scheduler', label: 'Routing & Simulation', icon: <IconSettings /> },
              { key: 'analytics', label: 'Analytics',           icon: <IconChart />    },
              { key: 'data',      label: 'Data Engine',          icon: <IconDatabase /> },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 font-semibold text-sm flex items-center gap-2 transition-colors border-b-2 ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-screen-xl w-full mx-auto p-6">

        {/* ─── SCHEDULER TAB ──────────────────────────────────────────────── */}
        {activeTab === 'scheduler' && (
          <div className="space-y-5">
            {isUsingLiveData && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-sm text-emerald-800 font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Scheduler is using live CSV data. Times reflect actual daily session totals.
              </div>
            )}

            {/* Assumptions bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap gap-6 items-center">
              <div className="font-bold text-xs text-slate-500 uppercase tracking-wider mr-2">Assumptions</div>
              {[
                { label: 'Shift (m)',        key: 'shiftMinutes',  w: 'w-16' },
                { label: 'Lunch (m)',        key: 'lunchMinutes',  w: 'w-14' },
                { label: 'Cart Size',        key: 'cartCapacity',  w: 'w-14' },
                { label: 'Reload Pen. (m)',  key: 'reloadPenalty', w: 'w-14' },
                { label: 'Travel/Unit (m)',  key: 'travelPerUnit', w: 'w-14' },
              ].map(({ label, key, w }) => (
                <div key={key} className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 font-medium">{label}</label>
                  <input
                    type="number"
                    value={settings[key]}
                    onChange={e => updateSetting(key, e.target.value)}
                    className={`${w} p-1 border rounded text-sm text-center font-semibold bg-slate-50`}
                  />
                </div>
              ))}

              <div className="ml-auto flex items-center gap-3">
                <label className="text-xs text-slate-500 font-medium">Percentile</label>
                <input
                  type="range" min="50" max="100" value={percentile}
                  onChange={e => setPercentile(Number(e.target.value))}
                  className="w-32 accent-blue-600"
                />
                <span className="font-bold text-blue-700 text-sm w-12">{percentile}th</span>
              </div>
            </div>

            {/* Preset buttons */}
            <div className="flex justify-between items-center">
              <div className="flex gap-3">
                <button onClick={loadOptionA} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-100 transition">
                  <IconPlay /> Load Option A (Bridge)
                </button>
                <button onClick={loadOptionB} className="flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-100 transition">
                  <IconPlay /> Load Option B (Silos)
                </button>
              </div>
              <button onClick={clearAll} className="text-slate-500 hover:text-red-600 text-sm font-medium underline">
                Clear Board
              </button>
            </div>

            {/* Columns */}
            <div className="flex gap-4 overflow-x-auto pb-4 items-start">
              <Column title="Tech 1" columnKey="tech1" unitIds={assignments.tech1} />
              <Column title="Tech 2" columnKey="tech2" unitIds={assignments.tech2} />
              <Column title="Tech 3" columnKey="tech3" unitIds={assignments.tech3} />
              <Column title="Tech 4" columnKey="tech4" unitIds={assignments.tech4} />
              <div className="border-l-2 border-slate-200 pl-4 border-dashed">
                <Column title="Unassigned" columnKey="unassigned" unitIds={assignments.unassigned} />
              </div>
            </div>
          </div>
        )}

        {/* ─── ANALYTICS TAB ──────────────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <div className="space-y-5">
            {!hasData ? (
              <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
                <div className="text-4xl mb-4">📊</div>
                <h2 className="text-xl font-bold text-slate-700 mb-2">No data loaded</h2>
                <p className="text-slate-500 mb-6 text-sm">Load a CSV to see analytics.</p>
                <button
                  onClick={() => setShowDataModal(true)}
                  className="bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-700 transition"
                >
                  Load Data
                </button>
              </div>
            ) : (
              <>
                {/* ── Controls ── */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap gap-5 items-center">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 font-medium">From</label>
                    <input
                      type="date" value={dateStart} min={dateExtent.min} max={dateExtent.max}
                      onChange={e => setDateStart(e.target.value)}
                      className="border border-slate-200 rounded px-2 py-1 text-sm bg-slate-50"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 font-medium">To</label>
                    <input
                      type="date" value={dateEnd} min={dateExtent.min} max={dateExtent.max}
                      onChange={e => setDateEnd(e.target.value)}
                      className="border border-slate-200 rounded px-2 py-1 text-sm bg-slate-50"
                    />
                  </div>
                  <button
                    onClick={() => { setDateStart(dateExtent.min); setDateEnd(dateExtent.max); }}
                    className="text-xs text-blue-600 underline"
                  >
                    Reset range
                  </button>

                  <div className="ml-auto flex items-center gap-3">
                    <label className="text-xs text-slate-500 font-medium whitespace-nowrap">Percentile</label>
                    <input
                      type="range" min="50" max="100" value={percentile}
                      onChange={e => setPercentile(Number(e.target.value))}
                      className="w-28 accent-blue-600"
                    />
                    <span className="font-bold text-blue-700 text-sm w-12">{percentile}th</span>
                  </div>
                </div>

                {/* ── Summary cards ── */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Total Transactions</div>
                    <div className="text-3xl font-extrabold text-slate-800">{summaryStats.totalVol.toLocaleString()}</div>
                    <div className="text-xs text-slate-400 mt-1">Non-CS Med refills in range</div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">
                      {percentile}th Pct Daily Session
                    </div>
                    <div className="text-3xl font-extrabold text-blue-700">
                      {Math.round(summaryStats.pctDailySession).toLocaleString()}<span className="text-lg font-semibold ml-1">min</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Total across all devices at {percentile}th pct day</div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Nurse Interruptions</div>
                    <div className="text-3xl font-extrabold text-amber-600">{summaryStats.totalCancel.toLocaleString()}</div>
                    <div className="text-xs text-slate-400 mt-1">Refill CANCELLED in range</div>
                  </div>
                </div>

                {/* ── Chart controls ── */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center gap-0 border-b border-slate-200 px-4 pt-4 pb-0 flex-wrap gap-y-2">
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden mr-4 mb-4">
                      {['session', 'volume'].map(m => (
                        <button key={m}
                          onClick={() => setActiveMetric(m)}
                          className={`px-3 py-1.5 text-xs font-semibold transition ${activeMetric === m ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                        >
                          {m === 'session' ? 'Session Time (min)' : 'Volume (refills)'}
                        </button>
                      ))}
                    </div>

                    <div className="flex rounded-lg border border-slate-200 overflow-hidden mr-4 mb-4">
                      {['group', 'device'].map(m => (
                        <button key={m}
                          onClick={() => setViewMode(m)}
                          className={`px-3 py-1.5 text-xs font-semibold transition ${viewMode === m ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                        >
                          By {m === 'group' ? 'Group' : 'Device'}
                        </button>
                      ))}
                    </div>

                    {viewMode === 'device' && (
                      <div className="flex flex-wrap gap-1 mb-4 flex-1">
                        <button
                          onClick={() => setSelectedDevices(new Set())}
                          className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                          Top 8
                        </button>
                        <button
                          onClick={() => setSelectedDevices(new Set(allDevices))}
                          className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                          All
                        </button>
                        <button
                          onClick={() => setSelectedDevices(new Set())}
                          className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                          Clear
                        </button>
                        {allDevices.map(d => {
                          const g = deriveGroup(d);
                          const active = selectedDevices.has(d) || (selectedDevices.size === 0 && visibleDevices.includes(d));
                          return (
                            <button
                              key={d}
                              onClick={() => setSelectedDevices(prev => {
                                const next = new Set(prev.size ? prev : visibleDevices);
                                if (next.has(d)) next.delete(d); else next.add(d);
                                return next;
                              })}
                              className="text-xs px-2 py-1 rounded border transition font-medium"
                              style={{
                                background:   active ? GROUP_LIGHT[g]   : '#f8fafc',
                                borderColor:  active ? GROUP_BORDER[g]  : '#e2e8f0',
                                color:        active ? GROUP_TEXT[g]    : '#64748b',
                              }}
                            >
                              {d}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ── Main chart ── */}
                  <div className="p-4">
                    <p className="text-xs text-slate-400 mb-3">
                      {viewMode === 'group' ? 'Stacked by tower group.' : `Showing ${visibleDevices.length} devices.`}
                      {allDates.length > 30 ? ' X-axis labels every few days for readability.' : ''}
                    </p>
                    <ResponsiveContainer width="100%" height={320}>
                      <ComposedChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: '#94a3b8' }}
                          tickFormatter={(val, i) => xAxisTickFormatter(val, i)}
                          interval={0}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#94a3b8' }}
                          tickFormatter={v => activeMetric === 'session' ? `${Math.round(v)}m` : v}
                          width={48}
                        />
                        <Tooltip content={<CustomTooltip metric={activeMetric} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />

                        {viewMode === 'group'
                          ? groupKeys.map(g => (
                              <Bar key={g} dataKey={g} stackId="a" fill={GROUP_COLORS[g]} maxBarSize={30} />
                            ))
                          : visibleDevices.map((d, i) => (
                              <Bar key={d} dataKey={d} stackId="a" fill={DEVICE_PALETTE[i % DEVICE_PALETTE.length]} maxBarSize={30} />
                            ))
                        }
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* ── Interruptions chart ── */}
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                      Nurse Interruptions (Refill CANCELLED per day)
                    </p>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={chartData} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: '#94a3b8' }}
                          tickFormatter={(val, i) => xAxisTickFormatter(val, i)}
                          interval={0}
                        />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={32} />
                        <Tooltip content={<InterruptionTooltip />} />
                        <Bar dataKey="total_cancel" fill="#f59e0b" name="Cancellations" maxBarSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── DATA TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'data' && (
          <div className="space-y-5 max-w-4xl">

            {/* Percentile engine */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-bold mb-1">Simulation Percentile</h2>
              <p className="text-slate-500 text-sm mb-5">
                Controls the scheduler. Moving this slider updates all unit time estimates in the Routing tab.
              </p>
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-5">
                <div className="flex justify-between font-semibold text-slate-700 mb-2 text-sm">
                  <span>50th (Median day)</span>
                  <span className="text-blue-600 text-base">{percentile}th Percentile</span>
                  <span>100th (Worst day)</span>
                </div>
                <input
                  type="range" min="50" max="100" value={percentile}
                  onChange={e => setPercentile(Number(e.target.value))}
                  className="w-full h-3 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-2">
                  <span>Optimistic</span>
                  <span>Conservative (85)</span>
                  <span>Total chaos</span>
                </div>
              </div>

              {/* Device stats table */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-100 text-xs uppercase text-slate-700">
                    <tr>
                      <th className="px-4 py-3">Unit</th>
                      <th className="px-4 py-3">Group</th>
                      <th className="px-4 py-3 bg-blue-50 border-x border-blue-100">Sim. Time</th>
                      <th className="px-4 py-3">Median</th>
                      <th className="px-4 py-3">85th Pct</th>
                      <th className="px-4 py-3">Max</th>
                      <th className="px-4 py-3">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {liveDeviceData.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-bold text-slate-800">{u.id}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: GROUP_LIGHT[u.group], color: GROUP_TEXT[u.group] }}>
                            {u.group}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 bg-blue-50/50 border-x border-blue-50 font-bold text-blue-800">
                          {calculateTime(u, percentile)}m
                        </td>
                        <td className="px-4 py-2.5">{u.median}m</td>
                        <td className="px-4 py-2.5">{u.p85}m</td>
                        <td className="px-4 py-2.5 text-red-600">{u.max}m</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isUsingLiveData ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {isUsingLiveData ? 'Live CSV' : 'Baseline'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Loaded segments */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-bold">Loaded Data</h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {segments.length ? `${segments.length} batch${segments.length > 1 ? 'es' : ''}, ${allRows.length.toLocaleString()} total rows` : 'No data loaded yet.'}
                  </p>
                </div>
                <button
                  onClick={() => setShowDataModal(true)}
                  className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-700 transition"
                >
                  <IconUpload /> Load / Append
                </button>
              </div>

              {segments.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
                  <p className="text-slate-400 text-sm">No data loaded. Click Load / Append to get started.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {segments.map(seg => (
                    <div key={seg.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                      <div>
                        <span className="font-semibold text-slate-800 text-sm">{seg.name}</span>
                        <span className="text-xs text-slate-500 ml-3">
                          {fmtLabel(seg.minDate)} to {fmtLabel(seg.maxDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-500">{seg.rowCount.toLocaleString()} rows</span>
                        <button
                          onClick={() => deleteSegment(seg.id)}
                          className="text-slate-400 hover:text-red-500 transition"
                          title="Remove this batch"
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ─── DATA LOAD MODAL ────────────────────────────────────────────────── */}
      {showDataModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Load CSV Data</h2>
              <button onClick={() => { setShowDataModal(false); setLoadError(''); }} className="text-slate-400 hover:text-slate-700 transition">
                <IconClose />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-500">
                New data is <strong>appended</strong> to existing data. Use the Data Engine tab to remove individual batches.
                Only <strong>Non-CS Med</strong> rows are imported.
              </p>

              <div className="flex gap-0 rounded-lg border border-slate-200 overflow-hidden w-fit mb-1">
                {['paste', 'file'].map(t => (
                  <button key={t}
                    onClick={() => { setActiveLoadTab(t); setLoadError(''); }}
                    className={`px-4 py-2 text-sm font-semibold transition ${activeLoadTab === t ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    {t === 'paste' ? 'Paste CSV' : 'Upload File'}
                  </button>
                ))}
              </div>

              {activeLoadTab === 'paste' && (
                <div>
                  <textarea
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    placeholder="Paste CSV text here..."
                    className="w-full h-40 border border-slate-200 rounded-lg p-3 text-xs font-mono bg-slate-50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Headers required: Device, TransactionDateTime, MedClass, SessionLength, TransactionType
                  </p>
                </div>
              )}

              {activeLoadTab === 'file' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center cursor-pointer hover:bg-slate-50 transition"
                >
                  <div className="text-slate-400 text-sm">Click to select a CSV file</div>
                  <div className="text-xs text-slate-400 mt-1">Pyxis transaction export (.csv)</div>
                  <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileLoad} />
                </div>
              )}

              {loadError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm">
                  {loadError}
                </div>
              )}

              {activeLoadTab === 'paste' && (
                <button
                  onClick={handlePasteLoad}
                  disabled={isLoading || !pasteText.trim()}
                  className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-700 transition disabled:opacity-40"
                >
                  {isLoading ? 'Parsing...' : 'Import'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── EXECUTIVE SUMMARY MODAL ────────────────────────────────────────── */}
      {showSummary && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Executive Summary: Pyxis Workload Analysis</h2>
              <button onClick={() => setShowSummary(false)} className="text-slate-400 hover:text-slate-800 transition">
                <IconClose />
              </button>
            </div>
            <div className="p-6 space-y-6 text-slate-600">
              <section>
                <h3 className="text-base font-bold text-slate-800 mb-2 border-l-4 border-red-500 pl-3">
                  The South Tower Constraint
                </h3>
                <p className="text-sm leading-relaxed">
                  South Tower units require over 413 minutes of task time on a conservatively busy day at the 85th percentile.
                  A single technician cannot cover the South Tower within a 10-hour shift with mandatory breaks and cart-reload travel.
                </p>
              </section>
              <section>
                <h3 className="text-base font-bold text-slate-800 mb-2 border-l-4 border-amber-500 pl-3">
                  The Cart Reload Penalty
                </h3>
                <p className="text-sm leading-relaxed">
                  Each pharmacy return trip costs ~18 minutes. Increasing cart capacity from 4 to 6 units
                  reclaims over 1 hour of lost labor per technician per day.
                </p>
              </section>
              <section>
                <h3 className="text-base font-bold text-slate-800 mb-2 border-l-4 border-emerald-500 pl-3">
                  Strategic Options
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-sm mt-2">
                  <li><strong>Option A (Bridge):</strong> Leverages the North-to-SCCT bridge. Balances SCCT workload with North, freeing techs to split the South Tower.</li>
                  <li><strong>Option B (Silos):</strong> Eliminates cross-tower travel. Tech 1 covers all of North. Tech 2 covers all of SCCT. Techs 3 and 4 split the South Tower evenly.</li>
                </ul>
              </section>
              {isUsingLiveData && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-800">
                  <strong>Live data active:</strong> Scheduler times reflect actual daily session totals from {fmtLabel(dateExtent.min)} to {fmtLabel(dateExtent.max)}.
                  {percentile}th percentile applied.
                </div>
              )}
              {!isUsingLiveData && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
                  <strong>Baseline data active.</strong> Load a CSV to update times with live data.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
