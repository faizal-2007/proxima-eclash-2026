import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, RefreshCw, ChevronDown, ChevronUp, UserCheck, Shield, Flame, Crosshair, Target, Swords, Crown, Trophy } from 'lucide-react';

const GAME_ICONS = {
  'Free Fire': Flame,
  'BGMI': Target,
  'Mini Militia': Crosshair,
  'eFootball': Trophy,
  'Carrom': Target,
  'Valorant': Swords,
};

export function StationStatsHud({ station, token, refreshTrigger }) {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchStats = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/volunteer/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
        setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.error('[StationStatsHud] Error loading stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStats();
    // Auto-refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats, refreshTrigger]);

  if (!stats) return null;

  const total = stats.total || 0;
  const checkedIn = stats.checkedIn || 0;
  const percentage = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

  // Station specific count
  const stationStats = station && station !== 'All' && station !== 'All / Registration Desk'
    ? stats.byGame?.[station] || { total: 0, checkedIn: 0, pending: 0 }
    : null;

  return (
    <div className="bg-[#080d2c] border border-white/10 hover:border-cyan-500/30 rounded-2xl p-3.5 transition-all shadow-md">
      {/* Top Header Summary */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-left cursor-pointer flex-1 min-w-0"
        >
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white font-orbitron">
                ARENA CHECK-IN STATS
              </span>
              <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800">
                {checkedIn}/{total} ({percentage}%)
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {stationStats ? `${station}: ${stationStats.checkedIn}/${stationStats.total} checked in` : 'Tap to toggle breakdown'}
            </div>
          </div>
          <div className="text-slate-400 p-1">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        <button
          onClick={fetchStats}
          disabled={isLoading}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-cyan-300 border border-white/10 transition-colors cursor-pointer shrink-0"
          title="Refresh statistics"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>

      {/* Mini Progress Bar */}
      <div className="mt-2.5 h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 transition-all duration-500 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Expanded Game Breakdown */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-2.5 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(stats.byGame || {}).map(([gameName, gameData]) => {
              const Icon = GAME_ICONS[gameName] || Shield;
              const isCurrentStation = station === gameName;
              return (
                <div
                  key={gameName}
                  className={`p-2.5 rounded-xl border text-left transition-colors ${
                    isCurrentStation
                      ? 'bg-cyan-500/10 border-cyan-500/40'
                      : 'bg-[#04061a] border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold truncate">
                    <span className="flex items-center gap-1 truncate">
                      <Icon className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span className="truncate">{gameName}</span>
                    </span>
                  </div>
                  <div className="text-sm font-black font-orbitron text-white mt-1">
                    {gameData.checkedIn}
                    <span className="text-[10px] font-normal text-slate-400 font-sans"> / {gameData.total}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-mono">
            <span className="flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-emerald-400" />
              Your scans: <strong className="text-white">{stats.volunteerScanCount || 0}</strong>
            </span>
            {lastUpdated && <span>Updated at {lastUpdated}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
