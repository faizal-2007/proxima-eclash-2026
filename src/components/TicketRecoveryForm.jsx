import React, { useState } from 'react';
import { AlertCircle, Loader2, TicketCheck, ArrowLeft, Search } from 'lucide-react';
import { TicketPass } from './TicketPass';

export const TicketRecoveryForm = ({ onSuccess, initialOpen = false }) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [campusId, setCampusId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [retrievedTicket, setRetrievedTicket] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const cleanId = campusId.trim();
    if (!cleanId) {
      setError('Please enter your Campus ID.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/ticket?campusId=${encodeURIComponent(cleanId)}`);
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || `Could not find a Hall Pass for Campus ID: ${cleanId}`);
      }
      if (!result?.registrationId || !result?.qrToken || !result?.details) {
        throw new Error('The ticket service returned incomplete data. Please contact the tournament organizers.');
      }

      const formatted = {
        ...result.details,
        registrationId: result.registrationId,
        qrToken: result.qrToken,
        selection: result.details.game || result.details.selection,
        track: 'eclash',
      };

      if (onSuccess) {
        onSuccess(formatted);
      } else {
        setRetrievedTicket(formatted);
      }
    } catch (submitError) {
      setError(submitError.message || 'Ticket lookup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mt-5 rounded-2xl border border-cyan-500/30 bg-[#090e38]/85 p-4 sm:p-6 shadow-[0_0_25px_rgba(0,229,255,0.15)] text-left">
      {!retrievedTicket ? (
        <>
          <button
            type="button"
            onClick={() => {
              setIsOpen((open) => !open);
              setError('');
            }}
            aria-expanded={isOpen}
            className="flex min-h-11 w-full items-center justify-center gap-2 text-sm sm:text-base font-bold text-cyan-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300 rounded-lg cursor-pointer transition-colors"
          >
            <TicketCheck className="h-5 w-5 text-cyan-400" />
            <span>Already registered? Check &amp; Download Hall Pass</span>
          </button>

          {isOpen && (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
                Forgot to download your pass or need a fresh copy? Enter your registered <strong>Campus ID</strong> to retrieve and download your official Hall Pass.
              </p>
              <div>
                <label htmlFor="recover-campus-id" className="mb-1.5 block text-xs font-mono font-bold uppercase tracking-wider text-cyan-200">
                  Registered Campus ID
                </label>
                <div className="relative">
                  <input
                    id="recover-campus-id"
                    value={campusId}
                    onChange={(event) => setCampusId(event.target.value)}
                    placeholder="e.g. 11111 or your student ID"
                    autoComplete="off"
                    required
                    className="w-full rounded-xl border border-white/20 bg-black/50 px-4 py-3 text-sm font-mono text-white placeholder-slate-500 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/30"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none">
                    <TicketCheck className="w-4 h-4 opacity-70" />
                  </div>
                </div>
              </div>

              {error && (
                <p role="alert" className="flex items-start gap-2 text-xs leading-relaxed text-red-300 p-3 rounded-xl bg-red-950/60 border border-red-500/40">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading || !campusId.trim()}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-gradient-to-r from-[#00e5ff] to-[#2b4bff] px-4 py-3 text-sm font-orbitron font-bold text-[#070b2a] shadow-neon-blue hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-50 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                    <span>Looking up Hall Pass…</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    <span>Find &amp; Download Hall Pass</span>
                  </>
                )}
              </button>
            </form>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setRetrievedTicket(null)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-white transition-colors cursor-pointer mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Search another Campus ID</span>
          </button>
          <TicketPass
            registrationData={retrievedTicket}
            onBackToHome={() => setRetrievedTicket(null)}
          />
        </div>
      )}
    </section>
  );
};
