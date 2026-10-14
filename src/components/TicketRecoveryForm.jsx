import React, { useState } from 'react';
import { AlertCircle, Loader2, TicketCheck } from 'lucide-react';

export const TicketRecoveryForm = ({ onSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [campusId, setCampusId] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const query = new URLSearchParams({ campusId: campusId.trim(), email: email.trim() });
      const response = await fetch(`/api/ticket?${query.toString()}`);
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || 'Could not find a ticket for those details.');
      }
      if (!result?.registrationId || !result?.qrToken || !result?.details) {
        throw new Error('The ticket service returned incomplete data. Please contact the organizer.');
      }

      onSuccess({
        ...result.details,
        registrationId: result.registrationId,
        qrToken: result.qrToken,
        selection: result.details.game,
        track: 'eclash',
      });
    } catch (submitError) {
      setError(submitError.message || 'Ticket lookup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mt-5 rounded-2xl border border-white/10 bg-[#090e38]/75 p-4 sm:p-5">
      <button
        type="button"
        onClick={() => {
          setIsOpen((open) => !open);
          setError('');
        }}
        aria-expanded={isOpen}
        className="flex min-h-11 w-full items-center justify-center gap-2 text-sm font-bold text-cyan-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300 rounded-lg"
      >
        <TicketCheck className="h-4 w-4" />
        Already registered? Reopen your ticket
      </button>

      {isOpen && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <p className="text-xs leading-relaxed text-slate-400">
            Enter the same Campus ID and campus email used for registration.
          </p>
          <div>
            <label htmlFor="recover-campus-id" className="mb-1 block text-xs font-semibold text-slate-200">
              Campus ID
            </label>
            <input
              id="recover-campus-id"
              value={campusId}
              onChange={(event) => setCampusId(event.target.value)}
              autoComplete="username"
              required
              className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-3 text-sm text-white focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/30"
            />
          </div>
          <div>
            <label htmlFor="recover-email" className="mb-1 block text-xs font-semibold text-slate-200">
              Campus email
            </label>
            <input
              id="recover-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-3 text-sm text-white focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/30"
            />
          </div>
          {error && (
            <p role="alert" className="flex items-start gap-2 text-xs leading-relaxed text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isLoading || !campusId.trim() || !email.trim()}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-100 hover:bg-cyan-400/20 focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <TicketCheck className="h-4 w-4" />}
            {isLoading ? 'Looking up ticket…' : 'Find my ticket'}
          </button>
        </form>
      )}
    </section>
  );
};
