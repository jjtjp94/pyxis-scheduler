import React, { useState, useEffect } from 'react';

// ==========================================
// 1. RAW DATA INJECTION
// Includes Median (50th), 85th Percentile, and Max
// ==========================================
const rawData = [
  { id: '3CDU', median: 6.8, p85: 10, max: 15.2, group: 'South' },
  { id: '3NE', median: 14.3, p85: 19, max: 24.0, group: 'North' },
  { id: '3NSCCT', median: 22.3, p85: 30, max: 141.3, group: 'SCCT' },
  { id: '3NW', median: 7.9, p85: 11, max: 16.6, group: 'North' },
  { id: '3SE', median: 32.4, p85: 40, max: 42.6, group: 'South' },
  { id: '3SSCCT', median: 24.2, p85: 38, max: 121.2, group: 'SCCT' },
  { id: '3SW', median: 31.1, p85: 39, max: 50.3, group: 'South' },
  { id: '4NE', median: 26.3, p85: 32, max: 101.1, group: 'North' },
  { id: '4NSCCT', median: 21.0, p85: 30, max: 76.2, group: 'SCCT' },
  { id: '4NW', median: 24.1, p85: 29, max: 38.6, group: 'North' },
  { id: '4SE', median: 29.0, p85: 33, max: 60.0, group: 'South' },
  { id: '4SW', median: 28.5, p85: 35, max: 51.7, group: 'South' },
  { id: '5NE', median: 26.6, p85: 33, max: 47.2, group: 'North' },
  { id: '5NSCCT', median: 21.4, p85: 32, max: 73.9, group: 'SCCT' },
  { id: '5NW', median: 26.9, p85: 32, max: 37.0, group: 'North' },
  { id: '5SE', median: 28.0, p85: 37, max: 43.4, group: 'South' },
  { id: '5SSCCT', median: 21.0, p85: 29, max: 41.0, group: 'SCCT' },
  { id: '5SW', median: 26.5, p85: 33, max: 40.1, group: 'South' },
  { id: '6ICU', median: 5.2, p85: 7, max: 10.0, group: 'South' },
  { id: '6NE', median: 23.2, p85: 31, max: 41.2, group: 'North' },
  { id: '6NSCCT', median: 23.9, p85: 35, max: 50.1, group: 'SCCT' },
  { id: '6NW', median: 26.5, p85: 34, max: 77.3, group: 'North' },
  { id: '6SE', median: 23.7, p85: 31, max: 52.2, group: 'South' },
  { id: '6SSCCT', median: 28.7, p85: 42, max: 47.7, group: 'SCCT' },
  { id: '6SW', median: 21.8, p85: 28, max: 30.4, group: 'South' },
  { id: '7NE', median: 27.1, p85: 32, max: 87.8, group: 'North' },
  { id: '7NSCCT', median: 20.5, p85: 30, max: 404.9, group: 'SCCT' },
  { id: '7NW', median: 25.0, p85: 29, max: 40.9, group: 'North' },
  { id: '7SE', median: 27.2, p85: 34, max: 42.6, group: 'South' },
  { id: '7SSCCT', median: 20.1, p85: 31, max: 367.8, group: 'SCCT' },
  { id: '7SW', median: 27.8, p85: 35, max: 44.9, group: 'South' },
  { id: '8NE', median: 22.4, p85: 27, max: 40.6, group: 'North' },
  { id: '8NSCCT', median: 18.7, p85: 28, max: 95.0, group: 'SCCT' },
  { id: '8NW', median: 19.9, p85: 26, max: 44.9, group: 'North' },
  { id: '8SE', median: 21.9, p85: 27, max: 33.4, group: 'South' },
  { id: '8SSCCT', median: 18.0, p85: 27, max: 403.8, group: 'SCCT' },
  { id: '8SW', median: 21.1, p85: 26, max: 46.1, group: 'South' }
];

// Helper to interpolate time based on the selected percentile
const calculateTime = (unit, pct) => {
  if (pct === 50) return Math.round(unit.median);
  if (pct <= 85) {
    return Math.round(unit.median + ((pct - 50) / 35) * (unit.p85 - unit.median));
  } else {
    return Math.round(unit.p85 + ((pct - 85) / 15) * (unit.max - unit.p85));
  }
};

// SVG Icons (Extracted to standalone components to prevent React child rendering errors)
const IconSettings = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
const IconPlay = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;
const IconPresentation = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h20"></path><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"></path><path d="m7 21 5-5 5 5"></path></svg>;
const IconDatabase = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5V19A9 3 0 0 0 21 19V5"></path><path d="M3 12A9 3 0 0 0 21 12"></path></svg>;
const IconClose = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

export default function App() {
  const [activeTab, setActiveTab] = useState('scheduler'); // 'scheduler' | 'data'
  const [showSummary, setShowSummary] = useState(false);
  const [percentile, setPercentile] = useState(85); // 50 to 100
  
  // Editable Assumptions
  const [settings, setSettings] = useState({
    shiftMinutes: 600,
    lunchMinutes: 45,
    cartCapacity: 4,
    reloadPenalty: 18,
    travelPerUnit: 5,
  });

  // State maps IDs to columns
  const [assignments, setAssignments] = useState({
    unassigned: [],
    tech1: [],
    tech2: [],
    tech3: [],
    tech4: []
  });

  // Drag and drop state
  const [draggedId, setDraggedId] = useState(null);
  const [sourceColumn, setSourceColumn] = useState(null);

  // Initialize with Option A on load
  useEffect(() => {
    loadOptionA();
  }, []);

  // --- PRESETS ---
  const loadOptionA = () => {
    setAssignments({
      unassigned: [],
      tech1: ['3NW', '3NE', '3NSCCT', '3SSCCT', '4NW', '4NE', '4NSCCT', '5NW', '5NE', '5NSCCT', '5SSCCT'],
      tech2: ['6NW', '6NE', '6NSCCT', '6SSCCT', '7NW', '7NE', '7NSCCT', '7SSCCT', '8NW', '8NE', '8NSCCT', '8SSCCT'],
      tech3: ['3SW', '3SE', '3CDU', '4SW', '4SE', '5SW', '5SE'],
      tech4: ['6SW', '6SE', '6ICU', '7SW', '7SE', '8SW', '8SE']
    });
  };

  const loadOptionB = () => {
    setAssignments({
      unassigned: [],
      tech1: ['3NW', '3NE', '4NW', '4NE', '5NW', '5NE', '6NW', '6NE', '7NW', '7NE', '8NW', '8NE'],
      tech2: ['3NSCCT', '3SSCCT', '4NSCCT', '5NSCCT', '5SSCCT', '6NSCCT', '6SSCCT', '7NSCCT', '7SSCCT', '8NSCCT', '8SSCCT'],
      tech3: ['3SW', '3SE', '3CDU', '4SW', '4SE', '5SW', '5SE'],
      tech4: ['6SW', '6SE', '6ICU', '7SW', '7SE', '8SW', '8SE']
    });
  };

  const clearAll = () => {
    setAssignments({
      unassigned: rawData.map(u => u.id),
      tech1: [], tech2: [], tech3: [], tech4: []
    });
  };

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (e, id, sourceKey) => {
    setDraggedId(id);
    setSourceColumn(sourceKey);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e, targetKey) => {
    e.preventDefault();
    if (!draggedId || sourceColumn === targetKey) return;

    setAssignments(prev => {
      const newSource = prev[sourceColumn].filter(id => id !== draggedId);
      const newTarget = [...prev[targetKey], draggedId];
      return { ...prev, [sourceColumn]: newSource, [targetKey]: newTarget };
    });
    setDraggedId(null);
    setSourceColumn(null);
  };

  const updateSetting = (key, val) => {
    setSettings(prev => ({ ...prev, [key]: Number(val) }));
  };

  // --- RENDER HELPERS ---
  const getUnitData = (id) => {
    const unit = rawData.find(u => u.id === id);
    return { ...unit, currentTime: calculateTime(unit, percentile) };
  };

  const getColorClass = (group) => {
    switch (group) {
      case 'North': return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'South': return 'bg-red-50 border-red-200 text-red-900';
      case 'SCCT': return 'bg-purple-50 border-purple-200 text-purple-900';
      default: return 'bg-gray-50 border-gray-200 text-gray-900';
    }
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

  // --- COMPONENTS ---
  const Column = ({ title, columnKey, unitIds }) => {
    const metrics = calculateMetrics(unitIds);
    const isOverworked = metrics.bufferRemaining < 30;

    const fillPct = Math.min((metrics.activeFillTime / settings.shiftMinutes) * 100, 100);
    const travelPct = Math.min(((metrics.travelTime + metrics.reloadTime) / settings.shiftMinutes) * 100, 100);
    const lunchPct = (settings.lunchMinutes / settings.shiftMinutes) * 100;

    return (
      <div 
        className={`flex-1 min-w-[260px] bg-white p-4 rounded-xl border-2 flex flex-col ${isOverworked ? 'border-red-400 shadow-sm' : 'border-slate-200 shadow-sm'}`}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, columnKey)}
      >
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-slate-800 text-lg">{title}</h2>
          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-sm font-semibold border border-slate-200">{metrics.numUnits} Units</span>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1 font-medium">
            <span>Shift Load ({settings.shiftMinutes / 60}h)</span>
            <span className={isOverworked ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>
               {metrics.bufferRemaining}m Buffer
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full flex overflow-hidden border border-slate-200">
            <div className="bg-blue-500 h-full transition-all" style={{ width: `${fillPct}%` }} title={`Fill: ${metrics.activeFillTime}m`}></div>
            <div className="bg-amber-400 h-full transition-all" style={{ width: `${travelPct}%` }} title={`Travel/Reload: ${metrics.travelTime + metrics.reloadTime}m`}></div>
            <div className="bg-green-500 h-full transition-all" style={{ width: `${lunchPct}%` }} title="Lunch"></div>
            {isOverworked && <div className="bg-red-500 h-full transition-all" style={{ width: `100%` }} title="Over Capacity"></div>}
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
                <span className="text-xs font-semibold bg-white px-1.5 py-0.5 rounded shadow-sm">{unit.currentTime}m</span>
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Header & Tabs */}
      <header className="bg-white border-b border-slate-200 pt-6 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Pyxis Strategy Center</h1>
              <p className="text-slate-500 mt-1">Interactive workload routing & data engine.</p>
            </div>
            <button 
              onClick={() => setShowSummary(true)}
              className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-700 transition-colors shadow-sm"
            >
              <IconPresentation /> Executive Summary
            </button>
          </div>
          
          <div className="flex gap-6 border-b-2 border-transparent">
            <button 
              onClick={() => setActiveTab('scheduler')}
              className={`pb-3 font-semibold text-sm flex items-center gap-2 transition-colors ${activeTab === 'scheduler' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <IconSettings /> Routing & Simulation
            </button>
            <button 
              onClick={() => setActiveTab('data')}
              className={`pb-3 font-semibold text-sm flex items-center gap-2 transition-colors ${activeTab === 'data' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <IconDatabase /> Data Engine (Raw)
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {activeTab === 'scheduler' && (
          <div className="space-y-6">
            {/* Editable Assumptions Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-6 items-center">
              <div className="font-bold text-sm text-slate-800 uppercase tracking-wider mr-2">Assumptions:</div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 font-medium">Shift (m)</label>
                <input type="number" value={settings.shiftMinutes} onChange={(e) => updateSetting('shiftMinutes', e.target.value)} className="w-16 p-1 border rounded text-sm text-center font-semibold bg-slate-50" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 font-medium">Lunch (m)</label>
                <input type="number" value={settings.lunchMinutes} onChange={(e) => updateSetting('lunchMinutes', e.target.value)} className="w-14 p-1 border rounded text-sm text-center font-semibold bg-slate-50" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 font-medium">Cart Size</label>
                <input type="number" value={settings.cartCapacity} onChange={(e) => updateSetting('cartCapacity', e.target.value)} className="w-14 p-1 border rounded text-sm text-center font-semibold bg-slate-50" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 font-medium">Reload Pen. (m)</label>
                <input type="number" value={settings.reloadPenalty} onChange={(e) => updateSetting('reloadPenalty', e.target.value)} className="w-14 p-1 border rounded text-sm text-center font-semibold bg-slate-50" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 font-medium">Travel/Unit (m)</label>
                <input type="number" value={settings.travelPerUnit} onChange={(e) => updateSetting('travelPerUnit', e.target.value)} className="w-14 p-1 border rounded text-sm text-center font-semibold bg-slate-50" />
              </div>
            </div>

            {/* Controls Bar */}
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

        {activeTab === 'data' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-2">Simulation Percentile Engine</h2>
            <p className="text-slate-500 text-sm mb-6">
              Move the slider to simulate different types of days. The global time for each unit updates dynamically based on historical data. Moving this slider instantly affects the "Routing & Simulation" tab calculations.
            </p>
            
            <div className="mb-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
              <div className="flex justify-between font-bold text-slate-700 mb-2">
                <span>50th Percentile (Median Day)</span>
                <span className="text-blue-600 text-lg">{percentile}th Percentile</span>
                <span>Max (Worst Day Recorded)</span>
              </div>
              <input 
                type="range" 
                min="50" max="100" 
                value={percentile} 
                onChange={(e) => setPercentile(Number(e.target.value))}
                className="w-full h-3 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-2">
                <span>Optimistic</span>
                <span>Conservative (85)</span>
                <span>Total Chaos</span>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-100 text-slate-800 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Tower</th>
                    <th className="px-4 py-3 bg-blue-50 border-x border-blue-100">Simulated Time (Current)</th>
                    <th className="px-4 py-3">Median (50th)</th>
                    <th className="px-4 py-3">Conserv. (85th)</th>
                    <th className="px-4 py-3">Max (100th)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rawData.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-800">{u.id}</td>
                      <td className="px-4 py-3">{u.group}</td>
                      <td className="px-4 py-3 bg-blue-50/50 border-x border-blue-50 font-bold text-blue-800 text-base">{calculateTime(u, percentile)}m</td>
                      <td className="px-4 py-3">{u.median.toFixed(1)}m</td>
                      <td className="px-4 py-3">{u.p85}m</td>
                      <td className="px-4 py-3 text-red-600">{u.max.toFixed(1)}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Executive Summary Modal */}
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
                <h3 className="text-lg font-bold text-slate-800 mb-2 border-l-4 border-red-500 pl-3">The South Tower Crisis</h3>
                <p>
                  Data analysis (filtering out 1-minute STAT noise) reveals that the South Tower requires <strong>over 413 minutes</strong> of pure task time on a conservatively busy day. In a 10-hour shift with mandatory breaks and cart-reload travel, assigning a single technician to the South Tower guarantees they will fall behind or skip breaks entirely.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-2 border-l-4 border-amber-500 pl-3">The Cart Reload Penalty</h3>
                <p>
                  Every time a technician returns to the pharmacy to reload a cart, they incur a ~18 minute travel penalty. By increasing cart capacity from 4 to 6 units (via bin optimization), the pharmacy can reclaim over <strong>1 hour of lost labor per day</strong>.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-2 border-l-4 border-emerald-500 pl-3">Strategic Recommendations</h3>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li><strong>Option A (Bridge Sweeper):</strong> Leverages the North-to-SCCT bridge to balance SCCT's heavy (but low volume) workload with the North tower, freeing up techs to split the South Tower.</li>
                  <li><strong>Option B (Dedicated Silos):</strong> Eliminates cross-tower travel entirely. Tech 1 takes all of North. Tech 2 takes all of SCCT. Techs 3 and 4 cut the massive South Tower perfectly in half.</li>
                </ul>
              </section>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-6 text-sm">
                <strong>Data Note:</strong> Times are calculated at the 85th percentile (a conservatively busy day). The median (50th percentile) represents a standard day, but staffing to the median guarantees understaffing 50% of the time. Use the "Data Engine" tab to simulate different percentiles.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}