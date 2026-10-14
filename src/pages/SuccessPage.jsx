import React from 'react';
import { motion } from 'framer-motion';
import { TicketPass } from '../components/TicketPass';
import { RegistrationSteps } from '../components/RegistrationSteps';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { PAYMENT_CONFIG } from '../config/eventConfig';

export const SuccessPage = ({ registrationData, onBackToHome }) => (
  <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex flex-col justify-between bg-[#040618] text-white">
    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#00e5ff] via-[#2b4bff] to-[#7c3aed]" />

    <div className="max-w-4xl mx-auto w-full relative z-10 my-auto space-y-6">
      <RegistrationSteps currentStep="Ticket" />

      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="text-center space-y-3"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black font-orbitron tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-[#00e5ff]">
          Registration Confirmed!
        </h1>
        <p className="text-sm sm:text-base max-w-xl mx-auto text-slate-300 font-rajdhani">
          Your payment proof has been submitted. The organizer will verify the UTR against the payment statement.
        </p>
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-200">
          <Sparkles className="h-4 w-4" />
          Payment submitted · Awaiting verification
        </div>
        {registrationData?.paymentUtr && (
          <p className="text-xs font-mono text-slate-400">
            UTR submitted: <span className="text-cyan-200">{registrationData.paymentUtr}</span>
          </p>
        )}
      </motion.div>

      <div className="rounded-3xl border border-cyan-500/30 bg-[#090e38]/90 p-5 sm:p-7 shadow-[0_0_30px_rgba(0,229,255,0.15)]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300 font-mono">Entry Pass</p>
            <h2 className="text-lg font-black font-orbitron text-white">PROXIMA E-CLASH 2026</h2>
          </div>
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-100">
            Payment submitted · ₹{PAYMENT_CONFIG.ENTRY_FEE}
          </div>
        </div>
        <TicketPass registrationData={registrationData} onBackToHome={onBackToHome} />
      </div>

    </div>

    <div className="text-center text-xs text-slate-500 mt-10">
      PROXIMA 2026 • Yenepoya School of Engineering and Technology
    </div>
  </div>
);
