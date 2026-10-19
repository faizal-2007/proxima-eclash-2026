import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Lock,
  Unlock,
  Download,
  Search,
  RefreshCw,
  LogOut,
  ArrowLeft,
  Users,
  Gamepad2,
  Trophy,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Flame,
  Crosshair,
  History,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  Sparkles,
  Target,
  Swords,
  Crown,
  Banknote,
  QrCode,
  Loader2,
  Clock,
  Eye,
} from 'lucide-react';
import { EVENT_METADATA } from '../config/eventConfig';
import { VolunteersManager } from '../components/admin/VolunteersManager';
import { CheckInsViewer } from '../components/admin/CheckInsViewer';
import { FixturesTab } from '../components/admin/FixturesTab';

export const AdminDashboard = ({ onBack }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return Boolean(sessionStorage.getItem('proxima_admin_token'));
  });
  const [token, setToken] = useState(() => {
    return sessionStorage.getItem('proxima_admin_token') || '';
  });
  const [role, setRole] = useState(() => {
    return sessionStorage.getItem('proxima_admin_role') || 'admin';
  });
  const isViewer = role === 'viewer';
  const [activeTab, setActiveTab] = useState('REGISTRATIONS'); // 'REGISTRATIONS' | 'VOLUNTEERS' | 'CHECKINS' | 'FIXTURES'
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard Data State
  const [registrations, setRegistrations] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMockData, setIsMockData] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGameFilter, setSelectedGameFilter] = useState('ALL');
  const [selectedYearFilter, setSelectedYearFilter] = useState('ALL');
  const [selectedPaymentModeFilter, setSelectedPaymentModeFilter] = useState('ALL');
  const [selectedPaymentStatusFilter, setSelectedPaymentStatusFilter] = useState('ALL');

  // Payment Status/Mode Update State
  const [updatingPaymentId, setUpdatingPaymentId] = useState(null);
  const [paymentUpdateMsg, setPaymentUpdateMsg] = useState('');
  const [paymentUpdateError, setPaymentUpdateError] = useState('');

  // Delete Registration State
  const [registrationToDelete, setRegistrationToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState('');

  // Delete registration handler
  const handleDeleteRegistration = async () => {
    if (isViewer || !registrationToDelete?.registrationId) return;

    setIsDeleting(true);
    setDeleteError('');

    try {
      const res = await fetch(
        `/api/admin/registrations?registrationId=${encodeURIComponent(registrationToDelete.registrationId)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'x-admin-key': token,
          },
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to delete registration.');
      }

      // Update state locally
      setRegistrations((prev) =>
        prev.filter((r) => r.registrationId !== registrationToDelete.registrationId)
      );

      // Decrement stats
      setStats((prev) => {
        if (!prev) return prev;
        const game = registrationToDelete.game;
        const year = registrationToDelete.year;
        return {
          ...prev,
          total: Math.max(0, (prev.total || 1) - 1),
          byGame: {
            ...prev.byGame,
            [game]: Math.max(0, (prev.byGame?.[game] || 1) - 1),
          },
          byYear: {
            ...prev.byYear,
            [year]: Math.max(0, (prev.byYear?.[year] || 1) - 1),
          },
        };
      });

      setDeleteSuccessMsg(
        `Registration ${registrationToDelete.registrationId} (${registrationToDelete.fullName}) has been permanently deleted.`
      );
      setRegistrationToDelete(null);
      setTimeout(() => setDeleteSuccessMsg(''), 6000);
    } catch (err) {
      setDeleteError(err.message || 'Error occurred while deleting registration.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Payment Mode and Status update handler
  const handleUpdatePayment = async (registrationId, updates = {}) => {
    if (isViewer || !registrationId) return;

    setUpdatingPaymentId(registrationId);
    setPaymentUpdateError('');

    try {
      const res = await fetch('/api/admin/registrations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-admin-key': token,
        },
        body: JSON.stringify({
          registrationId,
          ...updates,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to update payment status/mode.');
      }

      // Update state locally
      setRegistrations((prev) =>
        prev.map((r) => {
          if (r.registrationId === registrationId) {
            const updated = data?.registration || {};
            const isAccepted = updates.paymentStatus === 'PAID' || updates.paymentStatus === 'ACCEPTED';
            const nextStatus = updates.paymentStatus !== undefined
              ? (isAccepted ? 'CONFIRMED' : 'PENDING')
              : (updates.status || r.status || 'CONFIRMED');

            return {
              ...r,
              ...updated,
              ...(updates.paymentMode !== undefined ? { paymentMode: updates.paymentMode } : {}),
              ...(updates.paymentStatus !== undefined ? { paymentStatus: isAccepted ? 'PAID' : 'PENDING' } : {}),
              status: updated.status || nextStatus,
            };
          }
          return r;
        })
      );

      setPaymentUpdateMsg(
        `Payment updated for ${registrationId}${updates.paymentMode ? ` (${updates.paymentMode})` : ''}${updates.paymentStatus ? ` [${updates.paymentStatus}]` : ''}`
      );
      setTimeout(() => setPaymentUpdateMsg(''), 5000);
    } catch (err) {
      setPaymentUpdateError(err.message || 'Error occurred while updating payment.');
      setTimeout(() => setPaymentUpdateError(''), 6000);
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    const trimmedInput = passwordInput.trim();
    const viewerKeywords = ['yennexview2026', 'viewer2026', 'proximaview2026', 'proximaviewer2026'];

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmedInput }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Authentication failed');
      }

      const assignedRole = data.role || (viewerKeywords.includes(trimmedInput.toLowerCase()) ? 'viewer' : 'admin');
      const authToken = data.token || (assignedRole === 'viewer' ? 'viewer-authenticated' : 'admin-authenticated');

      sessionStorage.setItem('proxima_admin_token', authToken);
      sessionStorage.setItem('proxima_admin_role', assignedRole);
      setToken(authToken);
      setRole(assignedRole);
      setIsAuthenticated(true);
    } catch (err) {
      // Local fallback for static preview: accept secret 'yennex2026' or viewer passkeys
      if (viewerKeywords.includes(trimmedInput.toLowerCase())) {
        const fallbackToken = 'preview-viewer-token';
        sessionStorage.setItem('proxima_admin_token', fallbackToken);
        sessionStorage.setItem('proxima_admin_role', 'viewer');
        setToken(fallbackToken);
        setRole('viewer');
        setIsAuthenticated(true);
      } else if (trimmedInput === 'yennex2026') {
        const fallbackToken = 'preview-session-token';
        sessionStorage.setItem('proxima_admin_token', fallbackToken);
        sessionStorage.setItem('proxima_admin_role', 'admin');
        setToken(fallbackToken);
        setRole('admin');
        setIsAuthenticated(true);
      } else {
        setLoginError(err.message || 'Incorrect admin or viewer passkey.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('proxima_admin_token');
    sessionStorage.removeItem('proxima_admin_role');
    setIsAuthenticated(false);
    setToken('');
    setRole('admin');
    setPasswordInput('');
  };

  // Fetch registrations from serverless endpoint
  const fetchRegistrations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/registrations', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.registrations) {
        setRegistrations(data.registrations);
        setStats(data.stats);
        setIsMockData(Boolean(data.isMock));
        setSpreadsheetId(data.spreadsheetId);
      } else {
        // Fallback default sample data if API route not running in static build
        loadFallbackSampleData();
      }
    } catch (err) {
      console.warn('Could not fetch registrations from API, using fallback data:', err);
      loadFallbackSampleData();
    } finally {
      setIsLoading(false);
    }
  };

  const loadFallbackSampleData = () => {
    setRegistrations([]);
    setStats({
      total: 0,
      byGame: {
        'Free Fire': 0,
        BGMI: 0,
        'Mini Militia': 0,
        eFootball: 0,
        Carrom: 0,
      },
      byYear: {
        '1st Year': 0,
        '2nd Year': 0,
      },
    });
    setIsMockData(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchRegistrations();
    }
  }, [isAuthenticated]);

  // Helper to count registered players for a game (supports multi-game comma-separated selections)
  const getGameCount = (gameName) => {
    if (stats?.byGame?.[gameName] !== undefined && stats?.byGame?.[gameName] !== null) {
      return stats.byGame[gameName];
    }
    return registrations.filter((r) => {
      const games = (r.game || '').split(',').map((g) => g.trim().toLowerCase());
      return games.includes(gameName.toLowerCase());
    }).length;
  };

  // Filtered registrations
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((r) => {
      // Game filter (matches any game in comma-separated list like "Free Fire, eFootball")
      if (selectedGameFilter !== 'ALL') {
        const games = (r.game || '').split(',').map((g) => g.trim().toLowerCase());
        if (!games.includes(selectedGameFilter.toLowerCase())) {
          return false;
        }
      }
      // Year filter
      if (selectedYearFilter !== 'ALL' && r.year !== selectedYearFilter) {
        return false;
      }
      // Payment Mode filter
      if (selectedPaymentModeFilter !== 'ALL') {
        const mode = (r.paymentMode || 'UPI').toUpperCase();
        if (mode !== selectedPaymentModeFilter) {
          return false;
        }
      }
      // Payment Status filter
      if (selectedPaymentStatusFilter !== 'ALL') {
        const status = (r.paymentStatus || 'PENDING').toUpperCase();
        if (status !== selectedPaymentStatusFilter) {
          return false;
        }
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (r.fullName || '').toLowerCase().includes(q);
        const matchesId = (r.campusId || '').toLowerCase().includes(q);
        const matchesRegId = (r.registrationId || '').toLowerCase().includes(q);
        const matchesPhone = (r.phone || '').includes(q);
        const matchesEmail = (r.campusEmail || '').toLowerCase().includes(q);
        const matchesUtr = (r.paymentUtr || '').toLowerCase().includes(q);
        return matchesName || matchesId || matchesRegId || matchesPhone || matchesEmail || matchesUtr;
      }
      return true;
    });
  }, [registrations, selectedGameFilter, selectedYearFilter, selectedPaymentModeFilter, selectedPaymentStatusFilter, searchQuery]);

  // Export to CSV
  const handleExportCSV = () => {
    if (registrations.length === 0) return;

    const headers = [
      'Registration ID',
      'Full Name',
      'Phone Number',
      'Campus ID',
      'Campus Email',
      'Year',
      'Tournament Game',
      'Payment Mode',
      'Payment UTR',
      'Payment Status',
      'Registered At (IST)',
      'Status',
    ];

    const rows = filteredRegistrations.map((r) => [
      `"${r.registrationId || ''}"`,
      `"${r.fullName || ''}"`,
      `"${r.phone || ''}"`,
      `"${r.campusId || ''}"`,
      `"${r.campusEmail || ''}"`,
      `"${r.year || ''}"`,
      `"${r.game || ''}"`,
      `"${(r.paymentMode || 'UPI').toUpperCase()}"`,
      `"${r.paymentUtr || ''}"`,
      `"${r.paymentStatus || 'PENDING'}"`,
      `"${r.registeredAtIST || ''}"`,
      `"${r.status || 'CONFIRMED'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `proxima_eclash_registrations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Password Lock View
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen py-16 px-4 flex flex-col justify-center items-center bg-gradient-to-b from-[#030616] via-[#070b2a] to-[#0b0e36] text-slate-100 relative overflow-hidden font-sans selection:bg-cyan-500 selection:text-black">
        {/* Top micro-bar: University & School Attribution matching whole website */}
        <div className="fixed top-0 inset-x-0 z-50 w-full bg-gradient-to-r from-[#2b4bff] via-[#00e5ff] to-[#7c3aed] py-1 px-3 text-center text-[10px] sm:text-xs font-medium tracking-wide text-white/95 flex items-center justify-center gap-1.5 overflow-hidden shadow-md">
          <Sparkles className="w-3 h-3 inline animate-pulse text-amber-200 shrink-0" />
          <span className="truncate text-center">
            <strong>{EVENT_METADATA.school}</strong>
            <span className="hidden xs:inline"> • {EVENT_METADATA.institution}</span>
          </span>
          <span className="hidden sm:inline opacity-75">•</span>
          <span className="hidden sm:inline text-white/90 font-semibold shrink-0">{EVENT_METADATA.dates}</span>
        </div>

        {/* Ambient background volumetric stadium lights matching whole site */}
        <div className="absolute -top-24 left-1/4 w-[500px] h-[500px] rounded-full bg-[#00e5ff]/15 blur-[120px] pointer-events-none" />
        <div className="absolute -top-24 right-1/4 w-[500px] h-[500px] rounded-full bg-[#7c3aed]/20 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full bg-[#2b4bff]/10 blur-[100px] pointer-events-none" />

        {/* Full-width Perspective Cyber Grid */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none select-none"
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

        <div className="max-w-md w-full relative z-10 pt-4">
          <button
            onClick={onBack}
            type="button"
            className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 transition-all shadow-md active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Public Festival</span>
          </button>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 rounded-3xl border border-cyan-500/35 bg-[#070b2a]/90 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,229,255,0.25)]"
          >
            <div className="text-center space-y-3 mb-6">
              <div className="relative w-16 h-16 mx-auto rounded-2xl overflow-hidden p-[1.5px] bg-gradient-to-tr from-[#00e5ff] via-[#2b4bff] to-[#7c3aed] shadow-[0_0_25px_rgba(0,229,255,0.45)]">
                <img
                  src="/proxima-logo.png"
                  alt="PROXIMA Logo"
                  className="w-full h-full object-cover rounded-[14px]"
                />
              </div>
              <h1 className="text-2xl font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-[#00e5ff]">
                Admin Command Center
              </h1>
              <p className="text-xs text-slate-400 font-rajdhani">
                {EVENT_METADATA.school} • Secure Management Access
              </p>
            </div>

            {loginError && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-500/60 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 font-mono">
                  Admin or Viewer Passkey
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter admin key or viewer key..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/20 bg-black/50 text-white text-sm focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 placeholder:text-slate-500"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 font-rajdhani pt-1.5 leading-tight">
                  Enter <strong>Admin Key</strong> for full control, or <strong>Viewer Key</strong> for view-only registration access.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3.5 rounded-xl font-bold font-orbitron text-xs sm:text-sm tracking-wider uppercase bg-gradient-to-r from-cyan-400 via-blue-600 to-indigo-600 hover:from-cyan-300 hover:to-indigo-500 text-black shadow-neon-blue transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <Unlock className="w-4 h-4" />
                <span>{isLoggingIn ? 'Authenticating...' : 'Access Dashboard'}</span>
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  // 2. Authenticated Dashboard View
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030616] via-[#070b2a] to-[#0b0e36] text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-cyan-500 selection:text-black">
      {/* Volumetric Stadium Atmosphere & Perspective Cyber Grid (Fixed Background) */}
      <div className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0">
        <div className="absolute -top-24 left-1/4 w-[500px] h-[500px] rounded-full bg-[#00e5ff]/15 blur-[120px]" />
        <div className="absolute -top-24 right-1/4 w-[500px] h-[500px] rounded-full bg-[#7c3aed]/20 blur-[130px]" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full bg-[#2b4bff]/10 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-20"
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

      {/* Top micro-bar: University & School Attribution matching whole website */}
      <div className="w-full bg-gradient-to-r from-[#2b4bff] via-[#00e5ff] to-[#7c3aed] py-1 px-3 text-center text-[10px] sm:text-xs font-medium tracking-wide text-white/95 flex items-center justify-center gap-1.5 overflow-hidden sticky top-0 z-50 shadow-sm">
        <Sparkles className="w-3 h-3 inline animate-pulse text-amber-200 shrink-0" />
        <span className="truncate text-center">
          <strong>{EVENT_METADATA.school}</strong>
          <span className="hidden xs:inline"> • {EVENT_METADATA.institution}</span>
        </span>
        <span className="hidden sm:inline opacity-75">•</span>
        <span className="hidden sm:inline text-white/90 font-semibold shrink-0">{EVENT_METADATA.dates}</span>
      </div>

      {/* Main Admin Navigation Bar */}
      <header className="border-b border-cyan-500/20 bg-[#070b2a]/90 backdrop-blur-xl sticky top-[24px] sm:top-[26px] z-40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              type="button"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 transition-all border border-white/10"
              title="Return to Public Festival"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-xl overflow-hidden p-[1.5px] bg-gradient-to-tr from-[#00e5ff] via-[#2b4bff] to-[#7c3aed] shadow-[0_0_12px_rgba(0,229,255,0.4)] shrink-0">
                <img
                  src="/proxima-logo.png"
                  alt="PROXIMA Logo"
                  className="w-full h-full object-cover rounded-[10px]"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black font-orbitron tracking-wider text-cyan-400">
                    PROXIMA E-CLASH 2026
                  </span>
                  {isViewer ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                      <Eye className="w-3 h-3 text-amber-400" />
                      VIEWER ACCESS
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      ADMIN PORTAL
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  {EVENT_METADATA.school} • {EVENT_METADATA.venue.short}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isMockData && (
              <span className="hidden sm:inline-flex text-[11px] text-amber-300 font-mono bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                Dev Mock Mode (Configure .env for Sheets)
              </span>
            )}

            <button
              onClick={fetchRegistrations}
              disabled={isLoading}
              type="button"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-200 border border-white/10 transition-all text-xs font-semibold flex items-center gap-1.5"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleExportCSV}
              type="button"
              className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-orbitron text-xs transition-all shadow-neon-blue flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleLogout}
              type="button"
              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all text-xs"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 relative z-10">
        {/* Top Tabs Navigation */}
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('REGISTRATIONS')}
            className={`px-4 py-2.5 rounded-2xl font-bold font-orbitron text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${activeTab === 'REGISTRATIONS'
                ? 'bg-cyan-500 text-black shadow-neon-blue'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
              }`}
          >
            <Users className="w-4 h-4" />
            <span>Player Registrations</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeTab === 'REGISTRATIONS'
                  ? 'bg-black/20 text-black font-bold'
                  : 'bg-white/10 text-cyan-400'
                }`}
            >
              {stats?.total ?? registrations.length}
            </span>
          </button>

          {!isViewer && (
            <>
              <button
                onClick={() => setActiveTab('VOLUNTEERS')}
                className={`px-4 py-2.5 rounded-2xl font-bold font-orbitron text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${activeTab === 'VOLUNTEERS'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                  }`}
              >
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Volunteers & Passwords</span>
              </button>

              <button
                onClick={() => setActiveTab('CHECKINS')}
                className={`px-4 py-2.5 rounded-2xl font-bold font-orbitron text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${activeTab === 'CHECKINS'
                    ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-md'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                  }`}
              >
                <History className="w-4 h-4 text-fuchsia-400" />
                <span>Check-in Audit Ledger</span>
              </button>

              <button
                onClick={() => setActiveTab('FIXTURES')}
                className={`px-4 py-2.5 rounded-2xl font-bold font-orbitron text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${activeTab === 'FIXTURES'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                  }`}
              >
                <Swords className="w-4 h-4 text-emerald-400" />
                <span>Fixtures &amp; Draw</span>
              </button>
            </>
          )}
        </div>

        {/* Viewer Mode Banner */}
        {isViewer && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(245,158,11,0.12)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-300">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold font-orbitron text-amber-300 text-xs sm:text-sm flex items-center gap-2">
                  <span>Read-Only Viewer Access Active</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-400/20 text-amber-200 border border-amber-400/30">
                    View-Only
                  </span>
                </div>
                <div className="text-[11px] sm:text-xs text-amber-200/80 font-rajdhani pt-0.5">
                  You are viewing live registrations. Changing payment status, toggling payment modes, and deleting records are restricted to Full Administrators.
                </div>
              </div>
            </div>
            <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 border border-amber-500/30 text-amber-300">
              Protected
            </span>
          </div>
        )}

        {/* TAB 1: PLAYER REGISTRATIONS */}
        {activeTab === 'REGISTRATIONS' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-3.5">
              {/* Card 1: Total Registrations */}
              <button
                type="button"
                onClick={() => setSelectedGameFilter('ALL')}
                className={`p-4 sm:p-5 rounded-2xl bg-[#080d32] border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  selectedGameFilter === 'ALL'
                    ? 'border-cyan-400 ring-2 ring-cyan-400/30 shadow-[0_0_25px_rgba(0,229,255,0.25)]'
                    : 'border-cyan-500/30 hover:border-cyan-400/60 shadow-[0_0_20px_rgba(0,229,255,0.1)]'
                }`}
              >
                <div className="flex items-center justify-between text-cyan-400 mb-2">
                  <span className="text-[11px] font-bold uppercase font-mono tracking-wider text-slate-300">
                    Total Players
                  </span>
                  <Users className="w-4 h-4" />
                </div>
                <div className="text-2xl sm:text-3xl font-black font-orbitron text-white">
                  {stats?.total ?? registrations.length}
                </div>
                <div className="text-[10px] text-cyan-300 font-mono mt-1">Confirmed Arena Entries</div>
              </button>

              {/* Card 2: Free Fire */}
              <button
                type="button"
                onClick={() => setSelectedGameFilter(selectedGameFilter === 'Free Fire' ? 'ALL' : 'Free Fire')}
                className={`p-4 sm:p-5 rounded-2xl bg-[#080d32] border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  selectedGameFilter === 'Free Fire'
                    ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-[0_0_25px_rgba(251,191,36,0.25)]'
                    : 'border-amber-500/30 hover:border-amber-400/60 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between text-amber-400 mb-2">
                  <span className="text-[11px] font-bold uppercase font-mono tracking-wider text-slate-300">
                    Free Fire
                  </span>
                  <Flame className="w-4 h-4" />
                </div>
                <div className="text-2xl sm:text-3xl font-black font-orbitron text-white">
                  {getGameCount('Free Fire')}
                </div>
                <div className="text-[10px] text-amber-300 font-mono mt-1">Battle Royale</div>
              </button>

              {/* Card 3: BGMI */}
              <button
                type="button"
                onClick={() => setSelectedGameFilter(selectedGameFilter === 'BGMI' ? 'ALL' : 'BGMI')}
                className={`p-4 sm:p-5 rounded-2xl bg-[#080d32] border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  selectedGameFilter === 'BGMI'
                    ? 'border-blue-400 ring-2 ring-blue-400/30 shadow-[0_0_25px_rgba(59,130,246,0.25)]'
                    : 'border-blue-500/30 hover:border-blue-400/60 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between text-blue-400 mb-2">
                  <span className="text-[11px] font-bold uppercase font-mono tracking-wider text-slate-300">
                    BGMI
                  </span>
                  <Crosshair className="w-4 h-4" />
                </div>
                <div className="text-2xl sm:text-3xl font-black font-orbitron text-white">
                  {getGameCount('BGMI')}
                </div>
                <div className="text-[10px] text-blue-300 font-mono mt-1">Battle Royale</div>
              </button>

              {/* Card 4: Mini Militia */}
              <button
                type="button"
                onClick={() => setSelectedGameFilter(selectedGameFilter === 'Mini Militia' ? 'ALL' : 'Mini Militia')}
                className={`p-4 sm:p-5 rounded-2xl bg-[#080d32] border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  selectedGameFilter === 'Mini Militia'
                    ? 'border-purple-400 ring-2 ring-purple-400/30 shadow-[0_0_25px_rgba(168,85,247,0.25)]'
                    : 'border-purple-500/30 hover:border-purple-400/60 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between text-purple-400 mb-2">
                  <span className="text-[11px] font-bold uppercase font-mono tracking-wider text-slate-300">
                    Mini Militia
                  </span>
                  <Gamepad2 className="w-4 h-4" />
                </div>
                <div className="text-2xl sm:text-3xl font-black font-orbitron text-white">
                  {getGameCount('Mini Militia')}
                </div>
                <div className="text-[10px] text-purple-300 font-mono mt-1">Deathmatch FFA</div>
              </button>

              {/* Card 5: eFootball */}
              <button
                type="button"
                onClick={() => setSelectedGameFilter(selectedGameFilter === 'eFootball' ? 'ALL' : 'eFootball')}
                className={`p-4 sm:p-5 rounded-2xl bg-[#080d32] border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  selectedGameFilter === 'eFootball'
                    ? 'border-emerald-400 ring-2 ring-emerald-400/30 shadow-[0_0_25px_rgba(16,185,129,0.25)]'
                    : 'border-emerald-500/30 hover:border-emerald-400/60 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between text-emerald-400 mb-2">
                  <span className="text-[11px] font-bold uppercase font-mono tracking-wider text-slate-300">
                    eFootball
                  </span>
                  <Trophy className="w-4 h-4" />
                </div>
                <div className="text-2xl sm:text-3xl font-black font-orbitron text-white">
                  {getGameCount('eFootball')}
                </div>
                <div className="text-[10px] text-emerald-300 font-mono mt-1">1v1 Mobile Sim</div>
              </button>

              {/* Card 6: Carrom */}
              <button
                type="button"
                onClick={() => setSelectedGameFilter(selectedGameFilter === 'Carrom' ? 'ALL' : 'Carrom')}
                className={`p-4 sm:p-5 rounded-2xl bg-[#080d32] border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  selectedGameFilter === 'Carrom'
                    ? 'border-cyan-400 ring-2 ring-cyan-400/30 shadow-[0_0_25px_rgba(6,182,212,0.25)]'
                    : 'border-cyan-500/30 hover:border-cyan-400/60 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between text-cyan-400 mb-2">
                  <span className="text-[11px] font-bold uppercase font-mono tracking-wider text-slate-300">
                    Carrom
                  </span>
                  <Target className="w-4 h-4" />
                </div>
                <div className="text-2xl sm:text-3xl font-black font-orbitron text-white">
                  {getGameCount('Carrom')}
                </div>
                <div className="text-[10px] text-cyan-300 font-mono mt-1">1v1 Disc Pool</div>
              </button>

            </div>

            {/* Filter and Search Bar */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#070b29] border border-white/10 flex flex-col md:flex-row gap-3 items-center justify-between">
              {/* Search Box */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Name, ID, Phone..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/15 bg-black/40 text-sm text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder:text-slate-500"
                />
              </div>

              {/* Filter Dropdowns */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                {/* Game Filter */}
                <select
                  value={selectedGameFilter}
                  onChange={(e) => setSelectedGameFilter(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-white/15 bg-black/50 text-slate-200 text-xs font-semibold focus:border-cyan-400"
                >
                  <option value="ALL">All Disciplines (5 Games)</option>
                  <option value="Free Fire">Free Fire (BR)</option>
                  <option value="BGMI">BGMI (BR)</option>
                  <option value="Mini Militia">Mini Militia (FFA)</option>
                  <option value="eFootball">eFootball (1v1)</option>
                  <option value="Carrom">Carrom (1v1 Disc)</option>
                </select>

                {/* Year Filter */}
                <select
                  value={selectedYearFilter}
                  onChange={(e) => setSelectedYearFilter(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-white/15 bg-black/50 text-slate-200 text-xs font-semibold focus:border-cyan-400"
                >
                  <option value="ALL">All Academic Years</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                </select>

                {/* Payment Mode Filter */}
                <select
                  value={selectedPaymentModeFilter}
                  onChange={(e) => setSelectedPaymentModeFilter(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-white/15 bg-black/50 text-slate-200 text-xs font-semibold focus:border-cyan-400"
                >
                  <option value="ALL">All Payment Modes</option>
                  <option value="UPI">UPI Online</option>
                  <option value="CASH">Cash at Desk</option>
                </select>

                {/* Payment Status Filter */}
                <select
                  value={selectedPaymentStatusFilter}
                  onChange={(e) => setSelectedPaymentStatusFilter(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-white/15 bg-black/50 text-slate-200 text-xs font-semibold focus:border-cyan-400"
                >
                  <option value="ALL">All Payment Statuses</option>
                  <option value="PAID">PAID</option>
                  <option value="PENDING">PENDING</option>
                </select>

                {/* Showing count */}
                <div className="text-xs text-slate-400 font-mono px-2">
                  Showing <strong>{filteredRegistrations.length}</strong> of <strong>{registrations.length}</strong>
                </div>
              </div>
            </div>

            {/* Notifications */}
            {paymentUpdateMsg && (
              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{paymentUpdateMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentUpdateMsg('')}
                  className="text-cyan-400 hover:text-cyan-200 text-xs font-mono font-bold"
                >
                  ✕
                </button>
              </div>
            )}
            {paymentUpdateError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{paymentUpdateError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentUpdateError('')}
                  className="text-red-400 hover:text-red-200 text-xs font-mono font-bold"
                >
                  ✕
                </button>
              </div>
            )}
            {deleteSuccessMsg && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{deleteSuccessMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteSuccessMsg('')}
                  className="text-emerald-400 hover:text-emerald-200 text-xs font-mono font-bold"
                >
                  ✕
                </button>
              </div>
            )}
            {deleteError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{deleteError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteError('')}
                  className="text-red-400 hover:text-red-200 text-xs font-mono font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Registrations Data Table */}
            <div className="rounded-2xl border border-white/10 bg-[#070b29] overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0b103b] text-slate-300 font-mono uppercase tracking-wider text-[11px] border-b border-white/10">
                    <tr>
                      <th className="py-3.5 px-4 font-bold">Reg ID</th>
                      <th className="py-3.5 px-4 font-bold">Player Name</th>
                      <th className="py-3.5 px-4 font-bold">Mobile Phone</th>
                      <th className="py-3.5 px-4 font-bold">Campus ID</th>
                      <th className="py-3.5 px-4 font-bold">Campus Email</th>
                      <th className="py-3.5 px-4 font-bold">Year</th>
                      <th className="py-3.5 px-4 font-bold">Tournament Game</th>
                      <th className="py-3.5 px-4 font-bold">Payment</th>
                      <th className="py-3.5 px-4 font-bold">Status</th>
                      <th className="py-3.5 px-4 font-bold text-right">{isViewer ? 'Permissions' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans">
                    {filteredRegistrations.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400 font-mono">
                          No registered players match the current search or filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredRegistrations.map((row, idx) => (
                        <tr
                          key={row.registrationId || `reg-${idx}`}
                          className="hover:bg-white/[0.03] transition-colors"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-cyan-300">
                            {row.registrationId}
                          </td>
                          <td className="py-3 px-4 font-semibold text-white">
                            {row.fullName}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">
                            {row.phone}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-cyan-400">
                            {row.campusId}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                            {row.campusEmail}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {row.year}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${row.game === 'Free Fire'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : row.game === 'BGMI'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    : row.game === 'Mini Militia'
                                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                      : row.game === 'eFootball'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                }`}
                            >
                              <Gamepad2 className="w-3 h-3" />
                              {row.game}
                            </span>
                          </td>
                          <td className="py-3 px-4 align-top">
                            {isViewer ? (
                              <div className="space-y-1.5 min-w-[190px]">
                                {/* Read-Only Payment Mode */}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400 font-mono">Mode:</span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                      (row.paymentMode || 'UPI').toUpperCase() === 'CASH'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                    }`}
                                  >
                                    {(row.paymentMode || 'UPI').toUpperCase() === 'CASH' ? '💵 CASH' : '📱 UPI'}
                                  </span>
                                </div>

                                {/* Read-Only Payment Status */}
                                <div className="flex items-center gap-2">
                                  {(row.paymentStatus || 'PENDING').toUpperCase() === 'PAID' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                      ACCEPTED
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                      <Clock className="w-3 h-3 text-amber-400" />
                                      PENDING
                                    </span>
                                  )}

                                  {row.paymentScreenshot ? (
                                    <a
                                      href={row.paymentScreenshot}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/20"
                                      title="View payment receipt screenshot"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      Proof
                                    </a>
                                  ) : (row.paymentMode || 'UPI').toUpperCase() === 'CASH' ? (
                                    <span className="text-[10px] text-emerald-400/80 font-mono">Volunteer Cash</span>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 font-mono">No proof</span>
                                  )}
                                </div>

                                {/* Additional Info (UTR or Desk Cash notice) */}
                                {(row.paymentMode || 'UPI').toUpperCase() === 'UPI' ? (
                                  <div className="text-[10px] text-slate-300 font-mono truncate max-w-[210px]">
                                    <span className="text-slate-400">UTR:</span>{' '}
                                    <span className="text-cyan-300 font-bold">{row.paymentUtr || '—'}</span>
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-emerald-300/80 font-mono flex items-center gap-1">
                                    <span>₹50 collected by volunteer</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-2 min-w-[210px]">
                                {/* Payment Mode Switcher (UPI / CASH) */}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400 font-mono">Mode:</span>
                                  <div className="inline-flex rounded-lg bg-black/60 p-0.5 border border-white/10 shadow-inner">
                                    <button
                                      type="button"
                                      disabled={updatingPaymentId === row.registrationId}
                                      onClick={() => handleUpdatePayment(row.registrationId, { paymentMode: 'UPI' })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all flex items-center gap-1 ${
                                        (row.paymentMode || 'UPI').toUpperCase() === 'UPI'
                                          ? 'bg-cyan-500 text-black shadow-neon-blue'
                                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                      }`}
                                      title="Mark payment method as UPI Online"
                                    >
                                      <QrCode className="w-2.5 h-2.5" />
                                      UPI
                                    </button>
                                    <button
                                      type="button"
                                      disabled={updatingPaymentId === row.registrationId}
                                      onClick={() => handleUpdatePayment(row.registrationId, { paymentMode: 'CASH' })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all flex items-center gap-1 ${
                                        (row.paymentMode || 'UPI').toUpperCase() === 'CASH'
                                          ? 'bg-emerald-500 text-black shadow-sm'
                                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                      }`}
                                      title="Mark payment method as Cash at Registration Desk"
                                    >
                                      <Banknote className="w-2.5 h-2.5" />
                                      CASH
                                    </button>
                                  </div>

                                  {updatingPaymentId === row.registrationId && (
                                    <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin ml-1" />
                                  )}
                                </div>

                                {/* Payment Status Action / Toggle */}
                                <div className="flex flex-wrap items-center gap-2">
                                  {(row.paymentStatus || 'PENDING').toUpperCase() === 'PAID' ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                        ACCEPTED
                                      </span>
                                      <button
                                        type="button"
                                        disabled={updatingPaymentId === row.registrationId}
                                        onClick={() => handleUpdatePayment(row.registrationId, { paymentStatus: 'PENDING' })}
                                        className="text-[9px] font-mono text-slate-400 hover:text-amber-300 underline transition-colors cursor-pointer"
                                        title="Revert payment back to PENDING and set status back to PENDING"
                                      >
                                        Revert
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={updatingPaymentId === row.registrationId}
                                      onClick={() => handleUpdatePayment(row.registrationId, { paymentStatus: 'PAID' })}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-gradient-to-r from-emerald-500 to-teal-400 text-black shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                                      title="Accept payment: changes payment to ACCEPTED and status to CONFIRMED"
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Accept {(row.paymentMode || 'UPI').toUpperCase() === 'CASH' ? 'Cash' : 'Payment'}</span>
                                    </button>
                                  )}

                                  {row.paymentScreenshot ? (
                                    <a
                                      href={row.paymentScreenshot}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/20"
                                      title="View payment receipt screenshot"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      Proof
                                    </a>
                                  ) : (row.paymentMode || 'UPI').toUpperCase() === 'CASH' ? (
                                    <span className="text-[10px] text-emerald-400/80 font-mono">Volunteer Cash</span>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 font-mono">No proof</span>
                                  )}
                                </div>

                                {/* Additional Info (UTR or Desk Cash notice) */}
                                {(row.paymentMode || 'UPI').toUpperCase() === 'UPI' ? (
                                  <div className="text-[10px] text-slate-300 font-mono truncate max-w-[210px]">
                                    <span className="text-slate-400">UTR:</span>{' '}
                                    <span className="text-cyan-300 font-bold">{row.paymentUtr || '—'}</span>
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-emerald-300/80 font-mono flex items-center gap-1">
                                    <span>₹50 collected by volunteer</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {(row.status || 'CONFIRMED').toUpperCase() === 'CONFIRMED' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                CONFIRMED
                              </span>
                            ) : (
                              <div className="space-y-0.5">
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  title="Awaiting payment to be accepted by admin"
                                >
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  PENDING
                                </span>
                                <div className="text-[9px] text-slate-400 font-mono">Awaiting Accept</div>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isViewer ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-[10px] font-mono">
                                <Lock className="w-3 h-3 text-amber-400" />
                                <span>View Only</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteError('');
                                  setRegistrationToDelete(row);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/50 transition-colors text-[11px] font-mono font-semibold cursor-pointer"
                                title="Delete Player Registration"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DELETE REGISTRATION CONFIRMATION MODAL */}
            {registrationToDelete && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="relative w-full max-w-md bg-[#0a0f38] border border-red-500/30 rounded-2xl p-6 shadow-2xl shadow-red-950/40">
                  <div className="flex items-center gap-3 text-red-400 mb-4">
                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                      <AlertTriangle className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold font-orbitron text-white">Delete Registration</h3>
                      <p className="text-xs text-red-400 font-mono">Irreversible Tournament Action</p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 mb-4">
                    Are you sure you want to permanently delete registration{' '}
                    <span className="font-mono font-bold text-cyan-300">{registrationToDelete.registrationId}</span> for{' '}
                    <strong className="text-white">{registrationToDelete.fullName}</strong>?
                  </p>

                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono space-y-1.5 mb-5 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Campus ID:</span>
                      <span className="text-cyan-300 font-bold">{registrationToDelete.campusId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Game Discipline:</span>
                      <span className="text-amber-300 font-bold">{registrationToDelete.game}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Academic Year:</span>
                      <span className="text-slate-300">{registrationToDelete.year}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Campus Email:</span>
                      <span className="text-slate-300">{registrationToDelete.campusEmail}</span>
                    </div>
                  </div>

                  {deleteError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 mb-4">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{deleteError}</span>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 mb-6">
                    This registration will be permanently deleted from Supabase. The player&apos;s ticket QR code will become invalid immediately.
                  </p>

                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setRegistrationToDelete(null);
                        setDeleteError('');
                      }}
                      disabled={isDeleting}
                      className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteRegistration}
                      disabled={isDeleting}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-mono transition-colors shadow-lg shadow-red-900/40 flex items-center gap-2 disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Confirm Delete</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: VOLUNTEERS & PASSWORDS MANAGER */}
        {activeTab === 'VOLUNTEERS' && (
          <div className="animate-in fade-in duration-200">
            <VolunteersManager token={token} />
          </div>
        )}

        {/* TAB 3: CHECK-INS AUDIT LEDGER */}
        {activeTab === 'CHECKINS' && (
          <div className="animate-in fade-in duration-200">
            <CheckInsViewer token={token} />
          </div>
        )}

        {/* TAB 4: FIXTURES & DRAW */}
        {activeTab === 'FIXTURES' && (
          <div className="animate-in fade-in duration-200">
            <FixturesTab token={token} registrations={registrations} />
          </div>
        )}

        {/* Connected Supabase Database Info Banner */}
        <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono">
            <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Supabase PostgreSQL Live Database Active</span>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">
            High-Performance Real-Time Storage
          </span>
        </div>
      </main>
    </div>
  );
};
