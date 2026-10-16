// Central Configuration for PROXIMA 2026 — Inter-College Esports Championship
// All games, brackets, rules, and event metadata are configured here.

export const EVENT_METADATA = {
  name: "PROXIMA 2026",
  title: "PROXIMA E-CLASH 2026 🎮",
  subtitle: "Inter-College Esports Championship",
  tagline: "Game On. Compete. Connect. Conquer. Battle for the Ultimate Gaming Crown.",
  institution: "Yenepoya (Deemed to be University)",
  school: "Yenepoya School of Engineering and Technology",
  campus: "Yenepoya Complex, Balmatta, Mangaluru, Karnataka 575002",
  venue: "Esports Arena & Main Auditorium",
  dates: "Monday, October 26, 2026 (1-Day Mega Esports Fest)",
  shortDate: "Oct 26, 2026",
  countdownTarget: "2026-10-26T09:00:00+05:30",
  totalPrizePool: "₹7,000",
  contact: {
    email: "eclash2026@yenepoya.edu.in",
    technicalAdmin: "Mohammed Faizal",
    technicalAdminPhone: "+91 99001 66140",
    technicalAdminEmail: "faizalmdg.2007@gmail.com",
    instagram: "@proxima_esports",
    discord: "discord.gg/proxima-eclash",
  },
};

export const EMAIL_CONFIG = {
  ALLOWED_EMAIL_DOMAIN: "yenepoya.edu.in",
  REQUIRE_EMAIL_PREFIX_MATCH: true, // When true, email prefix must match Campus ID
  EXAMPLE_CAMPUS_ID: "11111",
  PLACEHOLDER: "11111@yenepoya.edu.in",
};

export const PAYMENT_CONFIG = {
  ENTRY_FEE: 49,
  UPI_ID: "8073942691@sbi",
  UPI_PAYEE_NAME: "Mohammad Sadeed Hasan",
  PAYMENT_TERMS_TEXT: "Entry fee is non-refundable except if the event is cancelled",
  QR_IMAGE_PATH: "/payment/upi-qr.jpeg",
};

export const ALLOW_MULTIPLE_GAMES = false;

export const YEARS_OPTIONS = [
  { id: "1st Year", label: "1st Year" },
  { id: "2nd Year", label: "2nd Year" },
];

export const GAMES_LIST = [
  {
    id: "Free Fire",
    name: "Free Fire",
    mode: "Battle Royale",
    platform: "Mobile Only",
    badge: "Battle Royale",
    icon: "Flame",
    color: "#ff4655",
    gradient: "from-amber-500 to-rose-600",
    prize: "1st ₹1,000 • 2nd ₹500",
    winnerPrize: 1000,
    runnerUpPrize: 500,
    description: "Drop onto the island, loot, strategize, and be the last squad standing in fast-paced 50-player survival combat.",
    format: "Squad / Solo Qualifiers → Custom Room Grand Finals",
    maxPlayers: 48,
  },
  {
    id: "BGMI",
    name: "BGMI",
    mode: "Battle Royale",
    platform: "Mobile Only",
    badge: "Battle Royale",
    icon: "Crosshair",
    color: "#00e5ff",
    gradient: "from-cyan-500 to-blue-600",
    prize: "1st ₹1,000 • 2nd ₹500",
    winnerPrize: 1000,
    runnerUpPrize: 500,
    description: "Tactical map awareness, weapon recoil mastery, and clutch team rotations across Erangel & Miramar.",
    format: "Custom Room Heats → Erangel Grand Finale",
    maxPlayers: 64,
  },
  {
    id: "Mini Militia",
    name: "Mini Militia",
    mode: "Deathmatch (FFA)",
    platform: "Mobile Only",
    badge: "Doodle Army FFA",
    icon: "Zap",
    color: "#10b981",
    gradient: "from-emerald-500 to-teal-600",
    prize: "1st ₹1,000 • 2nd ₹500",
    winnerPrize: 1000,
    runnerUpPrize: 500,
    description: "Intense multiplayer 2D rocket battles. Out-fly and out-blast your rivals in close-quarter arena chaos.",
    format: "6-Player FFA Knockouts → Top 6 Final Showdown",
    maxPlayers: 36,
  },
  {
    id: "eFootball",
    name: "eFootball",
    mode: "Football Simulation (1v1)",
    platform: "Mobile Only",
    badge: "1v1 Simulation",
    icon: "Trophy",
    color: "#8b5cf6",
    gradient: "from-violet-500 to-purple-700",
    prize: "1st ₹500 • 2nd ₹250",
    winnerPrize: 500,
    runnerUpPrize: 250,
    description: "Authentic mobile football showdown. Tactical dribbling, pinpoint passing, and clutch stoppage-time goals.",
    format: "Group Stages → Round of 16 → Grand Final Match",
    maxPlayers: 32,
  },
  {
    id: "Carrom",
    name: "Carrom",
    mode: "1v1 Disc Pot Clash",
    platform: "Mobile / Disc Pool",
    badge: "Precision Strike",
    icon: "Target",
    color: "#06b6d4",
    gradient: "from-cyan-500 to-teal-600",
    prize: "1st ₹500 • 2nd ₹250",
    winnerPrize: 500,
    runnerUpPrize: 250,
    description: "Test your fingertip aim, rebound angles, and striker control. Cover the queen, pocket the carrom men, and dominate the board.",
    format: "1v1 Single Elimination Knockouts → Best of 3 Grand Finale",
    maxPlayers: 32,
  },
];

export const TRACKS_CONFIG = {
  eclash: {
    id: "eclash",
    name: "PROXIMA E-CLASH 🎮",
    shortName: "E-Clash",
    badge: "Esports Arena",
    header: "PROXIMA ESPORTS 2026 — Game On. Compete. Connect. Conquer. Compete for the Crown. 🏆",
    description: "Battle it out against the sharpest campus tacticians in the premier collegiate esports tournament.",
    prefix: "ECL-2026-",
    colorScheme: {
      primary: "#2b4bff",
      neon: "#00e5ff",
      accent: "#7c3aed",
      bg: "#070b2a",
    },
    optionsLabel: "Select Your Esports Tournament Game",
    options: GAMES_LIST.map((g) => ({
      id: g.id,
      name: g.name,
      type: g.mode,
      platform: g.platform,
      prize: g.prize,
    })),
    prizes: [
      { place: "1st Place (All Games)", title: "Champion Trophy + Cash Prize", desc: "Gold Medal & Institutional Certificate of Excellence" },
      { place: "2nd Place (All Games)", title: "Runner-Up Cash Prize", desc: "Silver Medal & Certificate of Honor" },
      { place: "Tournament MVP", title: "MVP Gaming Trophy", desc: "Exclusive Pro Gaming Gear & Campus Champion Title" },
    ],
  },
};

export const SCHEDULE_DATA = [
  {
    phase: "Morning: Tournament Heats",
    timeframe: "09:00 AM – 12:30 PM",
    events: [
      { time: "09:00 AM", track: "eclash", title: "Arena Doors Open & Player ID Verification", venue: "Balmatta Esports Arena Gate" },
      { time: "09:30 AM", track: "eclash", title: "Tournament Kickoff & Fair Play Briefing", venue: "Auditorium Main Stage" },
      { time: "09:30 AM – 11:30 AM", track: "eclash", title: "Free Fire & BGMI — Tournament Matches", venue: "Arena Sectors Alpha & Beta" },
      { time: "11:30 AM – 12:30 PM", track: "eclash", title: "Mini Militia & eFootball — Tournament Matches", venue: "Play Zone Rooms 102 & 104" },
    ],
  },
  {
    phase: "Lunch: Break",
    timeframe: "12:30 PM – 01:30 PM",
    events: [
      { time: "12:30 PM – 01:30 PM", track: "eclash", type: "break", title: "Lunch Break", venue: "Resume tournament matches at 01:30 PM" },
    ],
  },
  {
    phase: "After Lunch: Tournament Matches",
    timeframe: "01:30 PM – 02:30 PM",
    events: [
      { time: "01:30 PM – 02:30 PM", track: "eclash", title: "Carrom, Free Fire & BGMI — Tournament Matches", venue: "Tournament game stations" },
    ],
  },
  {
    phase: "Finals: Championship Matches",
    timeframe: "02:30 PM – 03:00 PM",
    events: [
      { time: "02:30 PM – 03:00 PM", track: "eclash", title: "Final matches for all five games", venue: "Tournament game stations" },
    ],
  },
  {
    phase: "Prize Distribution",
    timeframe: "03:00 PM – 03:45 PM",
    events: [
      { time: "03:00 PM – 03:45 PM", track: "eclash", title: "Championship Trophy & ₹7,000 Prize Distribution", venue: "Auditorium Main Hall" },
    ],
  },
];

export const FAQ_DATA = [
  {
    q: "Who is eligible to participate in PROXIMA E-CLASH 2026?",
    a: "All bonafide students of Yenepoya (Deemed to be University) from 1st and 2nd Year are eligible to participate using their verified Campus ID (e.g., 11111).",
  },
  {
    q: "Why do I need a @yenepoya.edu.in email to register?",
    a: "To guarantee fair collegiate play and prevent outside registrations, your campus email prefix must match your official Yenepoya Campus ID (e.g., 11111@yenepoya.edu.in).",
  },
  {
    q: "What devices and platforms are allowed?",
    a: "All tournaments (Free Fire, BGMI, Mini Militia, eFootball, Carrom) are MOBILE ONLY. Strictly no emulators (Bluestacks, LDPlayer), iPads/tablets, or external hardware triggers are permitted. Routine device checks are conducted prior to match start.",
  },
  {
    q: "Do I need to bring my own gaming device & accessories?",
    a: "Yes! Players must bring their own smartphones with the respective games fully updated to the latest app store release. High-speed campus Wi-Fi will be provided in the arena, but bringing mobile data and power banks is recommended.",
  },
  {
    q: "How will I receive my tournament entry pass?",
    a: "Upon completing registration, a unique Registration ID (ECL-2026-XXXX) and a high-resolution Digital Player Pass featuring a live tournament check-in QR code will be generated instantly for download.",
  },
  {
    q: "Where and when does the tournament take place?",
    a: "The tournament takes place on Monday, October 26, 2026 at Yenepoya Complex, Balmatta, Mangaluru, Karnataka 575002. Doors open for check-in at 09:00 AM sharp.",
  },
];
