import React, {
  useState, useMemo, useRef, useCallback, useEffect,
} from 'react';
import Papa from 'papaparse';
import {
  ComposedChart, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { BACKGROUND_DATA, BG_DATE_MIN, BG_DATE_MAX } from './bgData';
import {
  fmtLabel, deriveGroup, pctOf, calcSimTime,
  buildDeviceStats, mergeRows, filterRowsByDate, processCsvToAggRows,
  computeOutlierBounds,
  GROUP_COLOR, GROUP_LIGHT, GROUP_BORDER, GROUP_TEXT, DEVICE_PALETTE,
  ALL_DEVICE_IDS, DEFAULT_BOARD_ID, DEFAULT_BOARD, DEFAULT_SETTINGS,
} from './utils';

// ─── LOCAL STORAGE HOOK ───────────────────────────────────────────────────────

function useLocalStorage(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const v = window.localStorage.getItem(key);
      return v ? JSON.parse(v) : initialValue;
    } catch { return initialValue; }
  });
  const set = useCallback((valueOrFn) => {
    setState(prev => {
      const next = typeof valueOrFn === 'function' ? valueOrFn(prev) : valueOrFn;
      try { window.localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);
  return [state, set];
}

// ─── ICONS ────────────────────────────────────────────────────────────────────

const Ic = ({ d, size = 16, ...rest }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
    <path d={d} />
  </svg>
);
const IcSettings = (p) => <svg xmlns="http://www.w3.org/2000/svg" width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const IcChart    = (p) => <svg xmlns="http://www.w3.org/2000/svg" width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>;
const IcDatabase = (p) => <svg xmlns="http://www.w3.org/2000/svg" width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>;
const IcUpload   = (p) => <svg xmlns="http://www.w3.org/2000/svg" width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const IcDownload = (p) => <svg xmlns="http://www.w3.org/2000/svg" width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IcClose    = (p) => <svg xmlns="http://www.w3.org/2000/svg" width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcTrash    = (p) => <svg xmlns="http://www.w3.org/2000/svg" width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const IcPlus     = (p) => <svg xmlns="http://www.w3.org/2000/svg" width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcCopy     = (p) => <svg xmlns="http://www.w3.org/2000/svg" width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const IcEdit     = (p) => <svg xmlns="http://www.w3.org/2000/svg" width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcCheck    = (p) => <svg xmlns="http://www.w3.org/2000/svg" width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;

// ─── CHART TOOLTIP ────────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label, metric }) => {
  if (!active || !payload?.length) return null;
  const unit = metric === 'volume' ? ' refills' : 'm';
  const items = payload.filter(e => !String(e.dataKey).includes('cancel'));
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-md text-xs min-w-[160px]">
      <p className="font-bold text-slate-700 mb-2">{label}</p>
      {items.map(e => (
        <div key={e.dataKey} className="flex justify-between gap-4 mb-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: e.fill || e.color }} />
            {e.dataKey}
          </span>
          <span className="font-semibold">
            {typeof e.value === 'number'
              ? (metric === 'volume' ? Math.round(e.value) : e.value.toFixed(1))
              : e.value}{unit}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {

  // ── Persistent global state ───────────────────────────────────────────────
  const [percentile,    setPercentile]    = useLocalStorage('pyxis_pct',     85);
  const [dateStart,     setDateStart]     = useLocalStorage('pyxis_ds',      BG_DATE_MIN);
  const [dateEnd,       setDateEnd]       = useLocalStorage('pyxis_de',      BG_DATE_MAX);
  const [userSegments,  setUserSegments]  = useLocalStorage('pyxis_segs',    []);
  const [boards,        setBoards]        = useLocalStorage('pyxis_boards',  { [DEFAULT_BOARD_ID]: DEFAULT_BOARD });
  const [activeBoardId, setActiveBoardId] = useLocalStorage('pyxis_boardId', DEFAULT_BOARD_ID);
  const [settings,      setSettings]      = useLocalStorage('pyxis_settings',DEFAULT_SETTINGS);
  const [viewMode,      setViewMode]      = useLocalStorage('pyxis_vm',      'group');
  const [activeMetric,  setActiveMetric]  = useLocalStorage('pyxis_am',      'session');
  const [chartDevices,  setChartDevices]  = useLocalStorage('pyxis_cd',      []);
  const [outlierRemoval,setOutlierRemoval]= useLocalStorage('pyxis_outliers', false);

  // Ensure default board exists
  useEffect(() => {
    setBoards(prev => prev[DEFAULT_BOARD_ID] ? prev : { [DEFAULT_BOARD_ID]: DEFAULT_BOARD, ...prev });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Ephemeral UI state ────────────────────────────────────────────────────
  const [activeTab,        setActiveTab]        = useState('scheduler');
  const [selectedTiles,    setSelectedTiles]    = useState(new Set());
  const [lastAnchor,       setLastAnchor]        = useState(null);
  const [showDataModal,    setShowDataModal]     = useState(false);
  const [showSummary,      setShowSummary]       = useState(false);
  const [showSession,      setShowSession]       = useState(false);
  const [pasteText,        setPasteText]         = useState('');
  const [activeLoadTab,    setActiveLoadTab]     = useState('paste');
  const [loadError,        setLoadError]         = useState('');
  const [isLoading,        setIsLoading]         = useState(false);
  const [editingBoard,     setEditingBoard]      = useState(null); // { id, name }
  const fileInputRef   = useRef(null);
  const importInputRef = useRef(null);

  // ── Merged + filtered data ─────────────────────────────────────────────────
  const allRows = useMemo(() => {
    const userRows = userSegments.flatMap(s => s.rows);
    return mergeRows(BACKGROUND_DATA, userRows);
  }, [userSegments]);

  const filteredRows = useMemo(() =>
    filterRowsByDate(allRows, dateStart, dateEnd),
  [allRows, dateStart, dateEnd]);

  // effectiveRows = filteredRows with outlier device-days removed when toggle is on.
  // Everything downstream (charts, stats, summary cards, scheduler) reads from this.
  const effectiveRows = useMemo(() => {
    if (!outlierRemoval) return filteredRows;
    const bounds = computeOutlierBounds(filteredRows);
    return filteredRows.filter(r => {
      const b = bounds[r.d];
      return !b || (r.s >= b.lower && r.s <= b.upper);
    });
  }, [filteredRows, outlierRemoval]);

  // How many device-days were removed (for the filter bar label)
  const totalOutliersRemoved = useMemo(() =>
    filteredRows.length - effectiveRows.length,
  [filteredRows, effectiveRows]);

  const deviceStats = useMemo(() => buildDeviceStats(effectiveRows, false), [effectiveRows]);

  const allDevices = useMemo(() => {
    const s = new Set(effectiveRows.map(r => r.d));
    return ALL_DEVICE_IDS.filter(id => s.has(id));
  }, [effectiveRows]);

  const allDates = useMemo(() => {
    const s = new Set(effectiveRows.map(r => r.k));
    return [...s].sort();
  }, [effectiveRows]);

  const deviceDayMap = useMemo(() => {
    const map = {};
    effectiveRows.forEach(r => {
      if (!map[r.d]) map[r.d] = {};
      map[r.d][r.k] = r;
    });
    return map;
  }, [effectiveRows]);

  const visibleChartDevices = useMemo(() =>
    chartDevices.length > 0 ? allDevices.filter(d => chartDevices.includes(d)) : allDevices.slice(0, 8),
  [chartDevices, allDevices]);

  // ── Analytics: Nth pct of current view ────────────────────────────────────
  const currentViewPct = useMemo(() => {
    const devs = viewMode === 'device' && chartDevices.length > 0 ? chartDevices : allDevices;
    const byDay = {};
    devs.forEach(d => {
      Object.entries(deviceDayMap[d] || {}).forEach(([dt, r]) => {
        if (!byDay[dt]) byDay[dt] = 0;
        byDay[dt] += activeMetric === 'session' ? r.s : r.v;
      });
    });
    const sorted = Object.values(byDay).sort((a, b) => a - b);
    return pctOf(sorted, percentile);
  }, [allDevices, chartDevices, viewMode, deviceDayMap, activeMetric, percentile]);

  // ── Summary stats ──────────────────────────────────────────────────────────
  const summaryStats = useMemo(() => ({
    totalVol:    effectiveRows.reduce((s, r) => s + r.v, 0),
    totalCancel: effectiveRows.reduce((s, r) => s + r.c, 0),
  }), [effectiveRows]);

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!allDates.length) return [];
    const step = allDates.length > 60 ? 7 : allDates.length > 30 ? 3 : 1;
    return allDates.map((date, i) => {
      const p = { date: fmtLabel(date), _i: i, _showLabel: i % step === 0 };
      if (viewMode === 'group') {
        let totalCancel = 0;
        const groups = { North: 0, South: 0, SCCT: 0 };
        allDevices.forEach(d => {
          const r = deviceDayMap[d]?.[date];
          if (!r) return;
          const g = deriveGroup(d);
          if (g in groups) groups[g] += activeMetric === 'session' ? r.s : r.v;
          totalCancel += r.c;
        });
        Object.assign(p, groups, { total_cancel: totalCancel });
      } else {
        let totalCancel = 0;
        visibleChartDevices.forEach(d => {
          const r = deviceDayMap[d]?.[date];
          p[d] = r ? parseFloat((activeMetric === 'session' ? r.s : r.v).toFixed(1)) : 0;
          totalCancel += r?.c ?? 0;
        });
        p.total_cancel = totalCancel;
      }
      return p;
    });
  }, [allDates, allDevices, visibleChartDevices, deviceDayMap, viewMode, activeMetric]);

  const xTickFmt = (_v, i) => chartData[i]?._showLabel ? chartData[i].date : '';

  // ─── BOARD MANAGEMENT ──────────────────────────────────────────────────────

  const activeBoard = useMemo(() =>
    boards[activeBoardId] || boards[DEFAULT_BOARD_ID] || DEFAULT_BOARD,
  [boards, activeBoardId]);

  const updateAssignments = useCallback((fn) => {
    setBoards(prev => ({
      ...prev,
      [activeBoardId]: { ...prev[activeBoardId], assignments: fn(prev[activeBoardId].assignments) },
    }));
  }, [activeBoardId, setBoards]);

  const createBoard = useCallback(() => {
    const id   = `board_${Date.now()}`;
    const name = `Board ${Object.keys(boards).length + 1}`;
    setBoards(prev => ({ ...prev, [id]: { id, name, assignments: { ...activeBoard.assignments } } }));
    setActiveBoardId(id);
    setEditingBoard({ id, name });
  }, [boards, activeBoard, setBoards, setActiveBoardId]);

  const renameBoard = useCallback((id, name) => {
    if (name.trim()) setBoards(prev => ({ ...prev, [id]: { ...prev[id], name: name.trim() } }));
    setEditingBoard(null);
  }, [setBoards]);

  const deleteBoard = useCallback((id) => {
    const keys = Object.keys(boards);
    if (keys.length <= 1) return;
    setBoards(prev => { const n = { ...prev }; delete n[id]; return n; });
    if (activeBoardId === id) setActiveBoardId(keys.filter(k => k !== id)[0]);
  }, [boards, activeBoardId, setBoards, setActiveBoardId]);

  // ─── TILE SELECTION ────────────────────────────────────────────────────────

  const handleTileClick = useCallback((id, col, e) => {
    e.preventDefault();
    if (e.shiftKey && lastAnchor?.col === col) {
      const colIds = activeBoard.assignments[col] || [];
      const a = colIds.indexOf(lastAnchor.id), b = colIds.indexOf(id);
      if (a !== -1 && b !== -1) {
        const range = colIds.slice(Math.min(a, b), Math.max(a, b) + 1);
        setSelectedTiles(prev => { const n = new Set(prev); range.forEach(x => n.add(x)); return n; });
        return;
      }
    }
    setSelectedTiles(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    setLastAnchor({ id, col });
  }, [lastAnchor, activeBoard]);

  const handleMoveTo = useCallback((targetCol) => {
    updateAssignments(prev => {
      const next = {};
      ['tech1','tech2','tech3','tech4','unassigned'].forEach(col => {
        next[col] = (prev[col] || []).filter(id => !selectedTiles.has(id));
      });
      next[targetCol] = [...(next[targetCol] || []), ...Array.from(selectedTiles)];
      return next;
    });
    setSelectedTiles(new Set());
    setLastAnchor(null);
  }, [selectedTiles, updateAssignments]);

  const selectAllInCol = useCallback((col) => {
    const ids = activeBoard.assignments[col] || [];
    setSelectedTiles(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
  }, [activeBoard]);

  const clearSelection = useCallback(() => {
    setSelectedTiles(new Set());
    setLastAnchor(null);
  }, []);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') clearSelection(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [clearSelection]);

  // ─── COLUMN METRICS ────────────────────────────────────────────────────────

  const calcColMetrics = useCallback((unitIds) => {
    let task = 0;
    unitIds.forEach(id => {
      const s = deviceStats[id];
      if (s) task += calcSimTime(s, percentile, settings.adjustFactor);
    });
    const n       = unitIds.length;
    const trips   = Math.ceil(n / settings.cartCapacity);
    const reload  = trips > 1 ? (trips - 1) * settings.reloadPenalty : 0;
    const travel  = n * settings.travelPerUnit;
    const total   = task + reload + travel + settings.lunchMinutes;
    return { task, n, trips, reload, travel, total, buffer: settings.shiftMinutes - total };
  }, [deviceStats, percentile, settings]);

  const calcSimVol = useCallback((stat) => {
    if (!stat) return '—';
    if (percentile <= 50) return stat.volMedian;
    if (percentile <= 85) return Math.round(stat.volMedian + ((percentile-50)/35)*(stat.volP85-stat.volMedian));
    return Math.round(stat.volP85 + ((percentile-85)/15)*(stat.volMax-stat.volP85));
  }, [percentile]);

  // ─── DATA LOADING ──────────────────────────────────────────────────────────

  const loadCSVText = useCallback((text, name) => {
    setIsLoading(true);
    setLoadError('');
    setTimeout(() => {
      try {
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        const rows = processCsvToAggRows(result);
        if (!rows.length) { setLoadError('No Non-CS Med rows found.'); setIsLoading(false); return; }
        const dates = rows.map(r => r.k).sort();
        setUserSegments(prev => [...prev, {
          id: Date.now(), name: name || `Batch ${prev.length + 1}`,
          rowCount: rows.length, minDate: dates[0], maxDate: dates[dates.length - 1],
          loadedAt: new Date().toISOString(), rows,
        }]);
        setPasteText('');
        setShowDataModal(false);
      } catch (e) { setLoadError('Parse error: ' + e.message); }
      setIsLoading(false);
    }, 50);
  }, [setUserSegments]);

  const handleFileLoad = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => loadCSVText(ev.target.result, file.name);
    reader.readAsText(file);
    e.target.value = '';
  }, [loadCSVText]);

  // ─── SESSION EXPORT / IMPORT ───────────────────────────────────────────────

  const handleExport = useCallback(() => {
    // Build the set of device+date keys that are already in BACKGROUND_DATA.
    // Any userSegment rows that overlap those keys are redundant — strip them
    // so importing never re-introduces the same data as a duplicate segment.
    const bgKeys = new Set(BACKGROUND_DATA.map(r => `${r.d}|${r.k}`));

    const cleanedSegments = userSegments
      .map(seg => ({
        ...seg,
        rows: seg.rows.filter(r => !bgKeys.has(`${r.d}|${r.k}`)),
      }))
      .filter(seg => seg.rows.length > 0);   // drop segments that were 100% background data

    const blob = new Blob([JSON.stringify({
      version: 3, exportedAt: new Date().toISOString(),
      percentile, dateStart, dateEnd,
      userSegments: cleanedSegments,
      boards, activeBoardId, settings, viewMode, activeMetric, chartDevices,
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `pyxis-session-${new Date().toISOString().slice(0,10)}.json`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }, [percentile, dateStart, dateEnd, userSegments, boards, activeBoardId, settings, viewMode, activeMetric, chartDevices]);

  const handleImport = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        if (!d.version) throw new Error('Not a valid session file.');

        // Safety net: strip any imported segment rows that duplicate BACKGROUND_DATA,
        // regardless of which version exported them.
        const bgKeys = new Set(BACKGROUND_DATA.map(r => `${r.d}|${r.k}`));
        const safeSegments = (d.userSegments || [])
          .map(seg => ({
            ...seg,
            rows: seg.rows.filter(r => !bgKeys.has(`${r.d}|${r.k}`)),
          }))
          .filter(seg => seg.rows.length > 0);

        if (d.percentile   != null) setPercentile(d.percentile);
        if (d.dateStart)            setDateStart(d.dateStart);
        if (d.dateEnd)              setDateEnd(d.dateEnd);
        setUserSegments(safeSegments);
        if (d.boards)               setBoards(d.boards);
        if (d.activeBoardId)        setActiveBoardId(d.activeBoardId);
        if (d.settings)             setSettings(d.settings);
        if (d.viewMode)             setViewMode(d.viewMode);
        if (d.activeMetric)         setActiveMetric(d.activeMetric);
        if (d.chartDevices)         setChartDevices(d.chartDevices);
        setShowSession(false);
      } catch (err) { alert('Failed to load session: ' + err.message); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [setPercentile, setDateStart, setDateEnd, setUserSegments, setBoards, setActiveBoardId, setSettings, setViewMode, setActiveMetric, setChartDevices]);

  // ─── HELPERS ───────────────────────────────────────────────────────────────

  const updateSetting = useCallback((k, v) => setSettings(p => ({ ...p, [k]: Number(v) })), [setSettings]);
  const hasSelection  = selectedTiles.size > 0;
  const nSel          = selectedTiles.size;

  // ─── SCHEDULER COLUMN COMPONENT ───────────────────────────────────────────

  const SchedulerColumn = ({ title, colKey }) => {
    const unitIds  = activeBoard.assignments[colKey] || [];
    const m        = calcColMetrics(unitIds);
    const isOver   = m.buffer < 30;
    const isUnasn  = colKey === 'unassigned';
    const fillPct  = Math.min((m.task  / settings.shiftMinutes) * 100, 100);
    const travPct  = Math.min(((m.travel + m.reload) / settings.shiftMinutes) * 100, 100);
    const lunPct   = (settings.lunchMinutes / settings.shiftMinutes) * 100;

    return (
      <div className={`flex flex-col min-w-[230px] flex-1 bg-white p-4 rounded-xl border-2
        ${isOver ? 'border-red-400' : isUnasn ? 'border-dashed border-slate-300' : 'border-slate-200'}`}>

        <div className="flex justify-between items-center mb-2">
          <h2 className="font-bold text-slate-800">{title}</h2>
          <div className="flex items-center gap-2">
            {hasSelection && (
              <button onClick={() => selectAllInCol(colKey)}
                className="text-xs text-blue-600 underline whitespace-nowrap">+All</button>
            )}
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-semibold border border-slate-200">
              {unitIds.length}
            </span>
          </div>
        </div>

        {!isUnasn && (
          <>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{settings.shiftMinutes / 60}h shift</span>
              <span className={isOver ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>
                {m.buffer}m buffer
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full flex overflow-hidden border border-slate-200 mb-2.5">
              <div className="bg-blue-500 h-full transition-all"    style={{ width: `${fillPct}%` }} />
              <div className="bg-amber-400 h-full transition-all"   style={{ width: `${travPct}%` }} />
              <div className="bg-emerald-500 h-full transition-all" style={{ width: `${lunPct}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs text-slate-500 mb-2.5 bg-slate-50 rounded p-2 border border-slate-100">
              <span>Task: <strong className="text-slate-700">{m.task}m</strong></span>
              <span>Travel+Reload: <strong className="text-slate-700">{m.travel + m.reload}m</strong></span>
            </div>
          </>
        )}

        {hasSelection && (
          <button onClick={() => handleMoveTo(colKey)}
            className={`w-full mb-2 py-1.5 rounded text-xs font-bold border transition
              ${isUnasn ? 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                        : 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'}`}>
            Move {nSel} here
          </button>
        )}

        <div className="space-y-1.5 flex-1 overflow-y-auto min-h-[80px]">
          {unitIds.map(id => {
            const stat = deviceStats[id];
            const g    = stat?.group || deriveGroup(id);
            const simT = stat ? calcSimTime(stat, percentile, settings.adjustFactor) : '?';
            const simV = calcSimVol(stat);
            const sel  = selectedTiles.has(id);
            return (
              <button
                key={id}
                onClick={e => handleTileClick(id, colKey, e)}
                className={`w-full text-left px-2.5 py-2 border rounded-lg flex justify-between items-center transition-all select-none
                  ${sel ? 'ring-2 ring-blue-500 ring-offset-1 bg-blue-600 border-blue-700 text-white'
                        : 'hover:brightness-95'}`}
                style={!sel ? { background: GROUP_LIGHT[g], borderColor: GROUP_BORDER[g], color: GROUP_TEXT[g] } : {}}
              >
                <span className="font-bold text-sm">{id}</span>
                <span className={`flex items-center gap-1 text-xs font-mono ${sel ? 'text-blue-100' : ''}`}>
                  <span className={`px-1.5 py-0.5 rounded font-semibold ${sel ? 'bg-blue-500' : 'bg-white/70'}`}>
                    {simT}m
                  </span>
                  <span className={`px-1.5 py-0.5 rounded ${sel ? 'bg-blue-500/60' : 'bg-white/50'} opacity-80`}>
                    {simV}
                  </span>
                </span>
              </button>
            );
          })}
          {unitIds.length === 0 && (
            <div className="text-slate-400 text-center text-sm py-8 border-2 border-dashed border-slate-200 rounded-lg">
              {hasSelection ? 'Click "Move here"' : 'Empty'}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" style={{ fontFamily: "'Geist Sans', 'Helvetica Neue', sans-serif" }}>

      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">

        {/* Top row */}
        <div className="max-w-screen-xl mx-auto px-6 pt-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Pyxis Strategy Center</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              {fmtLabel(BG_DATE_MIN)} – {fmtLabel(BG_DATE_MAX)} baseline
              {userSegments.length > 0 && ` + ${userSegments.length} appended batch${userSegments.length > 1 ? 'es' : ''}`}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSession(true)}
              className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-200 transition">
              <IcDownload /> Session
            </button>
            <button onClick={() => setShowDataModal(true)}
              className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-200 transition">
              <IcUpload /> Load CSV
            </button>
            <button onClick={() => setShowSummary(true)}
              className="flex items-center gap-1.5 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-700 transition">
              Executive Summary
            </button>
          </div>
        </div>

        {/* Global filter bar */}
        <div className="max-w-screen-xl mx-auto px-6 py-2 flex flex-wrap items-center gap-2 mt-2 border-t border-slate-100">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider mr-1 shrink-0">Active:</span>
          <span className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-full px-2.5 py-1 text-xs font-semibold shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            {fmtLabel(dateStart)} – {fmtLabel(dateEnd)}
            {(dateStart !== BG_DATE_MIN || dateEnd !== BG_DATE_MAX) && (
              <button onClick={() => { setDateStart(BG_DATE_MIN); setDateEnd(BG_DATE_MAX); }}
                className="ml-1 text-blue-400 hover:text-blue-700">×</button>
            )}
          </span>
          <span className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-800 rounded-full px-2.5 py-1 text-xs font-semibold shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            {percentile}th pct
          </span>
          <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full px-2.5 py-1 text-xs font-semibold shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {activeBoard?.name || '—'}
          </span>
          {outlierRemoval && (
            <span className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-full px-2.5 py-1 text-xs font-semibold shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Outliers removed ({totalOutliersRemoved} device-days)
              <button onClick={() => setOutlierRemoval(false)} className="ml-1 text-rose-400 hover:text-rose-700">×</button>
            </span>
          )}
          {settings.adjustFactor !== 100 && (
            <span className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-800 rounded-full px-2.5 py-1 text-xs font-semibold shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              {settings.adjustFactor}% buffer
            </span>
          )}
          {chartDevices.length > 0 && (
            <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-full px-2.5 py-1 text-xs font-semibold shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              {chartDevices.slice(0,3).join(', ')}{chartDevices.length > 3 ? ` +${chartDevices.length-3}` : ''}
              <button onClick={() => setChartDevices([])} className="ml-1 text-amber-400 hover:text-amber-700">×</button>
            </span>
          )}
          {hasSelection && (
            <span className="flex items-center gap-1.5 bg-blue-600 text-white rounded-full px-2.5 py-1 text-xs font-semibold ml-auto shrink-0">
              {nSel} tile{nSel > 1 ? 's' : ''} selected
              <button onClick={clearSelection} className="ml-1 opacity-70 hover:opacity-100">×</button>
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-screen-xl mx-auto px-6 flex gap-6 border-t border-slate-100 mt-1">
          {[
            { key: 'scheduler', label: 'Routing & Simulation', icon: <IcSettings /> },
            { key: 'analytics', label: 'Analytics',            icon: <IcChart /> },
            { key: 'data',      label: 'Data Engine',          icon: <IcDatabase /> },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`pb-3 font-semibold text-sm flex items-center gap-1.5 border-b-2 transition-colors
                ${activeTab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-screen-xl w-full mx-auto p-6 pb-24">

        {/* ── BULK MOVE BAR ─────────────────────────────────────────────── */}
        {hasSelection && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-3 z-40 border border-slate-700 flex-wrap justify-center">
            <span className="text-sm font-semibold text-slate-300 shrink-0">
              Move {nSel} to:
            </span>
            {['tech1','tech2','tech3','tech4'].map((col, i) => (
              <button key={col} onClick={() => handleMoveTo(col)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0">
                Tech {i+1}
              </button>
            ))}
            <button onClick={() => handleMoveTo('unassigned')}
              className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0">
              Unassigned
            </button>
            <button onClick={clearSelection} className="ml-2 text-slate-400 hover:text-white transition shrink-0" title="Esc">
              <IcClose />
            </button>
          </div>
        )}

        {/* ── SCHEDULER TAB ───────────────────────────────────────────────── */}
        {activeTab === 'scheduler' && (
          <div className="space-y-4">

            {/* Assumptions */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap gap-5 items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Assumptions</span>
              {[
                { label: 'Shift (m)',       key: 'shiftMinutes',  w: 'w-16' },
                { label: 'Lunch (m)',       key: 'lunchMinutes',  w: 'w-14' },
                { label: 'Cart Size',       key: 'cartCapacity',  w: 'w-14' },
                { label: 'Reload (m)',      key: 'reloadPenalty', w: 'w-14' },
                { label: 'Travel/Unit (m)', key: 'travelPerUnit', w: 'w-14' },
              ].map(({ label, key, w }) => (
                <label key={key} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{label}</span>
                  <input type="number" value={settings[key]}
                    onChange={e => updateSetting(key, e.target.value)}
                    className={`${w} p-1 border border-slate-200 rounded text-sm text-center font-semibold bg-slate-50`} />
                </label>
              ))}

              {/* Adjustment factor */}
              <label className="flex items-center gap-2 border-l border-slate-200 pl-4">
                <span className="text-xs text-slate-500 whitespace-nowrap">Adjust %</span>
                <input type="number" min="100" max="200" step="5"
                  value={settings.adjustFactor ?? 100}
                  onChange={e => updateSetting('adjustFactor', e.target.value)}
                  className="w-16 p-1 border border-slate-200 rounded text-sm text-center font-semibold bg-slate-50" />
              </label>

              {/* Outlier removal toggle */}
              <label className="flex items-center gap-2 border-l border-slate-200 pl-4 cursor-pointer select-none">
                <span className="text-xs text-slate-500 whitespace-nowrap">Remove outliers</span>
                <button
                  type="button"
                  onClick={() => setOutlierRemoval(v => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none
                    ${outlierRemoval ? 'bg-blue-600' : 'bg-slate-200'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform
                    ${outlierRemoval ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </label>
              <label className="ml-auto flex items-center gap-3">
                <span className="text-xs text-slate-500 whitespace-nowrap">Percentile</span>
                <input type="range" min="50" max="100" value={percentile}
                  onChange={e => setPercentile(Number(e.target.value))}
                  className="w-28 accent-blue-600" />
                <span className="font-bold text-blue-700 text-sm w-10">{percentile}th</span>
              </label>
            </div>

            {/* Board selector */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide mr-1">Board:</span>
              {Object.values(boards).map(b => (
                <div key={b.id} className="flex items-center">
                  {editingBoard?.id === b.id ? (
                    <form onSubmit={e => { e.preventDefault(); renameBoard(b.id, editingBoard.name); }} className="flex gap-1">
                      <input autoFocus value={editingBoard.name}
                        onChange={e => setEditingBoard(p => ({ ...p, name: e.target.value }))}
                        onBlur={() => renameBoard(b.id, editingBoard.name)}
                        className="border border-blue-400 rounded px-2 py-1 text-xs font-semibold w-32 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      <button type="submit" className="text-blue-600"><IcCheck /></button>
                    </form>
                  ) : (
                    <button onClick={() => setActiveBoardId(b.id)}
                      className={`px-3 py-1.5 rounded-l text-xs font-semibold border transition
                        ${activeBoardId === b.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                      {b.name}
                    </button>
                  )}
                  {activeBoardId === b.id && editingBoard?.id !== b.id && (
                    <div className="flex border-t border-b border-r border-slate-200 rounded-r overflow-hidden">
                      <button onClick={() => setEditingBoard({ id: b.id, name: b.name })}
                        className="px-2 py-1.5 text-slate-400 hover:bg-slate-100 transition" title="Rename"><IcEdit /></button>
                      <button onClick={createBoard}
                        className="px-2 py-1.5 text-slate-400 hover:bg-slate-100 transition" title="Duplicate"><IcCopy /></button>
                      {Object.keys(boards).length > 1 && (
                        <button onClick={() => deleteBoard(b.id)}
                          className="px-2 py-1.5 text-red-400 hover:bg-red-50 transition" title="Delete"><IcTrash /></button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <button onClick={createBoard}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 transition">
                <IcPlus /> New Board
              </button>
            </div>

            {/* Legend + hint */}
            <div className="flex flex-wrap gap-2 text-xs items-center">
              {[['North','bg-blue-100 text-blue-800'],['South','bg-red-100 text-red-800'],['SCCT','bg-purple-100 text-purple-800']].map(([g, cls]) => (
                <span key={g} className={`px-2 py-0.5 rounded font-medium ${cls}`}>{g}</span>
              ))}
              <span className="text-slate-400 text-xs ml-1">
                Click to select. Shift+click for range within column. Esc to cancel. Tile = session min | refill vol at {percentile}th pct.
              </span>
            </div>

            {/* Columns */}
            <div className="flex gap-3 overflow-x-auto items-start">
              <SchedulerColumn title="Tech 1" colKey="tech1" />
              <SchedulerColumn title="Tech 2" colKey="tech2" />
              <SchedulerColumn title="Tech 3" colKey="tech3" />
              <SchedulerColumn title="Tech 4" colKey="tech4" />
              <div className="border-l-2 border-dashed border-slate-200 pl-3">
                <SchedulerColumn title="Unassigned" colKey="unassigned" />
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYTICS TAB ───────────────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <div className="space-y-5">

            {/* Global controls */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap gap-5 items-center">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">From</label>
                <input type="date" value={dateStart} min={BG_DATE_MIN} max={BG_DATE_MAX}
                  onChange={e => setDateStart(e.target.value)}
                  className="border border-slate-200 rounded px-2 py-1 text-sm bg-slate-50" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">To</label>
                <input type="date" value={dateEnd} min={BG_DATE_MIN} max={BG_DATE_MAX}
                  onChange={e => setDateEnd(e.target.value)}
                  className="border border-slate-200 rounded px-2 py-1 text-sm bg-slate-50" />
              </div>
              <button onClick={() => { setDateStart(BG_DATE_MIN); setDateEnd(BG_DATE_MAX); }}
                className="text-xs text-blue-600 underline">Reset</button>

              {/* Outlier toggle in analytics */}
              <label className="flex items-center gap-2 border-l border-slate-200 pl-4 cursor-pointer select-none">
                <span className="text-xs text-slate-500 whitespace-nowrap">Remove outliers</span>
                <button type="button" onClick={() => setOutlierRemoval(v => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none
                    ${outlierRemoval ? 'bg-blue-600' : 'bg-slate-200'}`}>
                  <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform
                    ${outlierRemoval ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                {outlierRemoval && (
                  <span className="text-xs text-rose-600 font-medium">{totalOutliersRemoved} device-days removed</span>
                )}
              </label>
              <label className="ml-auto flex items-center gap-3">
                <span className="text-xs text-slate-500 whitespace-nowrap">Percentile</span>
                <input type="range" min="50" max="100" value={percentile}
                  onChange={e => setPercentile(Number(e.target.value))}
                  className="w-28 accent-blue-600" />
                <span className="font-bold text-blue-700 text-sm w-10">{percentile}th</span>
              </label>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Total Transactions</div>
                <div className="text-3xl font-extrabold">{summaryStats.totalVol.toLocaleString()}</div>
                <div className="text-xs text-slate-400 mt-1">Non-CS Med in date range</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">
                  {percentile}th Pct — {activeMetric === 'session' ? 'Session Time' : 'Volume'}
                </div>
                <div className="text-3xl font-extrabold text-blue-700">
                  {activeMetric === 'session' ? `${Math.round(currentViewPct)}m` : Math.round(currentViewPct).toLocaleString()}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {viewMode === 'device' && chartDevices.length > 0
                    ? `${chartDevices.length} device${chartDevices.length > 1 ? 's' : ''} selected`
                    : 'All devices, daily total'}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Nurse Interruptions</div>
                <div className="text-3xl font-extrabold text-amber-600">{summaryStats.totalCancel.toLocaleString()}</div>
                <div className="text-xs text-slate-400 mt-1">Refill CANCELLED in range</div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 px-4 pt-4 pb-3 border-b border-slate-100">
                {/* Metric toggle */}
                <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                  {['session','volume'].map(m => (
                    <button key={m} onClick={() => setActiveMetric(m)}
                      className={`px-3 py-1.5 text-xs font-semibold transition
                        ${activeMetric === m ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                      {m === 'session' ? 'Session Time' : 'Volume'}
                    </button>
                  ))}
                </div>
                {/* View mode toggle */}
                <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                  {['group','device'].map(m => (
                    <button key={m} onClick={() => setViewMode(m)}
                      className={`px-3 py-1.5 text-xs font-semibold transition
                        ${viewMode === m ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                      By {m === 'group' ? 'Group' : 'Device'}
                    </button>
                  ))}
                </div>
                {/* Device filter (device mode only) */}
                {viewMode === 'device' && (
                  <div className="flex flex-wrap gap-1">
                    <button onClick={() => setChartDevices([])}
                      className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50">Top 8</button>
                    <button onClick={() => setChartDevices([...allDevices])}
                      className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50">All</button>
                    <button onClick={() => setChartDevices([])}
                      className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50">Clear</button>
                    {allDevices.map(d => {
                      const g      = deriveGroup(d);
                      const active = chartDevices.length === 0
                        ? allDevices.slice(0,8).includes(d)
                        : chartDevices.includes(d);
                      return (
                        <button key={d}
                          onClick={() => setChartDevices(prev => {
                            const base = prev.length ? [...prev] : [...allDevices.slice(0,8)];
                            const idx = base.indexOf(d);
                            return idx === -1 ? [...base, d] : base.filter(x => x !== d);
                          })}
                          className="text-xs px-2 py-1 rounded border transition font-medium"
                          style={{
                            background:  active ? GROUP_LIGHT[g]  : '#f8fafc',
                            borderColor: active ? GROUP_BORDER[g] : '#e2e8f0',
                            color:       active ? GROUP_TEXT[g]   : '#64748b',
                          }}>
                          {d}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-4">
                <p className="text-xs text-slate-400 mb-2">
                  Bars show raw daily totals.
                  Purple line = {percentile}th percentile ({activeMetric === 'session' ? `${Math.round(currentViewPct)}m` : Math.round(currentViewPct).toLocaleString()}).
                  Days above the line exceed your threshold.
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickFormatter={xTickFmt} interval={0} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickFormatter={v => activeMetric === 'session' ? `${Math.round(v)}m` : v}
                      width={44} />
                    <Tooltip content={<ChartTooltip metric={activeMetric} />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {viewMode === 'group'
                      ? ['North','South','SCCT'].map(g => (
                          <Bar key={g} dataKey={g} stackId="a" fill={GROUP_COLOR[g]} maxBarSize={28} />
                        ))
                      : visibleChartDevices.map((d, i) => (
                          <Bar key={d} dataKey={d} stackId="a" fill={DEVICE_PALETTE[i % DEVICE_PALETTE.length]} maxBarSize={28} />
                        ))
                    }
                    <ReferenceLine
                      y={currentViewPct}
                      stroke="#7c3aed"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      label={{
                        value: `${percentile}th pct`,
                        position: 'insideTopRight',
                        fontSize: 11,
                        fontWeight: 700,
                        fill: '#7c3aed',
                        dy: -4,
                      }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="border-t border-slate-100 px-4 pb-4 pt-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Nurse Interruptions — Refill CANCELLED per day
                </p>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={chartData} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }}
                      tickFormatter={xTickFmt} interval={0} />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} width={28} />
                    <Tooltip formatter={v => [`${v} cancellations`]} />
                    <Bar dataKey="total_cancel" name="Cancellations" fill="#f59e0b" maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── DATA ENGINE TAB ─────────────────────────────────────────────── */}
        {activeTab === 'data' && (
          <div className="space-y-5 max-w-5xl">

            {/* Sim engine */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-bold mb-1">Simulation Engine</h2>
              <p className="text-slate-500 text-sm mb-4">
                Values reflect the current date range ({fmtLabel(dateStart)} – {fmtLabel(dateEnd)}).
                Changing the range or percentile updates the Routing tab instantly.
              </p>
              <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
                <span className="text-sm font-semibold text-slate-700">Percentile</span>
                <input type="range" min="50" max="100" value={percentile}
                  onChange={e => setPercentile(Number(e.target.value))}
                  className="flex-1 accent-blue-600" />
                <span className="font-extrabold text-blue-700 text-2xl w-16 text-center">{percentile}th</span>

                <div className="border-l border-slate-200 pl-4 flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">Adjust %</span>
                  <input type="number" min="100" max="200" step="5"
                    value={settings.adjustFactor ?? 100}
                    onChange={e => updateSetting('adjustFactor', e.target.value)}
                    className="w-16 p-1.5 border border-slate-200 rounded text-sm text-center font-bold bg-white" />
                </div>

                <label className="border-l border-slate-200 pl-4 flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">Remove outliers</span>
                  <button type="button" onClick={() => setOutlierRemoval(v => !v)}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none
                      ${outlierRemoval ? 'bg-blue-600' : 'bg-slate-200'}`}>
                    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform
                      ${outlierRemoval ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                  {outlierRemoval && (
                    <span className="text-xs text-rose-600 font-semibold">{totalOutliersRemoved} device-days removed</span>
                  )}
                </label>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                    <tr>
                      <th className="px-4 py-2.5">Unit</th>
                      <th className="px-4 py-2.5">Group</th>
                      <th className="px-4 py-2.5 bg-blue-50 border-x border-blue-100">Sim Time</th>
                      <th className="px-4 py-2.5 bg-blue-50 border-x border-blue-100">Sim Vol</th>
                      <th className="px-4 py-2.5">Med T</th>
                      <th className="px-4 py-2.5">P85 T</th>
                      <th className="px-4 py-2.5">Max T</th>
                      <th className="px-4 py-2.5">Med V</th>
                      <th className="px-4 py-2.5">P85 V</th>
                      {outlierRemoval && <th className="px-4 py-2.5 text-rose-600">Excl.</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ALL_DEVICE_IDS.map(id => {
                      const u = deviceStats[id];
                      if (!u) return null;
                      return (
                        <tr key={id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-bold text-slate-800">{id}</td>
                          <td className="px-4 py-2">
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background: GROUP_LIGHT[u.group], color: GROUP_TEXT[u.group] }}>
                              {u.group}
                            </span>
                          </td>
                          <td className="px-4 py-2 bg-blue-50/50 border-x border-blue-50 font-bold text-blue-800">
                            {calcSimTime(u, percentile, settings.adjustFactor ?? 100)}m
                            {(settings.adjustFactor ?? 100) !== 100 && (
                              <span className="text-xs text-orange-500 ml-1">×{((settings.adjustFactor??100)/100).toFixed(2)}</span>
                            )}
                          </td>
                          <td className="px-4 py-2 bg-blue-50/50 border-x border-blue-50 font-bold text-blue-800">{calcSimVol(u)}</td>
                          <td className="px-4 py-2 text-slate-600">{u.median}m</td>
                          <td className="px-4 py-2 text-slate-600">{u.p85}m</td>
                          <td className="px-4 py-2 text-red-600">{u.max}m</td>
                          <td className="px-4 py-2 text-slate-600">{u.volMedian}</td>
                          <td className="px-4 py-2 text-slate-600">{u.volP85}</td>
                          {outlierRemoval && (
                            <td className="px-4 py-2 text-rose-600 font-semibold text-xs">
                              {(filteredRows.filter(r => r.d === id).length - effectiveRows.filter(r => r.d === id).length) > 0
                                ? `-${filteredRows.filter(r => r.d === id).length - effectiveRows.filter(r => r.d === id).length}`
                                : '—'}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Data sources */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-bold">Data Sources</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Background data always loaded. User CSV batches append on top.</p>
                </div>
                <button onClick={() => setShowDataModal(true)}
                  className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-700 transition">
                  <IcUpload /> Append CSV
                </button>
              </div>

              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-2">
                <div>
                  <span className="font-semibold text-blue-800 text-sm">Background Data (built-in)</span>
                  <span className="text-xs text-blue-600 ml-3">{fmtLabel(BG_DATE_MIN)} – {fmtLabel(BG_DATE_MAX)}</span>
                </div>
                <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded font-medium">Always loaded</span>
              </div>

              {userSegments.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl mt-2">
                  <p className="text-slate-400 text-sm">No additional batches.</p>
                </div>
              ) : (
                <div className="space-y-2 mt-2">
                  {userSegments.map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                      <div>
                        <span className="font-semibold text-slate-800 text-sm">{s.name}</span>
                        <span className="text-xs text-slate-500 ml-3">{fmtLabel(s.minDate)} to {fmtLabel(s.maxDate)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">{s.rowCount.toLocaleString()} device-days</span>
                        <button onClick={() => setUserSegments(p => p.filter(x => x.id !== s.id))}
                          className="text-slate-400 hover:text-red-500 transition"><IcTrash /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}

      {/* Load CSV */}
      {showDataModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold">Append CSV Data</h2>
              <button onClick={() => { setShowDataModal(false); setLoadError(''); }}><IcClose /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-500">
                New batches append to existing data. Duplicate device+date entries use the new values. Only Non-CS Med rows are imported.
              </p>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden w-fit">
                {['paste','file'].map(t => (
                  <button key={t} onClick={() => { setActiveLoadTab(t); setLoadError(''); }}
                    className={`px-4 py-2 text-sm font-semibold transition
                      ${activeLoadTab === t ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                    {t === 'paste' ? 'Paste CSV' : 'Upload File'}
                  </button>
                ))}
              </div>
              {activeLoadTab === 'paste' && (
                <div>
                  <textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
                    placeholder="Paste CSV here..."
                    className="w-full h-40 border border-slate-200 rounded-lg p-3 text-xs font-mono bg-slate-50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <p className="text-xs text-slate-400 mt-1">Columns: Device, TransactionDateTime, MedClass, SessionLength, TransactionType</p>
                </div>
              )}
              {activeLoadTab === 'file' && (
                <div onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center cursor-pointer hover:bg-slate-50 transition">
                  <div className="text-slate-400 text-sm">Click to select a .csv file</div>
                  <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileLoad} />
                </div>
              )}
              {loadError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm">{loadError}</div>
              )}
              {activeLoadTab === 'paste' && (
                <button onClick={() => {
                  if (!pasteText.trim()) { setLoadError('Paste CSV text first.'); return; }
                  loadCSVText(pasteText, 'Pasted batch');
                }}
                  disabled={isLoading || !pasteText.trim()}
                  className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-700 transition disabled:opacity-40">
                  {isLoading ? 'Parsing...' : 'Import'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Session export/import */}
      {showSession && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold">Session Export / Import</h2>
              <button onClick={() => setShowSession(false)}><IcClose /></button>
            </div>
            <div className="p-5 space-y-6">
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">Export Session</h3>
                <p className="text-sm text-slate-500 mb-3">
                  Downloads a JSON file containing all boards, settings, date range, chart preferences, and any appended CSV batches.
                  Load it on any machine to restore your full session.
                </p>
                <button onClick={handleExport}
                  className="flex items-center gap-2 justify-center w-full bg-slate-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-700 transition">
                  <IcDownload /> Download pyxis-session.json
                </button>
              </div>
              <div className="border-t border-slate-100 pt-5">
                <h3 className="font-semibold text-slate-800 mb-1">Import Session</h3>
                <p className="text-sm text-slate-500 mb-3">
                  Overwrites your current settings and boards with the saved session. Background data is not affected.
                </p>
                <button onClick={() => importInputRef.current?.click()}
                  className="flex items-center gap-2 justify-center w-full bg-slate-100 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-200 transition">
                  <IcUpload /> Load Session JSON
                </button>
                <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Executive summary */}
      {showSummary && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Executive Summary</h2>
              <button onClick={() => setShowSummary(false)}><IcClose /></button>
            </div>
            <div className="p-6 space-y-5 text-slate-600">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 rounded-xl border border-slate-200 p-4">
                <div>Range: <strong className="text-slate-800">{fmtLabel(dateStart)} – {fmtLabel(dateEnd)}</strong></div>
                <div>Percentile: <strong className="text-slate-800">{percentile}th</strong></div>
                <div>Transactions: <strong className="text-slate-800">{summaryStats.totalVol.toLocaleString()}</strong></div>
                <div>Interruptions: <strong className="text-amber-700">{summaryStats.totalCancel.toLocaleString()}</strong></div>
              </div>
              <section>
                <h3 className="font-bold text-slate-800 mb-2 border-l-4 border-red-500 pl-3">South Tower Constraint</h3>
                <p className="text-sm leading-relaxed">
                  South Tower units require over 413 minutes of task time on a {percentile}th percentile day.
                  A single technician cannot cover the South Tower in a 10-hour shift with mandatory breaks and cart-reload travel.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-slate-800 mb-2 border-l-4 border-amber-500 pl-3">Cart Reload Penalty</h3>
                <p className="text-sm leading-relaxed">
                  Each pharmacy return trip costs ~{settings.reloadPenalty} minutes. Increasing cart capacity from {settings.cartCapacity} to 6
                  reclaims over 1 hour of labor per technician per day.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-slate-800 mb-2 border-l-4 border-blue-500 pl-3">Boards</h3>
                <div className="space-y-2">
                  {Object.values(boards).map(b => {
                    const buffers = ['tech1','tech2','tech3','tech4'].map(col =>
                      calcColMetrics(b.assignments[col] || []).buffer
                    );
                    const worst = Math.min(...buffers);
                    return (
                      <div key={b.id} className={`flex justify-between items-center text-sm px-3 py-2 rounded border
                        ${b.id === activeBoardId ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
                        <span className="font-semibold">{b.name}{b.id === activeBoardId ? ' (active)' : ''}</span>
                        <span className={`text-xs font-bold ${worst < 30 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {worst}m min buffer
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
