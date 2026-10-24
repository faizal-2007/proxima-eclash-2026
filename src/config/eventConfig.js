// Central Configuration for PROXIMA 2026 — Inter-College Esports Championship
// All games, brackets, rules, and event metadata are configured here.

export const EVENT_METADATA = {
  name: "PROXIMA 2026",
  title: "PROXIMA E-CLASH 2026 🎮",
  subtitle: "Inter-College Esports Championship",
  tagline: "Where Virtual Worlds Become Battlefields.",
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
  ENTRY_FEE: 50,
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
    mode: "Solo BR & 1v1 Knockout",
    platform: "Mobile Only",
    badge: "Solo BR → 1v1",
    icon: "Flame",
    color: "#ff4655",
    gradient: "from-amber-500 to-rose-600",
    prize: "1st ₹1,000 • 2nd ₹500",
    winnerPrize: 1000,
    runnerUpPrize: 500,
    description: "Stage 1: All 31 players drop into a Solo Battle Royale survival qualifier in Bermuda. Top 8 survivors advance to Stage 2: 1v1 single-elimination knockout bracket to crown the champion.",
    format: "31-Player Solo BR (Top 8 Advance) → 1v1 Knockout (8 Matches Total)",
    maxPlayers: 31,
    sideSize: 1,
    totalMatches: 8,
  },
  {
    id: "BGMI",
    name: "BGMI (TDM)",
    mode: "2v2 TDM Knockout",
    platform: "Mobile Only",
    badge: "2v2 TDM Clash",
    icon: "Crosshair",
    color: "#00e5ff",
    gradient: "from-cyan-500 to-blue-600",
    prize: "1st ₹1,000 • 2nd ₹500",
    winnerPrize: 1000,
    runnerUpPrize: 500,
    description: "Tactical close-quarters Warehouse 2v2 Team Deathmatch. 15 registered players form 7 teams (6 teams of 2 + 1 trio team with rotating sub). 3 Quarter-final matches + 1 bye lead into Semi-finals & Grand Final.",
    format: "2v2 TDM Knockout with Play-in (7 Teams • 6 Matches Total)",
    maxPlayers: 15,
    sideSize: 2,
    totalMatches: 6,
  },
  {
    id: "Mini Militia",
    name: "Mini Militia",
    mode: "2v2 Knockout",
    platform: "Mobile Only",
    badge: "Doodle Army 2v2",
    icon: "Zap",
    color: "#10b981",
    gradient: "from-emerald-500 to-teal-600",
    prize: "1st ₹1,000 • 2nd ₹500",
    winnerPrize: 1000,
    runnerUpPrize: 500,
    description: "Intense multiplayer 2D rocket combat. 33 registered players form 16 teams (15 pairs + 1 trio team with rotating tactical substitute) battling across 4 single-elimination knockout rounds.",
    format: "16-Team 2v2 Knockout (15 Teams of 2 + 1 Trio • 15 Matches Total)",
    maxPlayers: 33,
    sideSize: 2,
    totalMatches: 15,
  },
  {
    id: "eFootball",
    name: "eFootball",
    mode: "1v1 Knockout with Play-In",
    platform: "Mobile Only",
    badge: "1v1 Simulation",
    icon: "Trophy",
    color: "#8b5cf6",
    gradient: "from-violet-500 to-purple-700",
    prize: "1st ₹500 • 2nd ₹250",
    winnerPrize: 500,
    runnerUpPrize: 250,
    description: "Authentic mobile football simulation showdown. 38 players battle through 6 preliminary play-in matches (12 players) and 26 byes into a full 32-player single-elimination bracket.",
    format: "6 Play-In Matches → Round of 32 → Grand Final (37 Matches Total)",
    maxPlayers: 38,
    sideSize: 1,
    totalMatches: 37,
  },
  {
    id: "Carrom",
    name: "Carrom",
    mode: "1v1 Single Elimination Knockout",
    platform: "Mobile / Disc Pool",
    badge: "Precision Strike",
    icon: "Target",
    color: "#06b6d4",
    gradient: "from-cyan-500 to-teal-600",
    prize: "1st ₹500 • 2nd ₹250",
    winnerPrize: 500,
    runnerUpPrize: 250,
    description: "Test your fingertip aim, rebound angles, and striker control. 66 registered players launch directly into single-elimination knockout matches across 6 campus carrom boards heading straight toward the Grand Final.",
    format: "1v1 Knockout Draw (Round 1 to Grand Final • 65 Matches Total)",
    maxPlayers: 66,
    sideSize: 1,
    totalMatches: 65,
  },
];

export const TRACKS_CONFIG = {
  eclash: {
    id: "eclash",
    name: "PROXIMA E-CLASH 🎮",
    shortName: "E-Clash",
    badge: "Esports Arena",
    header: "PROXIMA ESPORTS 2026 — Where Virtual Worlds Become Battlefields. 🏆",
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
    phase: "Phase 1: Verification & Kickoff",
    timeframe: "09:00 AM – 09:45 AM",
    events: [
      {
        time: "09:00 AM – 09:30 AM",
        track: "eclash",
        title: "Arena Doors Open & Player ID Verification",
        venue: "Balmatta Esports Arena Gate & Helpdesk",
        desc: "All registered players verify their student IDs, receive digital player passes, and check in at their game stations."
      },
      {
        time: "09:30 AM – 09:45 AM",
        track: "eclash",
        title: "Tournament Kickoff & Fair Play Rules Briefing",
        venue: "Auditorium Main Stage",
        desc: "Official opening address, referee introduction, device fair-play briefing, and bracket unveiling for all 5 games."
      },
    ],
  },
  {
    phase: "Phase 2: Play-Ins & Opening Heats",
    timeframe: "09:45 AM – 11:15 AM",
    events: [
      {
        time: "09:45 AM – 10:15 AM",
        track: "eclash",
        title: "eFootball Play-In Stage (6 Matches) & Carrom Opening Matches",
        venue: "Play Zone Room 102 & Carrom Board Arena",
        desc: "eFootball preliminary matches trim the field (12 players play for 6 slots in Round of 32). Carrom matches begin directly across campus boards."
      },
      {
        time: "09:45 AM – 10:30 AM",
        track: "eclash",
        title: "Free Fire — Stage 1: 31-Player Solo Battle Royale Qualifier",
        venue: "Arena Sector Alpha (Custom Bermuda Room)",
        desc: "All 31 registered players drop into a single custom room. The Top 8 survivor tacticians automatically qualify for Stage 2 1v1 knockouts."
      },
      {
        time: "10:15 AM – 11:15 AM",
        track: "eclash",
        title: "Carrom — Knockout Rounds (32 Matches across 6 Boards)",
        venue: "Carrom Board Arena",
        desc: "66 registered players compete in single-elimination heats across 6 parallel boards in fast-paced 1v1 potting action."
      },
      {
        time: "10:15 AM – 11:15 AM",
        track: "eclash",
        title: "eFootball — Round of 32 (16 Matches across 4 Stations)",
        venue: "Play Zone Room 102",
        desc: "26 straight-through bye players + 6 play-in winners compete in 6-minute mobile simulation matches."
      },
    ],
  },
  {
    phase: "Phase 3: Team Knockouts & Quarter-Finals",
    timeframe: "11:15 AM – 12:45 PM",
    events: [
      {
        time: "11:15 AM – 12:00 PM",
        track: "eclash",
        title: "Free Fire — Quarter-Finals (4 x 1v1 Knockout Matches)",
        venue: "Arena Sector Alpha",
        desc: "Top 8 survivors from Stage 1 face off in direct 1v1 Clash Squad quarter-final duels to determine the semi-finalists."
      },
      {
        time: "11:15 AM – 12:00 PM",
        track: "eclash",
        title: "BGMI (TDM) — Quarter-Finals (3 Matches • 1 Team Bye)",
        venue: "Arena Sector Beta",
        desc: "7 teams (6 pairs + 1 trio team with rotating sub) battle in 2v2 Warehouse TDM. 3 winners + 1 bye advance to semi-finals."
      },
      {
        time: "11:15 AM – 12:15 PM",
        track: "eclash",
        title: "Mini Militia — Round of 16 (8 Matches • 16 Teams)",
        venue: "Play Zone Room 104",
        desc: "16 teams (15 pairs + 1 trio team with rotating sub) clash in high-speed 2v2 arena deathmatches."
      },
      {
        time: "12:00 PM – 12:45 PM",
        track: "eclash",
        title: "Carrom & eFootball — Mid-Rounds (Carrom R32: 16 Matches • eFootball R16: 8 Matches)",
        venue: "Carrom Board Arena & Room 102",
        desc: "Intense mid-bracket eliminations as the field narrows down towards the quarter-final stages."
      },
      {
        time: "12:15 PM – 12:45 PM",
        track: "eclash",
        title: "Mini Militia — Quarter-Finals (4 Matches • 8 Teams)",
        venue: "Play Zone Room 104",
        desc: "Top 8 teams fight for the four coveted semi-final spots in Catacombs and Outpost."
      },
    ],
  },
  {
    phase: "Phase 4: Lunch & Arena Recharge",
    timeframe: "12:45 PM – 01:30 PM",
    events: [
      {
        time: "12:45 PM – 01:30 PM",
        track: "eclash",
        type: "break",
        title: "Lunch Break & Device Re-charging Window",
        venue: "Campus Dining Hall & Player Lounge",
        desc: "Mandatory rest for players and volunteers. Arena charging stations open. Afternoon matches resume promptly at 01:30 PM."
      },
    ],
  },
  {
    phase: "Phase 5: Semi-Finals & High-Stakes Knockouts",
    timeframe: "01:30 PM – 02:15 PM",
    events: [
      {
        time: "01:30 PM – 02:15 PM",
        track: "eclash",
        title: "Carrom — Round of 16 (8 Matches) & Quarter-Finals (4 Matches)",
        venue: "Carrom Board Arena",
        desc: "Precision potting showdowns as the top tacticians battle for the final 4 semi-final slots."
      },
      {
        time: "01:30 PM – 02:00 PM",
        track: "eclash",
        title: "eFootball — Quarter-Finals (4 Matches) & Semi-Finals (2 Matches)",
        venue: "Play Zone Room 102",
        desc: "High-octane football action deciding the two Grand Final contenders."
      },
      {
        time: "01:30 PM – 02:00 PM",
        track: "eclash",
        title: "Free Fire & BGMI (TDM) — Semi-Finals (2 Matches each)",
        venue: "Arena Sectors Alpha & Beta",
        desc: "Free Fire: Top 4 1v1 contenders clash for championship ticket. BGMI: Top 4 2v2 squads clash in semi-final TDM."
      },
      {
        time: "01:45 PM – 02:15 PM",
        track: "eclash",
        title: "Mini Militia — Semi-Finals (2 Matches • 4 Teams)",
        venue: "Play Zone Room 104",
        desc: "The final 4 duos compete in intense 2v2 shootouts to reach the Grand Final."
      },
    ],
  },
  {
    phase: "Phase 6: Grand Finals Championship Stage",
    timeframe: "02:15 PM – 03:00 PM",
    events: [
      {
        time: "02:15 PM – 02:35 PM",
        track: "eclash",
        title: "Carrom — Semi-Finals (2 Matches) & Grand Final (1 Match)",
        venue: "Main Stage Feature Board",
        desc: "Best of 3 boards championship match to crown the Carrom Champion."
      },
      {
        time: "02:15 PM – 03:00 PM",
        track: "eclash",
        title: "Grand Finals Showcase — All 5 Games (Auditorium Main Screen)",
        venue: "Auditorium Main Stage & Live Screen",
        desc: "Showcase finals streamed on the main auditorium stage: Free Fire 1v1 Final (02:15 PM), Mini Militia 2v2 Final (02:25 PM), BGMI 2v2 TDM Final (02:35 PM), eFootball 1v1 Final (02:45 PM), and Carrom Final (02:50 PM)."
      },
    ],
  },
  {
    phase: "Phase 7: Championship Trophy & Prize Distribution",
    timeframe: "03:00 PM – 03:45 PM",
    events: [
      {
        time: "03:00 PM – 03:45 PM",
        track: "eclash",
        title: "Championship Trophy & Cash Prize Distribution Ceremony",
        venue: "Auditorium Main Hall",
        desc: "Felicitation by University dignitaries. Awarding ₹7,000 in total cash prizes, institutional champion trophies, MVP medals, and verified certificates to all winners."
      },
    ],
  },
];

export const FAQ_DATA = [
  {
    q: "Who is eligible to participate in PROXIMA E-CLASH 2026?",
    a: "All bonafide students of Yenepoya (Deemed to be University) from 1st and 2nd Year are eligible to participate using their verified Campus ID (e.g., 11111).",
  },
  {
    q: "How do 2v2 team formats work in Mini Militia & BGMI (TDM)?",
    a: "Individual players are paired into 2v2 teams. If the total registered player count is odd, the extra player becomes a rotating tactical substitute (trio team) with fixed rotation before Round 1, ensuring every registered student participates!",
  },
  {
    q: "What is the Play-In stage in eFootball?",
    a: "Play-In matches are preliminary knockout games (Round 0) in eFootball that trim the registered field (38 players) down to a clean 32-player bracket. 12 players battle in 6 morning play-in matches, and the 6 winners join 26 straight-through players in Round 1 (Round of 32). In Carrom, matches start directly without a play-in round.",
  },
  {
    q: "How does the Free Fire tournament structure work?",
    a: "Free Fire features a 2-stage format: Stage 1 is a 31-player Solo Battle Royale custom room where the Top 8 survivors advance. Stage 2 is an 8-player 1v1 single-elimination knockout bracket (Quarter-finals → Semi-finals → Grand Final) on the main auditorium stage.",
  },
  {
    q: "What devices and platforms are allowed?",
    a: "All tournaments (Free Fire, BGMI, Mini Militia, eFootball, Carrom) are MOBILE / ARENA ONLY. Strictly no emulators (Bluestacks, LDPlayer), iPads/tablets, or external hardware triggers are permitted. Routine device checks are conducted prior to match start.",
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
    q: "How many games can I register for?",
    a: "You can choose either one game or two games (maximum 2 games allowed). You cannot select more than two games.",
  },
  {
    q: "Where and when does the tournament take place?",
    a: "The tournament takes place on Monday, October 26, 2026 at Yenepoya Complex, Balmatta, Mangaluru, Karnataka 575002. Doors open for check-in at 09:00 AM sharp, and the Grand Prize Distribution concludes at 03:45 PM.",
  },
];
