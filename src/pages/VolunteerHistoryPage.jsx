import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  History,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Gamepad2,
} from 'lucide-react';
import { getStoredVolunteerProfile, getStoredVolunteerToken } from '../utils/volunteerAuth';

export function VolunteerHistoryPage({ onBackToDashboard }) {
  const [profile] = useState(() => getStoredVolunteerProfile());
  const [token] = useState(() => getStoredVolunteerToken());
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all' or 'my'
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/volunteer/history?filter=${filterType}&limit=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('[VolunteerHistoryPage] Failed to load history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, filterType]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.registrationId.toLowerCase().includes(q) ||
      log.game.toLowerCase().includes(q) ||
      log.volunteerName.toLowerCase().includes(q) ||
      log.station.toLowerCase().includes(q) ||
      log.result.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#05071a] text-slate-100 flex flex-col font-sans relative selection:bg-cyan-500 selection:text-black pb-8">
      {/* Top Accent Gradient Bar */}
      <div className="fixed top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#2b4bff] via-[#7c3aed] to-[#d946ef] z-50" />

      {/* Header bar */}
      <header className="sticky top-0 z-40 bg-[#070b24]/95 backdrop-blur-md border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-cyan-300 transition-colors py-2 px-3 rounded-xl bg-white/5 border border-white/10 active:scale-95 cursor-pointer font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Scanner</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchHistory}
              disabled={isLoading}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-400 border border-white/10 transition-colors cursor-pointer"
              title="Refresh log"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <div className="text-right">
              <span className="font-bold text-xs text-white block truncate max-w-[120px]">{profile?.name}</span>
              <span className="text-[10px] font-mono text-slate-400">ID: {profile?.username}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Title & Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30">
                <History className="w-5 h-5" />
              </div>
              <h1 className="text-lg font-black font-orbitron text-white">SCAN & AUDIT LOG</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">Real-time check-in ledger recorded to Google Sheets</p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center bg-[#070b24] p-1 rounded-xl border border-white/10 text-xs shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                filterType === 'all'
                  ? 'bg-fuchsia-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Scans
            </button>
            <button
              onClick={() => setFilterType('my')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                filterType === 'my'
                  ? 'bg-fuchsia-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              My Scans
            </button>
          </div>
        </div>

        {/* Search in History Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter scans by Reg ID, game, volunteer..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#080d2c] border border-white/15 focus:border-fuchsia-400 rounded-xl text-white placeholder-slate-500 text-xs outline-none transition-colors"
          />
        </div>

        {/* List of Scan Log Items */}
        {isLoading ? (
          <div className="py-16 text-center space-y-2">
            <RefreshCw className="w-7 h-7 text-fuchsia-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading audit history from Google Sheets...</p>
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="space-y-2.5">
            {filteredLogs.map((log) => {
              const isSuccess = log.result === 'CHECKED_IN';
              const isOverride = log.result === 'WRONG_STATION_OVERRIDE';
              const isInvalid = log.result === 'INVALID';

              const timeStr = log.timestamp
                ? new Date(log.timestamp).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : '—';

              return (
                <div
                  key={log.id}
                  className="p-3.5 rounded-2xl bg-[#080d2c] border border-white/10 hover:border-white/20 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isSuccess ? (
                        <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                      ) : isOverride ? (
                        <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <AlertTriangle className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          <XCircle className="w-4 h-4" />
                        </span>
                      )}

                      <div>
                        <span className="font-mono font-bold text-xs text-white">
                          {log.registrationId || 'UNKNOWN'}
                        </span>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Gamepad2 className="w-3 h-3 text-cyan-400" />
                          <span>{log.game || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          isSuccess
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : isOverride
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}
                      >
                        {isSuccess ? 'Checked In' : isOverride ? 'Override' : 'Invalid'}
                      </span>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{timeStr}</div>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>By: <strong className="text-slate-300">{log.volunteerName}</strong></span>
                    <span>Desk: {log.station}</span>
                  </div>

                  {log.note && (
                    <div className="text-[10px] text-slate-400 bg-white/5 p-2 rounded-lg font-mono break-words">
                      {log.note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#080d2c] border border-white/10 rounded-2xl p-8 text-center space-y-2">
            <Clock className="w-8 h-8 text-slate-500 mx-auto" />
            <h3 className="font-bold text-sm text-slate-200">No Log Entries Found</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {searchQuery
                ? `No scans match "${searchQuery}".`
                : 'Scans performed through the camera or manual entry will automatically appear here.'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
