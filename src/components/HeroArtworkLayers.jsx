import React from 'react';
import { motion } from 'framer-motion';

// Layer 1: Esports Arena Background Gradient & Perspective Grid
export const LayerBackground = ({ _isMobile = false }) => (
  <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden">
    {/* Deep cyber dark space gradient */}
    <div
      className="w-full h-full bg-gradient-to-b from-[#030616] via-[#070b2a] 60% to-[#0b0e36]"
    />

    {/* Volumetric Stadium Lights */}
    <div className="absolute -top-24 left-1/4 w-[500px] h-[500px] rounded-full bg-[#00e5ff]/15 blur-[120px] pointer-events-none" />
    <div className="absolute -top-24 right-1/4 w-[500px] h-[500px] rounded-full bg-[#7c3aed]/20 blur-[130px] pointer-events-none" />
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full bg-[#2b4bff]/10 blur-[100px] pointer-events-none" />

    {/* Full-width Perspective Cyber Grid */}
    <div
      className="absolute inset-0 opacity-25 pointer-events-none"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(0, 229, 255, 0.12) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(43, 75, 255, 0.12) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
      }}
    />
  </div>
);

// Layer 2: Esports Battlestation Scene (Monitors, Tournament HUD, Stage)
export const LayerGamingScene = ({ style = {} }) => (
  <div
    style={style}
    className="absolute inset-y-0 left-0 w-full md:w-3/5 h-full pointer-events-none select-none flex items-end justify-start pl-2 md:pl-10 pb-0 overflow-hidden"
  >
    <svg
      viewBox="0 0 960 700"
      className="w-full max-w-[620px] md:max-w-[780px] h-auto drop-shadow-2xl translate-y-4 md:translate-y-8"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="neonGlowBlue" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#05143a" />
          <stop offset="100%" stopColor="#02091d" />
        </linearGradient>
      </defs>

      {/* Battlestation Table Surface */}
      <polygon points="0,520 960,520 880,700 0,700" fill="#040618" opacity="0.95" />
      <line x1="0" y1="520" x2="960" y2="520" stroke="#00e5ff" strokeWidth="2.5" opacity="0.75" filter="url(#neonGlowBlue)" />

      {/* Left Monitor */}
      <rect x="60" y="270" width="240" height="170" rx="8" fill="#080e2b" stroke="#2b4bff" strokeWidth="2.5" />
      <rect x="70" y="280" width="220" height="150" fill="url(#screenGrad)" />
      {/* Tournament HUD wireframe */}
      <circle cx="180" cy="355" r="45" stroke="#00e5ff" strokeWidth="1.5" fill="none" opacity="0.6" strokeDasharray="4 2" />
      <line x1="180" y1="310" x2="180" y2="400" stroke="#00e5ff" strokeWidth="1" opacity="0.4" />
      <line x1="135" y1="355" x2="225" y2="355" stroke="#00e5ff" strokeWidth="1" opacity="0.4" />

      {/* Center Main Stage Display */}
      <rect x="320" y="220" width="340" height="230" rx="10" fill="#060c24" stroke="#00e5ff" strokeWidth="3" filter="url(#neonGlowBlue)" />
      <rect x="330" y="230" width="320" height="210" fill="url(#screenGrad)" />
      {/* Live Esports Map / Minimap graphics */}
      <polygon points="360,260 480,240 600,280 580,410 450,420 370,390" fill="#0a1d47" stroke="#2b4bff" strokeWidth="1.5" opacity="0.7" />
      <circle cx="490" cy="330" r="6" fill="#00e5ff" filter="url(#neonGlowBlue)" />
      <circle cx="420" cy="360" r="4" fill="#ff4655" />
      <circle cx="540" cy="290" r="4" fill="#00e5ff" />

      {/* Pro Gaming Chair Silhouette */}
      <path
        d="M 450,480 C 420,440 410,400 410,360 L 510,360 C 510,400 500,440 470,480 Z"
        fill="#020512"
        stroke="#2b4bff"
        strokeWidth="1.5"
      />
      <rect x="420" y="320" width="80" height="40" rx="12" fill="#05081b" stroke="#00e5ff" strokeWidth="1.5" opacity="0.8" />

      {/* Headset on Desk */}
      <path d="M 690,490 Q 715,465 740,490" stroke="#00e5ff" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="682" y="485" width="16" height="26" rx="6" fill="#02091d" stroke="#2b4bff" strokeWidth="2" />
      <rect x="732" y="485" width="16" height="26" rx="6" fill="#02091d" stroke="#2b4bff" strokeWidth="2" />
    </svg>
  </div>
);

// Layer 3: Floating 3D Cyber Controller Outline
export const LayerControllerOutline = ({ style = {} }) => (
  <motion.div
    style={style}
    className="absolute -top-12 md:top-6 left-4 md:left-24 w-64 md:w-96 h-64 md:h-96 pointer-events-none select-none z-10 opacity-70"
    animate={{ y: [0, -12, 0], rotate: [0, -2, 0] }}
    transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
  >
    <svg viewBox="0 0 400 300" className="w-full h-full drop-shadow-[0_0_25px_rgba(0,229,255,0.5)]" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="controllerNeon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00e5ff" />
          <stop offset="50%" stopColor="#2b4bff" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>

      {/* Controller Body Shell */}
      <path
        d="M 120,70 C 160,65 240,65 280,70 C 330,75 375,130 365,220 C 360,260 320,270 290,240 C 265,215 240,210 200,210 C 160,210 135,215 110,240 C 80,270 40,260 35,220 C 25,130 70,75 120,70 Z"
        fill="none"
        stroke="url(#controllerNeon)"
        strokeWidth="3.5"
        strokeDasharray="6 3"
      />

      {/* D-Pad */}
      <path d="M 105,120 L 105,160 M 85,140 L 125,140" stroke="#00e5ff" strokeWidth="6" strokeLinecap="round" />

      {/* Action Buttons */}
      <circle cx="275" cy="125" r="7" fill="none" stroke="#00e5ff" strokeWidth="2.5" />
      <circle cx="295" cy="145" r="7" fill="none" stroke="#7c3aed" strokeWidth="2.5" />
      <circle cx="255" cy="145" r="7" fill="none" stroke="#2b4bff" strokeWidth="2.5" />
      <circle cx="275" cy="165" r="7" fill="none" stroke="#00e5ff" strokeWidth="2.5" />

      {/* Dual Thumbsticks */}
      <circle cx="155" cy="175" r="22" fill="#080e2b" stroke="#00e5ff" strokeWidth="2.5" />
      <circle cx="245" cy="175" r="22" fill="#080e2b" stroke="#7c3aed" strokeWidth="2.5" />
    </svg>
  </motion.div>
);

// Layer 4: Smoky Atmospheric Arena Fog
export const LayerFog = ({ style = {} }) => (
  <div style={style} className="absolute bottom-0 left-0 w-full h-48 md:h-72 pointer-events-none select-none overflow-hidden z-10">
    <div
      className="w-full h-full opacity-50 bg-gradient-to-t from-[#00e5ff]/15 via-[#2b4bff]/10 to-transparent"
      style={{
        maskImage: 'radial-gradient(ellipse at bottom center, black 50%, transparent 90%)',
        WebkitMaskImage: 'radial-gradient(ellipse at bottom center, black 50%, transparent 90%)',
      }}
    />
  </div>
);

// Layer 5: Holographic Tournament Trophy & HUD Runes (Right Side Parallax)
export const LayerTournamentRunes = ({ style = {} }) => (
  <motion.div
    style={style}
    className="absolute -top-6 md:top-8 right-4 md:right-20 w-72 md:w-96 h-72 md:h-96 pointer-events-none select-none z-10 opacity-75"
    animate={{ y: [0, -10, 0], rotate: [0, 2, 0] }}
    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
  >
    <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-[0_0_25px_rgba(124,58,237,0.5)]" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="trophyNeon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00e5ff" />
          <stop offset="50%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#2b4bff" />
        </linearGradient>
      </defs>

      {/* Concentric HUD Reticles */}
      <circle cx="200" cy="200" r="150" fill="none" stroke="#00e5ff" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.5" />
      <circle cx="200" cy="200" r="110" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="12 6" opacity="0.6" />
      <circle cx="200" cy="200" r="60" fill="none" stroke="#2b4bff" strokeWidth="2" opacity="0.7" />

      {/* Crosshair Ticks */}
      <line x1="200" y1="30" x2="200" y2="70" stroke="#00e5ff" strokeWidth="2.5" />
      <line x1="200" y1="330" x2="200" y2="370" stroke="#00e5ff" strokeWidth="2.5" />
      <line x1="30" y1="200" x2="70" y2="200" stroke="#00e5ff" strokeWidth="2.5" />
      <line x1="330" y1="200" x2="370" y2="200" stroke="#00e5ff" strokeWidth="2.5" />

      {/* Holographic Championship Trophy */}
      <g transform="translate(130, 110) scale(0.7)" stroke="url(#trophyNeon)" strokeWidth="3.5" fill="none">
        <path d="M 50,40 L 150,40 C 150,90 140,140 100,160 C 60,140 50,90 50,40 Z" />
        <path d="M 50,60 C 20,60 10,95 30,120 C 45,135 60,135 70,130" />
        <path d="M 150,60 C 180,60 190,95 170,120 C 155,135 140,135 130,130" />
        <path d="M 100,160 L 100,200 M 70,200 L 130,200" />
        <polygon points="60,200 140,200 150,230 50,230" />
      </g>
    </svg>
  </motion.div>
);

// Layer 6: Cyber Particles (Embers, Sparks, Holographic Cubes)
export const LayerParticles = ({ style = {} }) => (
  <div style={style} className="absolute inset-0 w-full h-full pointer-events-none select-none z-20 overflow-hidden">
    {/* Floating Cyan & Violet Cyber Sparks */}
    <div className="absolute top-1/4 left-1/6 w-2 h-2 bg-[#00e5ff] rounded-sm rotate-45 animate-pulse shadow-neon-blue" />
    <div className="absolute top-1/3 left-1/4 w-1.5 h-1.5 bg-[#7c3aed] rounded-full animate-ping" />
    <div className="absolute top-2/3 left-1/5 w-2.5 h-2.5 bg-[#00e5ff] rounded-sm rotate-12 opacity-80" />
    <div className="absolute top-1/2 left-1/12 w-2 h-2 bg-[#2b4bff] rounded-full opacity-70 animate-bounce" />

    <div className="absolute top-1/5 right-1/4 w-2.5 h-2.5 bg-[#00e5ff] rounded-full animate-pulse shadow-neon-blue" />
    <div className="absolute top-1/3 right-1/6 w-3 h-1.5 bg-[#7c3aed] rounded-full rotate-45 opacity-80" />
    <div className="absolute top-2/3 right-1/5 w-3.5 h-2 bg-[#2b4bff] rounded-full -rotate-30 opacity-75" />
    <div className="absolute top-1/2 right-1/12 w-2 h-2 bg-[#00e5ff] rounded-full animate-ping opacity-60" />
  </div>
);
