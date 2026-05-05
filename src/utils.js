// ─── PURE HELPERS ────────────────────────────────────────────────────────────

export const parseSessionMinutes = (str) => {
  if (!str) return 0;
  const p = str.trim().split(':').map(Number);
  if (p.length === 3) return p[0] * 60 + p[1] + p[2] / 60;
  if (p.length === 2) return p[0] + p[1] / 60;
  return 0;
};

export const parseDateKey = (str) => {
  if (!str) return null;
  const d = str.trim().split(' ')[0];
  const parts = d.split('/');
  if (parts.length !== 3) return null;
  const [m, day, y] = parts;
  return `${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

export const fmtLabel = (key) => {
  if (!key) return '';
  const [, m, d] = key.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
};

export const fmtMins = (v) => {
  if (v == null) return '—';
  return `${Math.round(v)}m`;
};

export const deriveGroup = (id) => {
  const u = (id || '').toUpperCase();
  if (u.includes('SCCT')) return 'SCCT';
  if (u.includes('ICU') || u.includes('CDU')) return 'South';
  if (/\d(NE|NW)$/.test(u)) return 'North';
  if (/\d(SE|SW)$/.test(u)) return 'South';
  return 'Other';
};

export const pctOf = (sorted, p) => {
  if (!sorted || !sorted.length) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
};

// Interpolate between median, p85, max based on slider value 50–100
export const calcSimTime = (unit, percentile) => {
  if (!unit) return 0;
  if (percentile <= 50) return Math.round(unit.median);
  if (percentile <= 85) return Math.round(unit.median + ((percentile - 50) / 35) * (unit.p85 - unit.median));
  return Math.round(unit.p85 + ((percentile - 85) / 15) * (unit.max - unit.p85));
};

// Build per-device stats from aggregated rows.
// Returns: { [deviceId]: { median, p85, max, volMedian, volP85, volMax } }
export const buildDeviceStats = (rows) => {
  const byDevice = {};
  rows.forEach(r => {
    if (!byDevice[r.d]) byDevice[r.d] = { session: [], volume: [] };
    byDevice[r.d].session.push(r.s);
    byDevice[r.d].volume.push(r.v);
  });
  const stats = {};
  Object.entries(byDevice).forEach(([id, { session, volume }]) => {
    const ss = [...session].sort((a, b) => a - b);
    const sv = [...volume].sort((a, b) => a - b);
    stats[id] = {
      id,
      group: deriveGroup(id),
      median: parseFloat(pctOf(ss, 50).toFixed(1)),
      p85:    parseFloat(pctOf(ss, 85).toFixed(1)),
      max:    parseFloat(ss[ss.length - 1].toFixed(1)),
      volMedian: Math.round(pctOf(sv, 50)),
      volP85:    Math.round(pctOf(sv, 85)),
      volMax:    sv[sv.length - 1],
    };
  });
  return stats;
};

// Merge multiple aggregated row arrays; last-write-wins by (d, k)
export const mergeRows = (...arrays) => {
  const map = new Map();
  arrays.forEach(arr => {
    arr.forEach(r => {
      map.set(`${r.d}|${r.k}`, r);
    });
  });
  return Array.from(map.values());
};

// Filter aggregated rows by date range
export const filterRowsByDate = (rows, start, end) =>
  rows.filter(r => (!start || r.k >= start) && (!end || r.k <= end));

// Process raw CSV parse result into aggregated rows
export const processCsvToAggRows = (papaResults) => {
  const map = new Map();
  papaResults.data.forEach(row => {
    if ((row['MedClass'] || '').trim() !== 'Non-CS Med') return;
    const dk = parseDateKey((row['TransactionDateTime'] || '').trim());
    if (!dk) return;
    const d = (row['Device'] || '').trim();
    if (!d) return;
    const s = parseSessionMinutes((row['SessionLength'] || '').trim());
    const c = (row['TransactionType'] || '').trim() === 'Refill CANCELLED' ? 1 : 0;
    const key = `${d}|${dk}`;
    if (!map.has(key)) map.set(key, { d, k: dk, v: 0, s: 0, c: 0 });
    const entry = map.get(key);
    entry.v++;
    entry.s = parseFloat((entry.s + s).toFixed(3));
    entry.c += c;
  });
  return Array.from(map.values());
};

export const GROUP_COLOR = {
  North: '#3b82f6',
  South: '#ef4444',
  SCCT:  '#a855f7',
  Other: '#64748b',
};
export const GROUP_LIGHT = {
  North: '#dbeafe',
  South: '#fee2e2',
  SCCT:  '#f3e8ff',
  Other: '#f1f5f9',
};
export const GROUP_BORDER = {
  North: '#93c5fd',
  South: '#fca5a5',
  SCCT:  '#d8b4fe',
  Other: '#cbd5e1',
};
export const GROUP_TEXT = {
  North: '#1d4ed8',
  South: '#b91c1c',
  SCCT:  '#7e22ce',
  Other: '#475569',
};

export const DEVICE_PALETTE = [
  '#3b82f6','#ef4444','#a855f7','#22c55e','#f59e0b',
  '#14b8a6','#f97316','#8b5cf6','#ec4899','#06b6d4',
];

export const ALL_DEVICE_IDS = [
  '3CDU','3NE','3NSCCT','3NW','3SE','3SSCCT','3SW',
  '4NE','4NSCCT','4NW','4SE','4SW',
  '5NE','5NSCCT','5NW','5SE','5SSCCT','5SW',
  '6ICU','6NE','6NSCCT','6NW','6SE','6SSCCT','6SW',
  '7NE','7NSCCT','7NW','7SE','7SSCCT','7SW',
  '8NE','8NSCCT','8NW','8SE','8SSCCT','8SW',
];

export const DEFAULT_BOARD_ID = 'board_bridge';

export const DEFAULT_BOARD = {
  id:   DEFAULT_BOARD_ID,
  name: 'Bridge',
  assignments: {
    unassigned: [],
    tech1: ['3NW','3NE','3NSCCT','3SSCCT','4NW','4NE','4NSCCT','5NW','5NE','5NSCCT','5SSCCT'],
    tech2: ['6NW','6NE','6NSCCT','6SSCCT','7NW','7NE','7NSCCT','7SSCCT','8NW','8NE','8NSCCT','8SSCCT'],
    tech3: ['3SW','3SE','3CDU','4SW','4SE','5SW','5SE'],
    tech4: ['6SW','6SE','6ICU','7SW','7SE','8SW','8SE'],
  },
};

export const DEFAULT_SETTINGS = {
  shiftMinutes:  600,
  lunchMinutes:   45,
  cartCapacity:    4,
  reloadPenalty:  18,
  travelPerUnit:   5,
};
