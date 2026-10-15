import React, { useState } from 'react';
import {
  Gamepad2,
  Calendar,
  MapPin,
  Trophy,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Zap,
  Target,
} from 'lucide-react';
import { EVENT_METADATA, GAMES_LIST, SCHEDULE_DATA, FAQ_DATA } from '../config/eventConfig';

export const LandingSections = ({ onSelectTrack }) => {
  const [activePhase, setActivePhase] = useState(0);
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="relative bg-[#05071a] text-slate-100 divide-y divide-white/5">
      
      {/* ========================================================
          1. ABOUT SECTION
      ======================================================== */}
      <section id="about" className="py-10 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-xs font-semibold text-cyan-300">
            <Sparkles className="w-3.5 h-3.5" />
            About The Championship
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-orbitron tracking-tight text-white">
            One Arena. Six Games. Ultimate Glory.
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-rajdhani">
            Organized by <strong>{EVENT_METADATA.school}</strong> under {EVENT_METADATA.institution}, PROXIMA 2026 unites the most skilled mobile tacticians on campus. Whether dropping into custom rooms in Free Fire & BGMI, out-flying opponents in Mini Militia, or delivering clutch stoppage-time goals in eFootball — this is your stage to dominate.
          </p>
        </div>

        {/* 3 Pillars Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-gradient-to-b from-[#0d1338] to-[#070b2a] border border-[#00e5ff]/20 shadow-xl space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#00e5ff]/15 flex items-center justify-center text-[#00e5ff]">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold font-orbitron text-white">Mobile Only Combat</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-rajdhani">
              100% fair play guaranteed. Strict anti-emulator policy, verified device inspections, low-latency arena Wi-Fi, and custom room lobbies for all matches.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-b from-[#1a1440] to-[#070b2a] border border-purple-500/20 shadow-xl space-y-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-300">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold font-orbitron text-white">Live Broadcast & Shoutcast</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-rajdhani">
              Auditorium big-screen spectator projection, dynamic live shoutcasting, clutch killfeed highlights, and crowd cheers as matches reach final circles.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-b from-[#1b1c3b] to-[#070b2a] border border-amber-500/20 shadow-xl space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-400/15 flex items-center justify-center text-amber-300">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold font-orbitron text-white">₹7,000 Prize Pool</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-rajdhani">
              Battle for official championship trophies, cash awards, gold medals, institutional certificates, and the prestigious Tournament MVP distinction.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================
          2. TOURNAMENT DISCIPLINES (GAMES & FORMATS)
      ======================================================== */}
      <section id="tracks" className="py-10 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-xs font-semibold text-cyan-300">
            <Target className="w-3.5 h-3.5" />
            Championship Disciplines
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-orbitron text-white">
            Choose Your Battlefield
          </h2>
          <p className="text-sm text-slate-300 font-rajdhani">
            Open to all bonafide 1st and 2nd Year students across Yenepoya. Select your game to register.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {GAMES_LIST.map((game) => (
            <div
              key={game.id}
              className="rounded-2xl sm:rounded-3xl p-4 sm:p-8 bg-[#080d30] border-2 border-cyan-500/25 hover:border-[#00e5ff] shadow-[0_10px_30px_rgba(0,0,0,0.6)] hover:shadow-neon-blue transition-all flex flex-col justify-between space-y-4 sm:space-y-6"
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                    {game.badge}
                  </span>
                  <span className="text-[10px] sm:text-xs font-mono font-bold text-amber-300">
                    {game.prize}
                  </span>
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-1">
                  <h3 className="text-xl sm:text-3xl font-extrabold font-orbitron text-white">
                    {game.name}
                  </h3>
                  <span className="text-[10px] sm:text-xs font-mono text-cyan-400/80">
                    Max: {game.maxPlayers} Players
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 font-rajdhani leading-relaxed">
                  {game.description}
                </p>

                <div className="p-2.5 sm:p-3 rounded-xl bg-black/40 border border-white/10 space-y-2 text-[11px] sm:text-xs font-rajdhani">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-0.5 sm:gap-2 text-slate-300">
                    <span className="text-slate-400 shrink-0">Match Format:</span>
                    <span className="font-semibold text-white sm:text-right break-words">{game.format}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-slate-300">
                    <span className="text-slate-400">Platform:</span>
                    <span className="font-semibold text-emerald-400">{game.platform}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSelectTrack('eclash')}
                className="w-full py-3 px-3 sm:py-3.5 sm:px-6 rounded-xl font-orbitron font-bold text-[10px] sm:text-xs uppercase tracking-wide sm:tracking-wider bg-gradient-to-r from-[#00e5ff] to-[#2b4bff] text-[#070b2a] shadow-neon-blue hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Gamepad2 className="w-4 h-4" />
                Register for {game.name} →
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================
          3. SCHEDULE & TIMELINE (1-DAY MEGA ESPORTS FEST)
      ======================================================== */}
      <section id="schedule" className="py-10 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-500/30 text-xs font-semibold text-blue-300">
            <Calendar className="w-3.5 h-3.5" />
            Tournament Itinerary
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-orbitron text-white">
            Schedule & Match Timeline
          </h2>
          <p className="text-sm text-slate-300 font-rajdhani">
            Non-stop esports showdown on {EVENT_METADATA.dates.replace(/ \(.*\)/, '')}.
          </p>
        </div>

        {/* Phase Selector Buttons - horizontally scrollable on mobile */}
        <div className="flex gap-2 sm:gap-3 mb-8 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center snap-x"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {SCHEDULE_DATA.map((phaseData, idx) => (
            <button
              key={phaseData.phase}
              onClick={() => setActivePhase(idx)}
              className={`flex-shrink-0 snap-center px-3.5 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold font-rajdhani transition-all flex items-center gap-2 ${
                activePhase === idx
                  ? 'bg-gradient-to-r from-[#00e5ff] to-[#2b4bff] text-[#070b2a] shadow-neon-blue font-extrabold scale-[1.02]'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
              }`}
            >
              <span>{phaseData.phase.split(':')[0]}</span>
              <span className="text-[10px] font-mono opacity-80 hidden sm:inline">({phaseData.timeframe})</span>
            </button>
          ))}
        </div>

        {/* Match Timeline Cards */}
        <div className="max-w-3xl mx-auto space-y-3">
          {SCHEDULE_DATA[activePhase].events.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-white/[0.03] border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.06] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 rounded-lg bg-black/60 text-[#00e5ff] font-mono text-xs font-bold shrink-0 border border-cyan-500/30">
                  {item.time}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white font-rajdhani">{item.title}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-cyan-400" />
                    {item.venue}
                  </div>
                </div>
              </div>
              <div className="sm:text-right">
                <span className={`inline-block text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
                  item.type === 'break'
                    ? 'bg-amber-900/40 text-amber-200 border-amber-500/30'
                    : 'bg-blue-900/60 text-cyan-300 border-cyan-500/30'
                }`}>
                  {item.type === 'break' ? 'Break' : 'Arena Match'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================
          4. PRIZES & AWARDS (₹7,000 CASH POOL)
      ======================================================== */}
      <section id="prizes" className="py-10 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-950/80 border border-yellow-500/30 text-xs font-semibold text-yellow-300">
            <Trophy className="w-3.5 h-3.5" />
            Prize Pool Breakdown
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-orbitron text-white">
            ₹7,000 Championship Prize Pool
          </h2>
          <p className="text-sm text-slate-300 font-rajdhani">
            Winner and runner-up cash awards for all six games. Listed payouts total ₹6,750; the remaining ₹250 is unallocated.
          </p>
        </div>

        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {GAMES_LIST.map((game) => (
            <article
              key={game.id}
              className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#0c133f] to-[#04071d] border border-cyan-500/30 space-y-3 sm:space-y-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm sm:text-lg font-bold font-orbitron text-white">{game.name}</h3>
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-amber-300" />
              </div>
              <div className="flex items-center justify-between gap-1 rounded-lg sm:rounded-xl bg-black/40 border border-cyan-500/20 p-2 sm:p-3">
                <span className="text-xs sm:text-sm font-semibold text-slate-200">Winner</span>
                <span className="text-xs sm:text-base font-mono font-bold text-amber-300">₹{game.winnerPrize.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between gap-1 rounded-lg sm:rounded-xl bg-black/40 border border-purple-500/20 p-2 sm:p-3">
                <span className="text-xs sm:text-sm font-semibold text-slate-200">Runner-up</span>
                <span className="text-xs sm:text-base font-mono font-bold text-purple-200">₹{game.runnerUpPrize.toLocaleString('en-IN')}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ========================================================
          5. TOURNAMENT RULES & FAQ
      ======================================================== */}
      <section id="faq" className="py-14 sm:py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300">
            Tournament Guidelines & Rules
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-orbitron text-white">
            Rules & Frequently Asked Questions
          </h2>
          <p className="text-sm text-slate-300 font-rajdhani">
            Essential guidelines on device policies, campus credentials, match formats, and arena reporting.
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_DATA.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="rounded-xl bg-white/[0.03] border border-cyan-500/20 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 focus:outline-none hover:bg-white/[0.04]"
                >
                  <span className="text-sm sm:text-base font-semibold text-white font-rajdhani">
                    {faq.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-cyan-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/5 pt-3 font-rajdhani">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================
          6. CONTACT & ARENA DESK
      ======================================================== */}
      <section id="contact" className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-6 sm:p-12 rounded-3xl bg-gradient-to-r from-[#0d143d] via-[#151b47] to-[#070b2a] border border-cyan-500/30 relative overflow-hidden shadow-neon-blue">
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-center">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#00e5ff] font-mono">
                Official Esports Tournament Desk
              </span>
              <h2 className="text-xl sm:text-3xl font-extrabold font-orbitron text-white">
                Connect with Tournament Coordinators
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-rajdhani">
                Have questions regarding team registrations, custom game rules, or match scheduling? Contact the student tournament admins directly.
              </p>
              
              <div className="space-y-3 text-xs sm:text-sm font-rajdhani">
                {/* Technical Admin only */}
                <div className="p-3 rounded-xl bg-white/5 border border-cyan-500/20 space-y-1">
                  <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold font-mono">Technical Admin</div>
                  <div className="font-semibold text-white">{EVENT_METADATA.contact.technicalAdmin}</div>
                  <div className="flex flex-wrap gap-3 text-slate-300">
                    <a href={`tel:${EVENT_METADATA.contact.technicalAdminPhone}`} className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
                      <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      {EVENT_METADATA.contact.technicalAdminPhone}
                    </a>
                    <a href={`mailto:${EVENT_METADATA.contact.technicalAdminEmail}`} className="flex items-center gap-1 hover:text-cyan-400 transition-colors break-all">
                      <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      {EVENT_METADATA.contact.technicalAdminEmail}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-2 pt-1 text-xs text-slate-400">
                  <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{EVENT_METADATA.institution}, {EVENT_METADATA.campus}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <button
                onClick={() => onSelectTrack('eclash')}
                className="w-full sm:w-auto py-4 px-6 rounded-xl font-orbitron font-extrabold text-xs uppercase bg-gradient-to-r from-[#00e5ff] to-[#2b4bff] text-[#070b2a] shadow-neon-blue hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Gamepad2 className="w-4 h-4" />
                Register for E-Clash 🎮
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
