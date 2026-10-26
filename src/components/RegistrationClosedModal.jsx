import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ban, X, Trophy, AlertTriangle } from 'lucide-react';
import { REGISTRATION_BUTTON_TEXT, REGISTRATION_STATUS_BADGE } from '../config/eventConfig';

export const RegistrationClosedModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-gradient-to-b from-[#0f1738] via-[#090e29] to-[#06091d] border border-red-500/40 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(239,68,68,0.25)] text-center overflow-hidden z-10"
          >
            {/* Top decorative neon accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/70 border border-red-500/50 text-xs sm:text-sm font-mono font-bold tracking-wider text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.35)] mb-5">
              <span>{REGISTRATION_STATUS_BADGE}</span>
            </div>

            {/* Icon */}
            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-[0_0_25px_rgba(239,68,68,0.3)] mb-4">
              <Ban className="w-9 h-9 sm:w-11 sm:h-11" />
            </div>

            {/* Heading */}
            <h2 className="text-xl sm:text-2xl font-black font-orbitron tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-red-100 to-red-400 mb-3">
              🚫 REGISTRATIONS CLOSED
            </h2>

            {/* Exact Content Message */}
            <div className="space-y-3.5 text-slate-300 text-sm sm:text-base font-rajdhani leading-relaxed text-center px-1 sm:px-4">
              <p className="font-semibold text-slate-200">
                Registrations for Proxima E-Clash 2026 are now officially closed, as the event has begun.
              </p>

              <p className="text-slate-400 text-xs sm:text-sm">
                Thank you for your interest and support! Stay tuned for future events and updates.
              </p>

              <div className="p-3 rounded-xl bg-black/40 border border-red-500/20 text-amber-300 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                <span>🏆 The registrations are no longer accepting new entries.</span>
              </div>

              <p className="text-xs sm:text-sm font-mono font-bold text-cyan-300 pt-1">
                — Team Proxima E-Clash 2026
              </p>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                disabled
                className="w-full sm:w-auto py-3 px-6 rounded-xl font-orbitron font-bold text-xs uppercase tracking-wider bg-red-950/60 border border-red-500/40 text-red-300 opacity-80 cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Ban className="w-4 h-4 text-red-400" />
                <span>{REGISTRATION_BUTTON_TEXT}</span>
              </button>

              <button
                onClick={onClose}
                className="w-full sm:w-auto py-3 px-6 rounded-xl font-rajdhani font-bold text-xs uppercase tracking-wider bg-white/10 hover:bg-white/15 border border-white/20 text-white transition-all cursor-pointer"
              >
                Close & View Brackets
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
