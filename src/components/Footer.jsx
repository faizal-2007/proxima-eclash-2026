import React from 'react';
import { Gamepad2, MapPin, Mail, ShieldCheck, Sparkles, Shield, TicketCheck } from 'lucide-react';
import { EVENT_METADATA } from '../config/eventConfig';

export const Footer = ({ onNavigate, onReplayIntro }) => {
  const handleLink = (hash) => {
    if (onNavigate) {
      onNavigate(hash);
    } else {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="relative bg-[#040616] text-slate-300 border-t border-cyan-900/30 overflow-hidden">
      {/* Top cyber gradient strip */}
      <div className="w-full h-1.5 bg-gradient-to-r from-[#00e5ff] via-[#2b4bff] to-[#7c3aed]" />

      {/* Background ambient lighting */}
      <div className="absolute top-0 left-10 w-72 h-72 bg-[#00e5ff]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-72 h-72 bg-[#7c3aed]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Col 1: Brand & Institution */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden p-[1.5px] bg-gradient-to-tr from-[#00e5ff] via-[#2b4bff] to-[#7c3aed] shadow-[0_0_15px_rgba(0,229,255,0.4)] shrink-0">
                <img
                  src="/proxima-logo.png"
                  alt="PROXIMA 2026 Logo"
                  className="w-full h-full object-cover rounded-[10px]"
                />
              </div>
              <div className="font-orbitron font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-[#00e5ff]">
                PROXIMA <span className="text-[#00e5ff]">2026</span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-rajdhani">
              The flagship annual inter-year esports championship of Yenepoya School of Engineering & Technology. Where Virtual Worlds Become Battlefields.
            </p>
            <div className="p-3 rounded-xl bg-white/[0.04] border border-cyan-500/20 space-y-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-cyan-300 font-mono">
                Host Institution
              </div>
              <div className="text-xs font-semibold text-white">
                {EVENT_METADATA.school}
              </div>
              <div className="text-[10px] text-slate-400">
                {EVENT_METADATA.institution}
              </div>
              <div className="text-[11px] text-slate-300 flex items-start gap-1 pt-1 font-rajdhani">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-cyan-400 mt-0.5" />
                <span>{EVENT_METADATA.campus}</span>
              </div>
            </div>
          </div>

          {/* Col 2: Official Tournament Games */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-orbitron font-bold text-[#00e5ff]">
              <Gamepad2 className="w-4 h-4" />
              TOURNAMENT GAMES
            </div>
            <p className="text-xs text-slate-300 font-rajdhani">
              Free Fire • BGMI • Mini Militia • eFootball • Carrom
            </p>
            <ul className="space-y-2 text-xs text-slate-300 font-rajdhani">
              <li>
                <button onClick={() => handleLink('#tracks')} className="hover:text-[#00e5ff] transition-colors">
                  → Free Fire (Battle Royale)
                </button>
              </li>
              <li>
                <button onClick={() => handleLink('#tracks')} className="hover:text-[#00e5ff] transition-colors">
                  → BGMI (Battle Royale)
                </button>
              </li>
              <li>
                <button onClick={() => handleLink('#tracks')} className="hover:text-[#00e5ff] transition-colors">
                  → Mini Militia (FFA Doodle Army)
                </button>
              </li>
              <li>
                <button onClick={() => handleLink('#tracks')} className="hover:text-[#00e5ff] transition-colors">
                  → eFootball (1v1 Football Simulation)
                </button>
              </li>
              <li>
                <button onClick={() => handleLink('#tracks')} className="hover:text-[#00e5ff] transition-colors">
                  → Carrom (1v1 Disc Pot Clash)
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Fair Play & Guidelines */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-orbitron font-bold text-purple-300">
              <Shield className="w-4 h-4" />
              RULES & POLICIES
            </div>
            <p className="text-xs text-slate-300 font-rajdhani">
              Strict fair play and competitive integrity
            </p>
            <ul className="space-y-2 text-xs text-slate-300 font-rajdhani">
              <li>• Mobile Only — Emulators Strictly Prohibited</li>
              <li>• Campus ID & Email Verification Mandatory</li>
              <li>• Low Latency Arena Wi-Fi & Live Shoutcast</li>

            </ul>
          </div>

          {/* Col 4: Quick Links & Contact */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-white tracking-wide font-orbitron">
              Connect & Support
            </div>
            <div className="space-y-2 text-xs text-slate-300 font-rajdhani">
              <div className="text-[11px] text-slate-400">
                Technical Admin: {EVENT_METADATA.contact.technicalAdmin} · {EVENT_METADATA.contact.technicalAdminPhone}
              </div>
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => handleLink('#hall-pass')}
                  className="px-2.5 py-1 rounded-md bg-cyan-900/40 hover:bg-cyan-900/60 text-[11px] text-cyan-200 border border-cyan-500/40 flex items-center gap-1 cursor-pointer"
                >
                  <TicketCheck className="w-3 h-3 text-cyan-400" />
                  Hall Pass
                </button>
                <button
                  onClick={() => handleLink('#faq')}
                  className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[11px] border border-white/10"
                >
                  Rules FAQ
                </button>
                <button
                  onClick={() => handleLink('#admin')}
                  className="px-2.5 py-1 rounded-md bg-purple-900/30 hover:bg-purple-900/50 text-[11px] text-purple-300 border border-purple-500/30 flex items-center gap-1 cursor-pointer"
                >
                  <ShieldCheck className="w-3 h-3" />
                  Admin
                </button>
                <button
                  onClick={() => handleLink('#volunteer/login')}
                  className="px-2.5 py-1 rounded-md bg-blue-900/30 hover:bg-blue-900/50 text-[11px] text-blue-300 border border-blue-500/30 flex items-center gap-1 cursor-pointer"
                >
                  <Gamepad2 className="w-3 h-3 text-cyan-400" />
                  Volunteer Check-in
                </button>
                {onReplayIntro && (
                  <button
                    onClick={onReplayIntro}
                    className="px-2.5 py-1 rounded-md bg-cyan-900/30 hover:bg-cyan-900/50 text-[11px] text-cyan-300 border border-cyan-500/30 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    Replay Intro
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            © 2026 PROXIMA E-CLASH • All rights reserved • Yenepoya (Deemed to be University).
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 font-mono text-xs">
            <span>Powered by Proxima. United by Yenepoya.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
