import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, CheckCircle2, Clock, Phone, User, RefreshCw, AlertTriangle, ArrowRight } from 'lucide-react';

export function ManualSearchModal({
  isOpen,
  onClose,
  token,
  station,
  onCheckInParticipant,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async (searchQuery) => {
    const q = searchQuery.trim();
    if (!q) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/volunteer/search?q=${encodeURIComponent(q)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.results || []);
      }
    } catch (err) {
      console.error('[ManualSearchModal] Error querying search:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        handleSearch(query);
      } else if (!query.trim()) {
        setResults([]);
        setHasSearched(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#070b24] border border-cyan-500/30 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-orbitron text-white">MANUAL PLAYER SEARCH</h2>
              <p className="text-xs text-slate-400">Search by Name, Campus ID, Phone, or Reg ID</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-4 border-b border-white/10 bg-[#04061a]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type name, campus ID (e.g. 11111), or phone..."
              className="w-full pl-10 pr-10 py-3 bg-[#080d2c] border border-white/15 focus:border-cyan-400 rounded-xl text-white placeholder-slate-500 text-sm outline-none transition-colors"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setHasSearched(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
            <span>Minimum 2 characters</span>
            {station && station !== 'All' && (
              <span className="text-cyan-400 font-semibold">Active station filter: {station}</span>
            )}
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {isLoading ? (
            <div className="py-12 text-center space-y-2">
              <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Searching championship database...</p>
            </div>
          ) : results.length > 0 ? (
            results.map((player) => {
              const isChecked = Boolean(player.checkedIn);
              const isStationMismatch =
                station &&
                station !== 'All' &&
                station !== 'All / Registration Desk' &&
                station !== player.game;

              return (
                <div
                  key={player.registrationId}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isChecked
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : isStationMismatch
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-[#080d2c] border-white/10 hover:border-cyan-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white truncate">
                          {player.fullName}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                          {player.game}
                        </span>
                        {isChecked ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Checked In
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-400 font-mono">
                        <div>
                          ID: <strong className="text-white">{player.campusId}</strong> ({player.year})
                        </div>
                        <div>
                          Reg: <span className="text-slate-300">{player.registrationId}</span>
                        </div>
                        <div className="col-span-2 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-cyan-400" />
                          <a
                            href={`tel:${player.phone}`}
                            className="text-cyan-400 hover:underline"
                          >
                            {player.phone}
                          </a>
                        </div>
                      </div>

                      {isChecked && player.checkedInBy && (
                        <div className="mt-1.5 text-[10px] text-emerald-400/90 font-mono">
                          Verified by {player.checkedInBy}
                        </div>
                      )}

                      {isStationMismatch && !isChecked && (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Player registered for {player.game}, not {station}.</span>
                        </div>
                      )}
                    </div>

                    {/* Quick action button */}
                    {!isChecked ? (
                      <button
                        onClick={() => {
                          onCheckInParticipant(player);
                          onClose();
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold font-orbitron transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                          isStationMismatch
                            ? 'bg-amber-500 hover:bg-amber-400 text-black'
                            : 'bg-[#00e5ff] hover:bg-cyan-300 text-black shadow-md'
                        }`}
                      >
                        <span>{isStationMismatch ? 'Override' : 'Check In'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : hasSearched ? (
            <div className="py-12 text-center space-y-2">
              <User className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">No participants found</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                No matching records for "{query}". Verify spelling or check student ID card.
              </p>
            </div>
          ) : (
            <div className="py-10 text-center space-y-2">
              <Search className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">
                Search for players whose phone screens cannot be scanned.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
