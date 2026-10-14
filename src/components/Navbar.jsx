import React, { useState } from 'react';
import { Menu, X, Gamepad2, ShieldCheck, Sparkles, Trophy, QrCode } from 'lucide-react';
import { EVENT_METADATA } from '../config/eventConfig';

export const Navbar = ({ onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLinkClick = (hash) => {
    setMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(hash);
    } else {
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#070b2a]/85 border-b border-cyan-500/20 transition-all duration-300">
      {/* Top micro-bar: University & School Attribution */}
      <div className="w-full bg-gradient-to-r from-[#2b4bff] via-[#00e5ff] to-[#7c3aed] py-1 px-3 text-center text-[10px] sm:text-xs font-medium tracking-wide text-white/95 flex items-center justify-center gap-1.5 overflow-hidden">
        <Sparkles className="w-3 h-3 inline animate-pulse text-amber-200 shrink-0" />
        <span className="truncate text-center">
          <strong>{EVENT_METADATA.school}</strong>
          <span className="hidden xs:inline"> • {EVENT_METADATA.institution}</span>
        </span>
        <span className="hidden sm:inline opacity-75">•</span>
        <span className="hidden sm:inline text-white/90 font-semibold shrink-0">{EVENT_METADATA.dates}</span>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand Logo & Name */}
        <button
          onClick={() => handleLinkClick('#hero')}
          className="flex min-w-0 items-center gap-2 sm:gap-3 text-left group focus:outline-none"
        >
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden p-[1.5px] bg-gradient-to-tr from-[#00e5ff] via-[#2b4bff] to-[#7c3aed] transition-transform duration-300 group-hover:scale-105 shadow-[0_0_15px_rgba(0,229,255,0.4)] shrink-0">
            <img
              src="/proxima-logo.png"
              alt="PROXIMA Logo"
              className="w-full h-full object-cover rounded-[10px]"
            />
          </div>
          <div className="min-w-0">
            <div className="font-orbitron font-black text-sm sm:text-lg md:text-xl tracking-wide sm:tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-[#00e5ff] group-hover:opacity-90 whitespace-nowrap">
              PROXIMA <span className="text-[#00e5ff]">E-CLASH</span>
            </div>
            <div className="hidden sm:block text-[10px] font-medium text-slate-300 tracking-tight leading-none">
              Yenepoya School of Engineering & Technology
            </div>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-200">
          <button onClick={() => handleLinkClick('#about')} className="hover:text-[#00e5ff] transition-colors">
            About
          </button>
          <button onClick={() => handleLinkClick('#tracks')} className="hover:text-cyan-300 transition-colors">
            Games
          </button>
          <button onClick={() => handleLinkClick('#schedule')} className="hover:text-blue-300 transition-colors">
            Schedule
          </button>
          <button onClick={() => handleLinkClick('#prizes')} className="hover:text-purple-300 transition-colors">
            Prizes
          </button>
          <button onClick={() => handleLinkClick('#faq')} className="hover:text-slate-100 transition-colors">
            Rules & FAQ
          </button>
          <button onClick={() => handleLinkClick('#contact')} className="hover:text-slate-100 transition-colors">
            Contact
          </button>
        </nav>

        {/* Action CTAs & Admin / Volunteer Links */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={() => handleLinkClick('#register-eclash')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-orbitron font-bold tracking-wider uppercase bg-gradient-to-r from-[#00e5ff] to-[#2b4bff] text-[#070b2a] shadow-neon-blue hover:brightness-110 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <Gamepad2 className="w-4 h-4" />
            Register Now
          </button>
          <button
            onClick={() => handleLinkClick('#volunteer/login')}
            title="Volunteer Check-in Portal"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5 text-cyan-400" />
            <span>Volunteer</span>
          </button>
          <button
            onClick={() => handleLinkClick('#admin')}
            title="Admin Command Center"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile: Quick CTA + Hamburger */}
        <div className="flex sm:hidden items-center gap-1.5 shrink-0">
          <button
            onClick={() => handleLinkClick('#register-eclash')}
            className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-[10px] font-orbitron font-bold tracking-wide uppercase bg-gradient-to-r from-[#00e5ff] to-[#2b4bff] text-[#070b2a] shadow-neon-blue active:scale-95 transition-all duration-200"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            Register
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-200 hover:bg-white/10 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-[#070b2a]/98 backdrop-blur-2xl border-b border-cyan-500/30 px-4 pt-3 pb-6 space-y-3">
          <button
            onClick={() => handleLinkClick('#register-eclash')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-orbitron font-bold tracking-wider uppercase bg-gradient-to-r from-[#00e5ff] to-[#2b4bff] text-[#070b2a] shadow-neon-blue cursor-pointer"
          >
            <Gamepad2 className="w-4 h-4" />
            Register for Tournament 🎮
          </button>

          <button
            onClick={() => handleLinkClick('#volunteer/login')}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#2b4bff] via-[#7c3aed] to-[#d946ef] shadow-md cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            Volunteer Check-in Portal
          </button>

          <div className="flex flex-col space-y-2 text-sm text-slate-200 pt-2 border-t border-white/10">
            <button onClick={() => handleLinkClick('#about')} className="text-left py-1.5 hover:text-[#00e5ff]">
              About Tournament
            </button>
            <button onClick={() => handleLinkClick('#tracks')} className="text-left py-1.5 hover:text-cyan-300">
              Tournament Games (Free Fire, BGMI, etc.)
            </button>
            <button onClick={() => handleLinkClick('#schedule')} className="text-left py-1.5 hover:text-blue-300">
              Event Schedule
            </button>
            <button onClick={() => handleLinkClick('#prizes')} className="text-left py-1.5 hover:text-purple-300">
              Prizes & Awards (₹7,000)
            </button>
            <button onClick={() => handleLinkClick('#faq')} className="text-left py-1.5 hover:text-slate-100">
              Rules & FAQ
            </button>
            <button onClick={() => handleLinkClick('#contact')} className="text-left py-1.5 hover:text-slate-100">
              Contact & Venue
            </button>
            <button onClick={() => handleLinkClick('#admin')} className="text-left py-1.5 text-purple-300 hover:text-purple-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Command Center</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
