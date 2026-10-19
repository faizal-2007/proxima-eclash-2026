import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Gamepad2, Clock, Sparkles, ChevronRight, Trophy, Shield, MapPin, Calendar } from 'lucide-react';
import { EVENT_METADATA, GAMES_LIST } from '../config/eventConfig';
import {
  LayerBackground,
  LayerGamingScene,
  LayerControllerOutline,
  LayerFog,
  LayerTournamentRunes,
  LayerParticles,
} from './HeroArtworkLayers';

export const SplitHero = ({ onSelectTrack, _isIntroActive = false }) => {
  // Live Countdown Timer logic
  const [timeLeft, setTimeLeft] = useState({ days: 32, hours: 14, minutes: 45, seconds: 20 });
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Parallax motion values (Mouse on desktop / Gyro drift on mobile)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring physics for silky 60fps parallax
  const springConfig = { damping: 25, stiffness: 120, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Depth transforms for each layer
  const bgX = useTransform(smoothX, [-1, 1], [-6, 6]);
  const bgY = useTransform(smoothY, [-1, 1], [-6, 6]);

  const gamingX = useTransform(smoothX, [-1, 1], [-20, 20]);
  const gamingY = useTransform(smoothY, [-1, 1], [-14, 14]);

  const controllerX = useTransform(smoothX, [-1, 1], [-32, 32]);
  const controllerY = useTransform(smoothY, [-1, 1], [-26, 26]);

  const runesX = useTransform(smoothX, [-1, 1], [28, -28]);
  const runesY = useTransform(smoothY, [-1, 1], [22, -22]);

  const particlesX = useTransform(smoothX, [-1, 1], [-35, 35]);
  const particlesY = useTransform(smoothY, [-1, 1], [-25, 25]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    // Live countdown calculation to target date
    const targetDate = new Date(EVENT_METADATA.countdownTarget).getTime();
    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    };

    updateCountdown();
    const timerInterval = setInterval(updateCountdown, 1000);

    return () => {
      window.removeEventListener('resize', checkMobile);
      clearInterval(timerInterval);
    };
  }, []);

  // Parallax mouse move listener
  const handleMouseMove = (e) => {
    if (isMobile || prefersReducedMotion) return;
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth) * 2 - 1;
    const y = (clientY / innerHeight) * 2 - 1;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <section
      id="hero"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full min-h-[100dvh] sm:min-h-[92vh] flex flex-col justify-between overflow-hidden bg-[#030616] pt-2 sm:pt-6 pb-7 sm:pb-12 selection:bg-cyan-500 selection:text-black"
    >
      {/* -------------------------------------------------------------
          PARALLAX ARTWORK LAYERS
      ------------------------------------------------------------- */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={prefersReducedMotion ? {} : { x: bgX, y: bgY }}
        >
          <LayerBackground isMobile={isMobile} />
        </motion.div>

        {/* Layer 2: Battlestation and multi-monitors */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={prefersReducedMotion ? {} : { x: gamingX, y: gamingY }}
        >
          <LayerGamingScene />
        </motion.div>

        {/* Layer 3: Floating 3D Cyber Controller Outline */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={prefersReducedMotion ? {} : { x: controllerX, y: controllerY }}
        >
          <LayerControllerOutline />
        </motion.div>

        {/* Layer 4: Holographic Tournament Trophy & Reticles */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={prefersReducedMotion ? {} : { x: runesX, y: runesY }}
        >
          <LayerTournamentRunes />
        </motion.div>

        {/* Layer 5: Stage Fog */}
        <LayerFog />

        {/* Layer 6: Cyber Sparks & Floating Particles */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={prefersReducedMotion ? {} : { x: particlesX, y: particlesY }}
        >
          <LayerParticles />
        </motion.div>
      </div>

      {/* -------------------------------------------------------------
          HERO CENTERPIECE CONTENT
      ------------------------------------------------------------- */}
      <div className="relative z-20 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full flex flex-col items-center text-center mt-2 sm:mt-4">
        {/* Host Institution Attribution Pill */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 backdrop-blur-md text-[10px] sm:text-sm font-rajdhani font-semibold text-cyan-200 shadow-[0_0_20px_rgba(0,229,255,0.25)] mb-3 max-w-[90vw] overflow-hidden"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
          <span className="truncate">{EVENT_METADATA.school}</span>
          <span className="opacity-50 shrink-0 hidden xs:inline">•</span>
          <span className="text-white/80 hidden sm:inline truncate">{EVENT_METADATA.institution}</span>
        </motion.div>

        {/* Tournament Brand Logo Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="relative mb-2 sm:mb-3 group"
        >
          <div className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-2xl overflow-hidden p-[2px] bg-gradient-to-tr from-[#00e5ff] via-[#2b4bff] to-[#7c3aed] shadow-[0_0_40px_rgba(0,229,255,0.5)] group-hover:shadow-[0_0_60px_rgba(0,229,255,0.8)] transition-all duration-300">
            <img
              src="/proxima-logo.png"
              alt="PROXIMA 2026 Logo"
              className="w-full h-full object-cover rounded-[14px]"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#00e5ff] flex items-center justify-center text-[#070b2a] shadow-[0_0_12px_#00e5ff]">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </motion.div>

        {/* Main Tournament Branding */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="space-y-2 max-w-4xl"
        >
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[9px] sm:text-xs font-mono font-bold tracking-wide sm:tracking-widest uppercase text-[#00e5ff]">
            <Gamepad2 className="w-3.5 h-3.5" />
            OFFICIAL COLLEGIATE ESPORTS TOURNAMENT
          </div>

          <h1 className="font-orbitron font-black text-3xl min-[360px]:text-4xl sm:text-6xl md:text-7xl tracking-wide sm:tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-[#00e5ff] drop-shadow-[0_0_35px_rgba(0,229,255,0.7)]">
            PROXIMA <span className="text-[#00e5ff]">2026</span>
          </h1>

          <div className="font-orbitron font-extrabold text-base min-[360px]:text-lg sm:text-3xl md:text-4xl tracking-wide sm:tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#00e5ff] via-blue-300 to-[#7c3aed]">
            E-CLASH CHAMPIONSHIP 🎮
          </div>

          <p className="text-xs sm:text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-rajdhani font-medium pt-1 sm:pt-2">
            Where Virtual Worlds Become Battlefields. The premier battlefield for Free Fire, BGMI, Mini Militia, eFootball & Carrom at Yenepoya University.
          </p>
        </motion.div>

        {/* Tournament Highlights Pills */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-3 sm:mt-6 text-[10px] sm:text-sm font-rajdhani font-bold max-w-[95vw]"
        >
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-400/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{EVENT_METADATA.totalPrizePool} Prize Pool</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-200">
            <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Mobile Only</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-200">
            <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>{EVENT_METADATA.shortDate || 'Oct 26, 2026'}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-950/60 border border-blue-500/30 text-blue-200">
            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Balmatta Campus</span>
          </div>
        </motion.div>

        {/* Live Countdown Timer HUD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-3 sm:mt-7 p-2.5 sm:p-4 rounded-2xl bg-[#070b2a]/90 border border-cyan-500/30 backdrop-blur-xl shadow-[0_0_30px_rgba(0,229,255,0.2)] flex flex-col items-center w-full max-w-xs sm:max-w-none"
        >
          <div className="flex items-center gap-2 text-[10px] sm:text-xs font-mono uppercase tracking-widest text-cyan-300 mb-2">
            <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
            <span>Tournament Kickoff Countdown</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 sm:gap-4 font-orbitron text-center w-full">
            <div className="px-2 sm:px-4 py-2 rounded-xl bg-black/50 border border-cyan-500/20">
              <span className="block text-xl sm:text-3xl font-black text-[#00e5ff] drop-shadow-[0_0_10px_#00e5ff]">
                {String(timeLeft.days).padStart(2, '0')}
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono uppercase text-slate-400">Days</span>
            </div>
            <div className="px-2 sm:px-4 py-2 rounded-xl bg-black/50 border border-cyan-500/20">
              <span className="block text-xl sm:text-3xl font-black text-white">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono uppercase text-slate-400">Hrs</span>
            </div>
            <div className="px-2 sm:px-4 py-2 rounded-xl bg-black/50 border border-cyan-500/20">
              <span className="block text-xl sm:text-3xl font-black text-white">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono uppercase text-slate-400">Mins</span>
            </div>
            <div className="px-2 sm:px-4 py-2 rounded-xl bg-black/50 border border-cyan-500/20">
              <span className="block text-xl sm:text-3xl font-black text-[#00e5ff] drop-shadow-[0_0_10px_#00e5ff]">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono uppercase text-slate-400">Secs</span>
            </div>
          </div>
        </motion.div>

        {/* Primary Master CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mt-3 sm:mt-7 w-full max-w-md px-1"
        >
          <button
            onClick={() => onSelectTrack('eclash')}
            className="w-full py-3 sm:py-4 px-6 sm:px-8 rounded-xl font-orbitron font-extrabold text-xs sm:text-base tracking-wide sm:tracking-wider uppercase flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-r from-[#00e5ff] via-[#2b4bff] to-[#7c3aed] text-white shadow-[0_0_30px_rgba(0,229,255,0.6)] hover:brightness-110 active:scale-[0.98] transition-all group"
          >
            <Gamepad2 className="w-5 h-5 text-cyan-200 group-hover:rotate-12 transition-transform" />
            <span>Register Now 🎮</span>
            <ChevronRight className="w-4 h-4 stroke-[3] group-hover:translate-x-1.5 transition-transform" />
          </button>

          <a
            href="#tracks"
            className="w-full sm:w-auto py-3.5 px-6 rounded-xl font-rajdhani font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/20 text-slate-200 transition-all"
          >
            <span>Explore Games ↓</span>
          </a>
        </motion.div>
      </div>

      {/* -------------------------------------------------------------
          4 FEATURED ESPORTS GAMES SHOWCASE (Responsive Cards in Hero)
      ------------------------------------------------------------- */}
      <div className="relative z-20 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full mt-5 sm:mt-10">
        <div className="text-center mb-4">
          <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-cyan-400/90 font-bold">
            ⚔️ 6 OFFICIAL TOURNAMENT DISCIPLINES • MOBILE ONLY ⚔️
          </span>
        </div>

        {/* Mobile-friendly two-column cards; larger screens use a wider grid. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {GAMES_LIST.map((game, idx) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 + idx * 0.1 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              onClick={() => onSelectTrack('eclash')}
              className="cursor-pointer group min-w-0 p-2.5 sm:p-5 rounded-xl sm:rounded-2xl bg-[#070b2a]/90 border border-cyan-500/25 hover:border-[#00e5ff] backdrop-blur-xl shadow-[0_10px_25px_rgba(0,0,0,0.5)] hover:shadow-[0_0_30px_rgba(0,229,255,0.35)] transition-all flex flex-col justify-between space-y-2 sm:space-y-4"
            >
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 mb-2 sm:mb-3">
                  <span className="w-fit text-[8px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold uppercase">
                    {game.badge}
                  </span>
                </div>

                <h3 className="font-orbitron font-extrabold text-sm sm:text-xl text-white group-hover:text-[#00e5ff] transition-colors flex items-center gap-2">
                  {game.name}
                </h3>

                <p className="hidden sm:block mt-1.5 text-xs text-slate-300 leading-relaxed font-rajdhani font-medium line-clamp-2">
                  {game.description}
                </p>
              </div>

              <div className="pt-1.5 sm:pt-2 border-t border-white/10 flex items-center justify-between gap-1">
                <span className="text-[8px] sm:text-[10px] font-mono text-slate-400 truncate">
                  {game.platform}
                </span>
                <span className="text-[9px] sm:text-xs font-rajdhani font-bold text-[#00e5ff] flex items-center gap-0.5 group-hover:translate-x-1 transition-transform shrink-0">
                  Register <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom Indicator */}
      <div className="relative z-20 pt-5 sm:pt-8 pb-2 px-3 text-center pointer-events-none">
        <span className="text-[9px] sm:text-[11px] font-medium tracking-wide sm:tracking-widest uppercase text-slate-400/80">
          Scroll Down to View Schedule, Prizes & Tournament Rules ↓
        </span>
      </div>
    </section>
  );
};
