import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Gamepad2,
  Filter,
} from 'lucide-react';

export function CheckInsViewer({ token }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResult, setSelectedResult] = useState('ALL');
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/checkins?limit=500', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-admin-key': token,
        },
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        setLastRefreshed(new Date());
      } else {
        console.warn('[CheckInsViewer] API returned error:', data.error);
      }
    } catch (err) {
      console.error('[CheckInsViewer] Error loading logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLogs();
    // Auto-refresh every 30 seconds for live check-in updates
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!logs.length) return;

    const headers = [
      'Timestamp (ISO)',
      'Registration ID',
      'Game',
      'Result',
      'Volunteer ID',
      'Volunteer Name',
      'Station',
      'Note',
    ];

    const rows = logs.map((l) => [
      `"${l.timestamp || ''}"`,
      `"${l.registrationId || ''}"`,
      `"${l.game || ''}"`,
      `"${l.result || ''}"`,
      `"${l.volunteerId || ''}"`,
      `"${l.volunteerName || ''}"`,
      `"${l.station || ''}"`,
      `"${(l.note || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `proxima_checkin_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter((log) => {
    if (selectedResult !== 'ALL' && log.result !== selectedResult) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.registrationId.toLowerCase().includes(q) ||
      log.game.toLowerCase().includes(q) ||
      log.volunteerName.toLowerCase().includes(q) ||
      log.station.toLowerCase().includes(q) ||
      log.result.toLowerCase().includes(q) ||
      (log.note && log.note.toLowerCase().includes(q))
    );
  });

  const totalScans = logs.length;
  const checkedInCount = logs.filter((l) => l.result === 'CHECKED_IN').length;
  const overrideCount = logs.filter((l) => l.result === 'WRONG_STATION_OVERRIDE').length;
  const invalidCount = logs.filter((l) => l.result === 'INVALID').length;
  const duplicateCount = logs.filter((l) => l.result === 'ALREADY_CHECKED_IN').length;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#070b29] border border-white/10 p-5 rounded-3xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black font-orbitron text-white">ARENA CHECK-IN AUDIT LEDGER</h2>
              <p className="text-xs text-slate-400">Append-only audit trail recorded to Supabase</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {lastRefreshed && (
            <span className="text-[10px] text-slate-500 font-mono hidden sm:block">
              Updated {lastRefreshed.toLocaleTimeString('en-IN', { timeStyle: 'short' })}
            </span>
          )}
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-400 border border-white/10 transition-colors cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black font-orbitron text-xs transition-all shadow-[0_0_20px_rgba(0,229,255,0.3)] flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export Check-ins CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-[#080d32] border border-white/10">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Scans</div>
          <div className="text-2xl font-black font-orbitron text-white mt-1">{totalScans}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#080d32] border border-emerald-500/30">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Checked In</div>
          <div className="text-2xl font-black font-orbitron text-emerald-300 mt-1">{checkedInCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#080d32] border border-amber-500/30">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Overrides</div>
          <div className="text-2xl font-black font-orbitron text-amber-300 mt-1">{overrideCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#080d32] border border-rose-500/30">
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Invalid / Flagged</div>
          <div className="text-2xl font-black font-orbitron text-rose-300 mt-1">{invalidCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#080d32] border border-purple-500/30">
          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Duplicate Attempts</div>
          <div className="text-2xl font-black font-orbitron text-purple-300 mt-1">{duplicateCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#070b29] border border-white/10 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, Game, Volunteer..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#030617] border border-white/15 focus:border-cyan-400 rounded-xl text-white text-xs outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0 font-medium">
            <Filter className="w-3.5 h-3.5" />
            Result:
          </span>
          <select
            value={selectedResult}
            onChange={(e) => setSelectedResult(e.target.value)}
            className="flex-1 sm:flex-initial px-3 py-2 bg-[#030617] border border-white/15 focus:border-cyan-400 rounded-xl text-white text-xs outline-none cursor-pointer"
          >
            <option value="ALL">All Results</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="WRONG_STATION_OVERRIDE">Wrong Station Override</option>
            <option value="ALREADY_CHECKED_IN">Duplicate Scan</option>
            <option value="INVALID">Invalid Tickets</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#070b29] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="py-20 text-center space-y-2">
            <RefreshCw className="w-8 h-8 text-fuchsia-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading audit history from Supabase...</p>
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-[#04061a] text-slate-400 font-mono uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-bold">Time (IST)</th>
                  <th className="py-3.5 px-4 font-bold">Registration ID</th>
                  <th className="py-3.5 px-4 font-bold">Game</th>
                  <th className="py-3.5 px-4 font-bold">Result</th>
                  <th className="py-3.5 px-4 font-bold">Volunteer</th>
                  <th className="py-3.5 px-4 font-bold">Station</th>
                  <th className="py-3.5 px-4 font-bold">Audit Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {filteredLogs.map((log) => {
                  const isSuccess = log.result === 'CHECKED_IN';
                  const isOverride = log.result === 'WRONG_STATION_OVERRIDE';
                  const isDuplicate = log.result === 'ALREADY_CHECKED_IN';
                  const isInvalid = log.result === 'INVALID';

                  const timeStr = log.timestamp
                    ? new Date(log.timestamp).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })
                    : '—';

                  return (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                        {timeStr}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                        {log.registrationId}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="flex items-center gap-1 font-medium text-slate-300">
                          <Gamepad2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>{log.game || 'N/A'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isSuccess ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Checked In
                          </span>
                        ) : isOverride ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            Override
                          </span>
                        ) : isDuplicate ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            Duplicate
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <XCircle className="w-3 h-3" />
                            Invalid
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                        {log.volunteerName || '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        {log.station}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px] max-w-xs truncate" title={log.note}>
                        {log.note || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center space-y-2">
            <History className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-300">No Check-in Logs Found</p>
            <p className="text-xs text-slate-500">
              {searchQuery ? `No logs match "${searchQuery}".` : 'Check-ins will appear here in real time.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
