import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Phone,
  Calendar,
  Gamepad2,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Clock,
} from 'lucide-react';

export function ScanResultCard({
  scanResult,
  station,
  onCheckIn,
  onOverrideCheckIn,
  onScanNext,
  isCheckingIn,
}) {
  if (!scanResult) return null;

  const {
    status, // 'checkedIn' | 'valid' | 'wrongStation' | 'alreadyCheckedIn' | 'invalid' | 'notFound'
    participant,
    message,
    error,
  } = scanResult;

  const isGreen = status === 'checkedIn' || status === 'valid';
  const isAmber = status === 'wrongStation' || status === 'alreadyCheckedIn';
  const isRed = status === 'invalid' || status === 'notFound';

  const cardBorder = isGreen
    ? 'border-emerald-500/60 shadow-[0_0_35px_rgba(16,185,129,0.3)]'
    : isAmber
    ? 'border-amber-500/60 shadow-[0_0_35px_rgba(245,158,11,0.3)]'
    : 'border-rose-500/60 shadow-[0_0_35px_rgba(244,63,94,0.3)]';

  const headerBg = isGreen
    ? 'from-emerald-600 via-teal-600 to-emerald-700'
    : isAmber
    ? 'from-amber-600 via-yellow-600 to-amber-700'
    : 'from-rose-600 via-red-600 to-rose-700';

  const statusLabel =
    status === 'checkedIn'
      ? 'CHECK-IN CONFIRMED'
      : status === 'valid'
      ? 'VALID TICKET CREDENTIAL'
      : status === 'wrongStation'
      ? 'WRONG STATION WARNING'
      : status === 'alreadyCheckedIn'
      ? 'ALREADY CHECKED IN'
      : 'INVALID OR FORGED TICKET';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg bg-[#070b24] border-2 ${cardBorder} rounded-3xl overflow-hidden flex flex-col max-h-[92vh] transition-all`}
      >
        {/* Status Top Strip */}
        <div className={`p-4 bg-gradient-to-r ${headerBg} text-white flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            {isGreen && <CheckCircle2 className="w-6 h-6 shrink-0" />}
            {isAmber && <AlertTriangle className="w-6 h-6 shrink-0 animate-bounce" />}
            {isRed && <XCircle className="w-6 h-6 shrink-0" />}
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-white/80">
                Ticket Verification
              </div>
              <div className="font-orbitron font-black text-sm sm:text-base tracking-wide">
                {statusLabel}
              </div>
            </div>
          </div>

          <div className="text-right font-mono text-xs font-bold text-white/90">
            {participant?.registrationId || 'NO_ID'}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Main Status Message Banner */}
          <div
            className={`p-3.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-start gap-2.5 ${
              isGreen
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : isAmber
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {isGreen && <CheckCircle2 className="w-4 h-4" />}
              {isAmber && <AlertTriangle className="w-4 h-4" />}
              {isRed && <XCircle className="w-4 h-4" />}
            </div>
            <div className="leading-snug">{message || error}</div>
          </div>

          {/* Participant Details if found */}
          {participant && (
            <div className="space-y-4">
              {/* BIG BOLD GAME BANNER */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 via-purple-950/60 to-slate-900 border border-cyan-500/30 text-center space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                  REGISTERED TOURNAMENT GAME
                </span>
                <div className="font-orbitron font-black text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-[#00e5ff] via-amber-300 to-[#d946ef] tracking-wider uppercase">
                  {participant.game || 'Not Specified'}
                </div>
                {station !== 'All' && station !== 'All / Registration Desk' && (
                  <div className="text-[11px] text-slate-400">
                    Current Station Desk:{' '}
                    <strong className="text-white">{station}</strong>
                  </div>
                )}
              </div>

              {/* Participant Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    Participant Name
                  </span>
                  <span className="font-bold text-white text-sm truncate block">
                    {participant.fullName}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    Campus ID
                  </span>
                  <span className="font-mono font-bold text-cyan-300 text-sm truncate block">
                    {participant.campusId}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    Academic Year
                  </span>
                  <span className="font-semibold text-slate-200 text-xs">
                    {participant.year}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    Contact Phone
                  </span>
                  {participant.phone ? (
                    <a
                      href={`tel:${participant.phone}`}
                      className="font-mono font-bold text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3 shrink-0" />
                      <span>{participant.phone}</span>
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
              </div>

              {/* Already Checked-in details */}
              {participant.checkedIn && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300 text-[11px] uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Check-in Audit Timestamp</span>
                  </div>
                  <div className="text-slate-300 text-[11px]">
                    Verified by: <strong className="text-white">{participant.checkedInBy || 'Staff'}</strong>
                  </div>
                  {participant.checkedInAt && (
                    <div className="text-slate-400 text-[10px] font-mono">
                      {new Date(participant.checkedInAt).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        dateStyle: 'medium',
                        timeStyle: 'medium',
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Invalid code explanation */}
          {isRed && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-rose-300">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Security Notice: Unverified Ticket</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                This QR code signature could not be validated against the official tournament secret key, or the registration ID does not exist. Please check the student’s physical college ID card and use Manual Lookup.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 bg-[#05081c] border-t border-white/10 space-y-2.5">
          {/* Check In Button (if status is valid and not yet checked in) */}
          {status === 'valid' && (
            <button
              onClick={onCheckIn}
              disabled={isCheckingIn}
              className="w-full min-h-[50px] py-3.5 px-4 rounded-xl font-bold font-orbitron text-sm uppercase tracking-wider text-black bg-[#00e5ff] hover:bg-[#00e5ff]/90 shadow-neon-blue active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isCheckingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Recording Check-in...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Confirm Check-in</span>
                </>
              )}
            </button>
          )}

          {/* Override Check In Button (if wrong station) */}
          {status === 'wrongStation' && (
            <button
              onClick={onOverrideCheckIn}
              disabled={isCheckingIn}
              className="w-full min-h-[48px] py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-500 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {isCheckingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Override...</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  <span>Check In Anyway (Override Station)</span>
                </>
              )}
            </button>
          )}

          {/* Large Primary "Scan Next" Button */}
          <button
            onClick={onScanNext}
            className="w-full min-h-[50px] py-3.5 px-4 rounded-xl font-bold font-orbitron text-sm uppercase tracking-wider text-white bg-gradient-to-r from-[#2b4bff] via-[#7c3aed] to-[#d946ef] hover:opacity-95 shadow-[0_0_20px_rgba(124,58,237,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Scan Next Participant</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
