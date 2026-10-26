import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TicketCheck, Search, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { TicketPass } from './TicketPass';

export const HallPassModal = ({ isOpen, onClose, onOpenFullTicket }) => {
  const [campusId, setCampusId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [ticketData, setTicketData] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setError('');
      setIsLoading(false);
      setTicketData(null);
      setCampusId('');
      return;
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleLookup = async (e) => {
    if (e) e.preventDefault();
    const cleanId = campusId.trim();
    if (!cleanId) {
      setError('Please enter your Campus ID.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/ticket?campusId=${encodeURIComponent(cleanId)}`);
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || `No registration found for Campus ID: ${cleanId}`);
      }

      if (!data?.registrationId || !data?.qrToken || !data?.details) {
        throw new Error('Incomplete ticket data received. Please contact tournament coordinators.');
      }

      const formatted = {
        ...data.details,
        registrationId: data.registrationId,
        qrToken: data.qrToken,
        selection: data.details.game || data.details.selection,
        track: 'eclash',
      };

      setTicketData(formatted);
      if (onOpenFullTicket) {
        // Can optionally notify parent
      }
    } catch (err) {
      setError(err.message || 'Could not retrieve your Hall Pass. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl bg-gradient-to-b from-[#0c1236] via-[#080d2b] to-[#040618] border border-cyan-500/40 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-[0_0_50px_rgba(0,229,255,0.25)] text-left overflow-hidden z-10 max-h-[90vh] flex flex-col"
          >
            {/* Top Accent Strip */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#00e5ff] via-[#2b4bff] to-[#7c3aed]" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer z-20"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Scrollable Content */}
            <div className="overflow-y-auto pr-1">
              {!ticketData ? (
                /* Lookup Form Screen */
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(0,229,255,0.25)]">
                      <TicketCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400">
                        Check / Download Hall Pass
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-300 font-rajdhani">
                        Official Player Pass &amp; Arena Entry Credential
                      </p>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 font-rajdhani mb-5 leading-relaxed">
                    If you haven't downloaded your Hall Pass yet or need a fresh copy, enter the <strong>Campus ID</strong> you registered with. Your pass includes your official tournament QR code for arena check-in.
                  </p>

                  <form onSubmit={handleLookup} className="space-y-4">
                    <div>
                      <label htmlFor="modal-campus-id" className="block text-xs font-mono font-bold uppercase tracking-wider text-cyan-300 mb-1.5">
                        Registered Campus ID
                      </label>
                      <div className="relative">
                        <input
                          id="modal-campus-id"
                          type="text"
                          value={campusId}
                          onChange={(e) => setCampusId(e.target.value)}
                          placeholder="e.g. 11111 or your student ID"
                          autoComplete="off"
                          autoFocus
                          required
                          className="w-full px-4 py-3.5 rounded-xl bg-black/50 border border-cyan-500/30 text-white placeholder-slate-500 font-mono text-sm sm:text-base focus:border-[#00e5ff] focus:ring-2 focus:ring-[#00e5ff]/30 focus:outline-none transition-all"
                        />
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none">
                          <TicketCheck className="w-5 h-5 opacity-60" />
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 font-rajdhani mt-1.5">
                        * Only your registered Campus ID is required to retrieve your pass.
                      </p>
                    </div>

                    {error && (
                      <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs sm:text-sm flex items-start gap-2.5 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="pt-2 flex flex-col sm:flex-row gap-3">
                      <button
                        type="submit"
                        disabled={isLoading || !campusId.trim()}
                        className="w-full sm:flex-1 py-3.5 px-6 rounded-xl font-orbitron font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-[#00e5ff] via-[#2b4bff] to-[#7c3aed] text-white shadow-[0_0_25px_rgba(0,229,255,0.4)] hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Retrieving Pass…</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4" />
                            <span>Find &amp; Open Hall Pass</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto py-3.5 px-5 rounded-xl font-rajdhani font-bold text-xs uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Pass Found Screen */
                <div>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                    <button
                      onClick={() => setTicketData(null)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Lookup Different ID</span>
                    </button>
                    <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Pass Verified ✓
                    </span>
                  </div>

                  <TicketPass
                    registrationData={ticketData}
                    onBackToHome={onClose}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
