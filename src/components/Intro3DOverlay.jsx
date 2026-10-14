import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Gamepad2, Trophy, FastForward } from 'lucide-react';

export const Intro3DOverlay = ({ onComplete }) => {
  const [phase, setPhase] = useState('loading'); // 'loading' | 'doors' | 'complete'
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing Esports Engine...');
  const [isMobile, setIsMobile] = useState(false);

  const finishIntro = useCallback(() => {
    sessionStorage.setItem('has_seen_proxima_intro', 'true');
    setPhase('complete');
    onComplete?.(false);
  }, [onComplete]);

  useEffect(() => {
    // Check mobile screen
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      onComplete?.(true);
      return () => window.removeEventListener('resize', checkMobile);
    }

    // Check sessionStorage: Allow intro on page reload or fresh visit
    const isReload = window.performance?.getEntriesByType?.('navigation')?.[0]?.type === 'reload';
    const hasSeenIntro = sessionStorage.getItem('has_seen_proxima_intro');
    if (!isReload && hasSeenIntro === 'true') {
      onComplete?.(true);
      return () => window.removeEventListener('resize', checkMobile);
    }

    // -------------------------------------------------------------
    // Spontaneous 2.0-Second Organic Progress Loader Engine
    // High-octane tournament asset compilation & telemetry
    // -------------------------------------------------------------
    const TOTAL_DURATION = 2000; // Exactly 2.0 seconds

    const milestones = [
      { t: 0, pct: 0, text: 'Initializing Esports Engine...' },
      { t: 140, pct: 21, text: 'Compiling 3D Arena Shaders...' },
      { t: 480, pct: 52, text: 'Calibrating Free Fire & BGMI Lobbies...' },
      { t: 660, pct: 64, text: 'Synchronizing eFootball, Mini Militia, Ludo & Carrom...' },
      { t: 900, pct: 70, text: 'Calibrating Tournament Brackets...' },
      { t: 1250, pct: 88, text: 'Configuring High-Speed Arena LAN...' },
      { t: 1520, pct: 93, text: 'Connecting Yenepoya Student Portal...' },
      { t: 1800, pct: 99, text: 'Powering Up PROXIMA E-CLASH 2026...' },
      { t: 2000, pct: 100, text: 'Esports Arena Ready!' },
    ];

    const startTime = Date.now();
    let doorsTimer;
    let finishTimer;

    const intervalTimer = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.min(now - startTime, TOTAL_DURATION);

      // Find current milestone segment
      let segmentIndex = 0;
      for (let i = 0; i < milestones.length - 1; i++) {
        if (elapsed >= milestones[i].t) {
          segmentIndex = i;
        }
      }

      const current = milestones[segmentIndex];
      const next = milestones[segmentIndex + 1] || current;

      // Segment progress ratio [0, 1]
      const span = next.t - current.t;
      const segElapsed = elapsed - current.t;
      const ratio = span > 0 ? Math.min(1, Math.max(0, segElapsed / span)) : 1;

      // Organic easeInOut within segment for lifelike acceleration
      const eased = ratio < 0.5 
        ? 2 * ratio * ratio 
        : 1 - Math.pow(-2 * ratio + 2, 2) / 2;

      const currentPct = current.pct + (next.pct - current.pct) * eased;
      const roundedPct = Math.min(100, Math.max(0, Math.round(currentPct)));

      setProgress(roundedPct);
      setStatusText(current.text);

      if (elapsed >= TOTAL_DURATION) {
        clearInterval(intervalTimer);
        setProgress(100);
        setStatusText('Esports Arena Ready!');

        // Immediately transition to 3D doors opening at 2.0s
        doorsTimer = setTimeout(() => {
          setPhase('doors');
        }, 80);

        // Complete 3D intro (snappy 1.1s door swing)
        finishTimer = setTimeout(() => {
          finishIntro();
        }, 1200);
      }
    }, 20);

    return () => {
      window.removeEventListener('resize', checkMobile);
      clearInterval(intervalTimer);
      if (doorsTimer) clearTimeout(doorsTimer);
      if (finishTimer) clearTimeout(finishTimer);
    };
  }, []);


  const handleSkip = () => {
    sessionStorage.setItem('has_seen_proxima_intro', 'true');
    finishIntro();
  };

  if (phase === 'complete') return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-auto" style={{ perspective: '1400px' }}>
        
        {/* Skip Intro Button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 z-[110] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white backdrop-blur-md border border-white/20 text-xs font-medium tracking-wide transition-all shadow-lg active:scale-95"
        >
          <span>Skip Intro</span>
          <FastForward className="w-3.5 h-3.5" />
        </button>

        {/* -------------------------------------------------------------
            STAGE 1: 2.0-SECOND SPONTANEOUS PROGRESS BAR & EMBLEM LOADER
        ------------------------------------------------------------- */}
        {phase === 'loading' && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-[#040618] flex flex-col items-center justify-center p-4 z-[100]"
          >
            {/* Glowing Festival Emblem */}
            <motion.div
              animate={{ scale: [0.96, 1.05, 1], rotate: [0, 2, 0] }}
              transition={{ duration: 1.8, ease: 'easeOut' }}
              className="relative mb-6"
            >
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden p-[2px] bg-gradient-to-tr from-[#00e5ff] via-[#2b4bff] to-[#7c3aed] shadow-[0_0_45px_rgba(0,229,255,0.75)]">
                <img
                  src="/proxima-logo.png"
                  alt="PROXIMA 2026 Logo"
                  className="w-full h-full object-cover rounded-[14px]"
                />
              </div>
              <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#00e5ff] flex items-center justify-center text-black shadow-lg">
                <Sparkles className="w-3 h-3 text-black" />
              </div>
            </motion.div>

            {/* Glowing Brand Title */}
            <motion.h2
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="font-orbitron font-black text-2xl sm:text-3xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#00e5ff] via-blue-200 to-[#7c3aed] drop-shadow-[0_0_25px_rgba(0,229,255,0.8)] text-center"
            >
              PROXIMA E-CLASH
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="text-xs text-cyan-300/80 tracking-wider uppercase mt-1 font-mono text-center"
            >
              Yenepoya School of Engineering & Technology • 2026
            </motion.p>

            {/* Futuristic Spontaneous Progress Bar (2.0s High-Velocity Organic Engine) */}
            <div className="w-64 sm:w-80 mt-8 space-y-2.5">
              {/* Top Readout: Live Indicator, Status Message & Orbitron Counter */}
              <div className="flex items-center justify-between text-[11px] font-mono tracking-tight">
                <div className="flex items-center gap-1.5 truncate pr-2 text-cyan-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-ping shrink-0" />
                  <span className="truncate">{statusText}</span>
                </div>
                <div className="font-orbitron font-bold text-sm text-[#00e5ff] drop-shadow-[0_0_10px_rgba(0,229,255,0.9)] shrink-0">
                  {progress}%
                </div>
              </div>

              {/* Progress Track */}
              <div className="relative w-full h-3 bg-[#030617]/90 rounded-full overflow-hidden border border-cyan-500/30 p-[2px] shadow-[0_0_20px_rgba(0,229,255,0.25),inset_0_2px_4px_rgba(0,0,0,0.9)] backdrop-blur-md">
                {/* Background Grid Accent */}
                <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(90deg,transparent,transparent_4px,#00e5ff_4px,#00e5ff_5px)]" />

                {/* Spontaneous Progress Fill with Shimmer & Radiant Tip Spark */}
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#00e5ff] via-[#2b4bff] to-[#7c3aed] relative shadow-[0_0_18px_rgba(0,229,255,0.8)]"
                  style={{
                    width: `${progress}%`,
                    transition: 'width 30ms linear',
                  }}
                >
                  {/* Energy glint beam sweeping continuously across the filled bar */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />

                  {/* Leading Edge Radiant Spark Orb */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_10px_#ffffff,0_0_20px_#00e5ff] scale-110 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
                  </div>
                </div>
              </div>

              {/* Bottom Telemetry Bar */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400/80 px-0.5">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  2.0s ESPORTS ARENA SYNC
                </span>
                <span className="tracking-wider uppercase text-cyan-400/80 font-bold">
                  BALMATTA CAMPUS
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* -------------------------------------------------------------
            STAGE 2: 3D CYBER BLAST DOORS SWINGING OPEN (Snappy 1.1s reveal)
        ------------------------------------------------------------- */}
        {phase === 'doors' && (
          <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ perspective: '1400px' }}>
            
            {/* Desktop Mode: Left (Gaming Sector Alpha) & Right (Gaming Sector Beta) */}
            {!isMobile ? (
              <>
                {/* Left Door - Swings on Left Hinge */}
                <motion.div
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: -110, opacity: 0 }}
                  transition={{ duration: 1.1, ease: [0.25, 1, 0.5, 1] }}
                  style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d' }}
                  className="absolute inset-y-0 left-0 w-1/2 h-full bg-[#070b2a] border-r border-[#00e5ff]/50 shadow-[0_0_60px_rgba(0,229,255,0.6)] flex items-center justify-end pr-10 z-30"
                >
                  {/* Cyber Grid & Gaming Insignia on Door */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#00e5ff_1px,transparent_1px)] [background-size:24px_24px]" />
                  <div className="text-right space-y-2 pointer-events-none">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-xs font-rajdhani font-bold text-[#00e5ff]">
                      <Gamepad2 className="w-4 h-4" />
                      ESPORTS ARENA
                    </div>
                    <div className="font-orbitron font-extrabold text-3xl text-white tracking-widest drop-shadow-[0_0_15px_#00e5ff]">
                      PROXIMA E-CLASH
                    </div>
                    <div className="text-xs font-mono text-cyan-300/80">
                      FREE FIRE • BGMI • MINI MILITIA • eFOOTBALL • LUDO • CARROM
                    </div>
                  </div>
                </motion.div>

                {/* Right Door - Swings on Right Hinge */}
                <motion.div
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: 110, opacity: 0 }}
                  transition={{ duration: 1.1, ease: [0.25, 1, 0.5, 1] }}
                  style={{ transformOrigin: 'right center', transformStyle: 'preserve-3d' }}
                  className="absolute inset-y-0 right-0 w-1/2 h-full bg-[#0b0e36] border-l border-[#7c3aed]/50 shadow-[0_0_60px_rgba(124,58,237,0.6)] flex items-center justify-start pl-10 z-30"
                >
                  <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#7c3aed_1px,transparent_1px)] [background-size:24px_24px]" />
                  <div className="text-left space-y-2 pointer-events-none">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7c3aed]/20 border border-[#7c3aed]/40 text-xs font-rajdhani font-bold text-[#a78bfa]">
                      <Trophy className="w-4 h-4" />
                      CHAMPIONSHIP 2026
                    </div>
                    <div className="font-orbitron font-extrabold text-3xl text-white tracking-widest drop-shadow-[0_0_15px_#7c3aed]">
                      ₹7,000 CASH PRIZE POOL
                    </div>
                    <div className="text-xs font-mono text-purple-300/80">
                      BATTLE ROYALE • 1v1 • FFA TOURNAMENT
                    </div>
                  </div>
                </motion.div>
              </>
            ) : (
              /* Mobile Mode: Vertical Doors (Top swings up, Bottom swings down) */
              <>
                <motion.div
                  initial={{ rotateX: 0 }}
                  animate={{ rotateX: 110, opacity: 0 }}
                  transition={{ duration: 1.1, ease: [0.25, 1, 0.5, 1] }}
                  style={{ transformOrigin: 'top center', transformStyle: 'preserve-3d' }}
                  className="absolute inset-x-0 top-0 h-1/2 w-full bg-[#070b2a] border-b border-[#00e5ff]/50 shadow-[0_0_40px_rgba(0,229,255,0.5)] flex items-end justify-center pb-6 z-30"
                >
                  <div className="font-orbitron font-extrabold text-xl text-[#00e5ff] tracking-wider">
                    PROXIMA E-CLASH 🎮
                  </div>
                </motion.div>

                <motion.div
                  initial={{ rotateX: 0 }}
                  animate={{ rotateX: -110, opacity: 0 }}
                  transition={{ duration: 1.1, ease: [0.25, 1, 0.5, 1] }}
                  style={{ transformOrigin: 'bottom center', transformStyle: 'preserve-3d' }}
                  className="absolute inset-x-0 bottom-0 h-1/2 w-full bg-[#0b0e36] border-t border-[#7c3aed]/50 shadow-[0_0_40px_rgba(124,58,237,0.5)] flex items-start justify-center pt-6 z-30"
                >
                  <div className="font-orbitron font-extrabold text-xl text-[#a78bfa] tracking-wide">
                    ESPORTS ARENA 2026 🏆
                  </div>
                </motion.div>
              </>
            )}

            {/* Camera Dolly Flash Transition Light */}
            <motion.div
              initial={{ opacity: 0.8, scale: 0.6 }}
              animate={{ opacity: 0, scale: 1.5 }}
              transition={{ duration: 0.9, delay: 0.15 }}
              className="absolute inset-0 bg-gradient-to-r from-[#00e5ff]/30 via-white/40 to-[#7c3aed]/30 pointer-events-none z-20"
            />
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
