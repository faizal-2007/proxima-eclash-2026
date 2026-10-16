import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LogOut,
  History,
  WifiOff,
  Gamepad2,
  Volume2,
  VolumeX,
  Keyboard,
  Camera,
  RefreshCw,
  Search,
  CloudUpload,
} from 'lucide-react';
import {
  getStoredVolunteerProfile,
  getStoredVolunteerToken,
  isTokenExpired,
  clearVolunteerSession,
  getSelectedStation,
  setSelectedStation,
} from '../utils/volunteerAuth';
import {
  playSuccessFeedback,
  playWarningFeedback,
  playErrorFeedback,
  getSoundMuted,
  setSoundMuted,
} from '../utils/audioFeedback';
import {
  getOfflineQueue,
  enqueueOfflineCheckIn,
  syncOfflineQueue,
} from '../utils/offlineQueue';
import { CameraScanner } from '../components/volunteer/CameraScanner';
import { ScanResultCard } from '../components/volunteer/ScanResultCard';
import { StationStatsHud } from '../components/volunteer/StationStatsHud';
import { ManualSearchModal } from '../components/volunteer/ManualSearchModal';

const STATIONS = [
  'All / Registration Desk',
  'Free Fire',
  'BGMI',
  'Mini Militia',
  'Valorant',
  'eFootball',
  'Carrom',
];

export function VolunteerScannerDashboard({ onLogout, onNavigateHistory }) {
  const [profile] = useState(() => getStoredVolunteerProfile());
  const [station, setStation] = useState(() => getSelectedStation());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isMuted, setIsMuted] = useState(() => getSoundMuted());

  // Offline queue state
  const [offlineCount, setOfflineCount] = useState(() => getOfflineQueue().length);
  const [isSyncing, setIsSyncing] = useState(false);

  // Stats refresh trigger
  const [refreshStatsTrigger, setRefreshStatsTrigger] = useState(0);

  // Auto check-in toggle state
  const [autoCheckIn, setAutoCheckIn] = useState(() => {
    try {
      return localStorage.getItem('proxima_auto_checkin') === 'true';
    } catch {
      return false;
    }
  });

  // Scanner & Result states
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // Manual lookup quick toggle
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Search modal state
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const autoDismissTimerRef = useRef(null);

  // Monitor network online/offline state and auto-sync queue
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const queue = getOfflineQueue();
      if (queue.length > 0) {
        setIsSyncing(true);
        const token = getStoredVolunteerToken();
        if (token) {
          await syncOfflineQueue(token);
          setOfflineCount(getOfflineQueue().length);
          setRefreshStatsTrigger((prev) => prev + 1);
        }
        setIsSyncing(false);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Periodic token expiry check
  useEffect(() => {
    const interval = setInterval(() => {
      const token = getStoredVolunteerToken();
      if (!token || isTokenExpired(token)) {
        console.warn('Volunteer token expired. Auto logout.');
        clearVolunteerSession();
        onLogout?.();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [onLogout]);

  // Handle station change
  const handleStationChange = (e) => {
    const newStation = e.target.value;
    setStation(newStation);
    setSelectedStation(newStation);
  };

  // Toggle sound
  const handleToggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    setSoundMuted(nextMuted);
  };

  // Toggle auto check-in
  const handleToggleAutoCheckIn = () => {
    const next = !autoCheckIn;
    setAutoCheckIn(next);
    try {
      localStorage.setItem('proxima_auto_checkin', next ? 'true' : 'false');
    } catch {}
  };

  // Manual trigger to sync offline queue
  const handleManualSyncQueue = async () => {
    if (isSyncing || offlineCount === 0) return;
    const token = getStoredVolunteerToken();
    if (!token) return;

    setIsSyncing(true);
    await syncOfflineQueue(token);
    setOfflineCount(getOfflineQueue().length);
    setRefreshStatsTrigger((prev) => prev + 1);
    setIsSyncing(false);
  };

  // Process a QR code scanned or manually submitted
  const handleProcessScan = useCallback(
    async (code) => {
      if (!code || isProcessing) return;

      const token = getStoredVolunteerToken();
      if (!token) {
        onLogout?.();
        return;
      }

      setIsProcessing(true);
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
      }

      try {
        const response = await fetch('/api/volunteer/scan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            qrToken: code.trim(),
            station,
            autoCheckIn,
          }),
        });

        if (response.status === 401) {
          clearVolunteerSession();
          onLogout?.();
          return;
        }

        const data = await response.json();
        setScanResult(data);

        // Audio & Haptic feedback
        if (data.status === 'checkedIn' || data.status === 'valid') {
          playSuccessFeedback();
          if (data.status === 'checkedIn') {
            setRefreshStatsTrigger((prev) => prev + 1);
          }
        } else if (
          data.status === 'wrongStation' ||
          data.status === 'alreadyCheckedIn'
        ) {
          playWarningFeedback();
        } else {
          playErrorFeedback();
        }

        // If Auto Check-in was enabled and check-in succeeded, show green card for 2.0s then resume
        if (autoCheckIn && data.status === 'checkedIn') {
          autoDismissTimerRef.current = setTimeout(() => {
            setScanResult(null);
          }, 2000);
        }
      } catch (err) {
        console.error('Scan processing error:', err);
        playErrorFeedback();
        setScanResult({
          success: false,
          status: 'error',
          error: 'Network connection error while verifying ticket. Please retry or check offline queue.',
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [autoCheckIn, isProcessing, onLogout, station]
  );

  // Perform manual check-in from Result Card
  const handleConfirmCheckIn = async (override = false) => {
    if (!scanResult?.participant?.registrationId || isCheckingIn) return;

    const token = getStoredVolunteerToken();
    if (!token) {
      onLogout?.();
      return;
    }

    setIsCheckingIn(true);

    // If offline, save directly to offline queue
    if (!navigator.onLine) {
      enqueueOfflineCheckIn({
        registrationId: scanResult.participant.registrationId,
        station,
        override,
        volunteer: profile,
      });
      setOfflineCount(getOfflineQueue().length);
      playSuccessFeedback();
      setScanResult((prev) => ({
        ...prev,
        status: 'checkedIn',
        participant: {
          ...prev.participant,
          checkedIn: true,
          checkedInAt: new Date().toISOString(),
          checkedInBy: `${profile?.name || 'Volunteer'} (OFFLINE QUEUE)`,
        },
        message: 'Saved offline! Will automatically sync to Supabase once reconnected.',
      }));
      setIsCheckingIn(false);
      return;
    }

    try {
      const response = await fetch('/api/volunteer/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          registrationId: scanResult.participant.registrationId,
          station,
          override,
        }),
      });

      const data = await response.json();

      if (data.success) {
        playSuccessFeedback();
        setRefreshStatsTrigger((prev) => prev + 1);
        setScanResult((prev) => ({
          ...prev,
          status: 'checkedIn',
          participant: data.participant,
          message: data.message || 'Check-in confirmed!',
        }));
      } else {
        playWarningFeedback();
        setScanResult((prev) => ({
          ...prev,
          status: data.status || 'alreadyCheckedIn',
          message: data.message || 'Check-in could not be completed.',
        }));
      }
    } catch (err) {
      console.error('Checkin error:', err);
      // Fallback to offline queue on network drop
      enqueueOfflineCheckIn({
        registrationId: scanResult.participant.registrationId,
        station,
        override,
        volunteer: profile,
      });
      setOfflineCount(getOfflineQueue().length);
      playSuccessFeedback();
      setScanResult((prev) => ({
        ...prev,
        status: 'checkedIn',
        participant: {
          ...prev.participant,
          checkedIn: true,
          checkedInAt: new Date().toISOString(),
          checkedInBy: `${profile?.name || 'Volunteer'} (OFFLINE QUEUE)`,
        },
        message: 'Network dropped — saved to offline queue and will sync automatically.',
      }));
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Close result card and resume scanning
  const handleScanNext = () => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
    }
    setScanResult(null);
    setManualCode('');
  };

  // Handle manual code submission form
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleProcessScan(manualCode);
  };

  return (
    <div className="min-h-screen bg-[#05071a] text-slate-100 flex flex-col font-sans relative selection:bg-cyan-500 selection:text-black pb-6">
      {/* Top Accent Gradient Bar */}
      <div className="fixed top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#2b4bff] via-[#7c3aed] to-[#d946ef] z-50" />

      {/* Top Navigation Bar: volunteer name, station selector, online status, sound, logout */}
      <header className="sticky top-0 z-40 bg-[#070b24]/95 backdrop-blur-md border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          {/* Volunteer identity & Campus ID */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2b4bff] to-[#7c3aed] flex items-center justify-center text-white shrink-0 font-bold font-orbitron text-xs shadow-md">
              VL
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white truncate max-w-[130px] sm:max-w-[180px]">
                  {profile?.name || 'Volunteer'}
                </span>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Volunteer
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono truncate">
                Campus ID: {profile?.username || '—'}
              </div>
            </div>
          </div>

          {/* Right controls: Sound, Online indicator, Logout */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Audio Feedback Toggle */}
            <button
              onClick={handleToggleSound}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-white/5 text-slate-500 border-white/10'
                  : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
              }`}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              aria-label="Mute Audio"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Online/Offline indicator */}
            <div
              className={`flex items-center gap-1 text-[11px] font-mono px-2 py-1.5 rounded-xl border ${
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
              title={isOnline ? 'Online' : 'Offline'}
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Offline</span>
                </>
              )}
            </div>

            {/* Logout button */}
            <button
              onClick={() => {
                clearVolunteerSession();
                onLogout?.();
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 transition-all cursor-pointer"
              title="Log out"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Station Selector Bar */}
        <div className="max-w-xl mx-auto mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between gap-3">
          <label
            htmlFor="station-select"
            className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
            Station:
          </label>
          <select
            id="station-select"
            value={station}
            onChange={handleStationChange}
            className="flex-1 bg-[#030617] text-white text-xs font-bold py-1.5 px-3 rounded-lg border border-white/15 focus:border-cyan-400 outline-none cursor-pointer"
          >
            {STATIONS.map((s) => (
              <option key={s} value={s} className="bg-[#070b24] text-white">
                {s}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Offline Queue Sync Banner (Visible when items pending sync) */}
        {offlineCount > 0 && (
          <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-between gap-3 text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <CloudUpload className="w-4 h-4 shrink-0 animate-bounce" />
              <span>
                <strong>{offlineCount} scan{offlineCount > 1 ? 's' : ''}</strong> queued locally.
              </span>
            </div>
            <button
              onClick={handleManualSyncQueue}
              disabled={isSyncing || !isOnline}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-bold text-[11px] disabled:opacity-50 cursor-pointer"
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        )}

        {/* LIVE STATION STATS HUD */}
        <StationStatsHud
          station={station}
          token={getStoredVolunteerToken()}
          refreshTrigger={refreshStatsTrigger}
        />

        {/* Control Bar: Auto Check-in Toggle, Quick Manual Entry, Search Player */}
        <div className="grid grid-cols-3 gap-2">
          {/* Auto Check-in Toggle */}
          <button
            onClick={handleToggleAutoCheckIn}
            className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
              autoCheckIn
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-[9px] uppercase font-bold tracking-wider">Auto Check</div>
            <div className="text-[11px] font-bold text-white truncate">
              {autoCheckIn ? 'ON (2s)' : 'OFF'}
            </div>
          </button>

          {/* Manual Entry Toggle */}
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
              showManualInput
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-[9px] uppercase font-bold tracking-wider">Input Mode</div>
            <div className="text-[11px] font-bold text-white flex items-center gap-1">
              {showManualInput ? <Camera className="w-3.5 h-3.5" /> : <Keyboard className="w-3.5 h-3.5" />}
              <span>{showManualInput ? 'Code' : 'Camera'}</span>
            </div>
          </button>

          {/* Player Search Modal Button */}
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="p-2.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-fuchsia-500/15 hover:border-fuchsia-500/40 text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5"
          >
            <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Search DB</div>
            <div className="text-[11px] font-bold text-white flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>Lookup</span>
            </div>
          </button>
        </div>

        {/* Manual Code / Registration ID Entry Form */}
        {showManualInput && (
          <form
            onSubmit={handleManualSubmit}
            className="p-4 rounded-2xl bg-[#080d2c] border border-cyan-500/30 space-y-3 animate-in fade-in duration-200 shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-300 flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
                Manual Ticket / ID Verification
              </span>
              <span className="text-[10px] text-slate-400 font-mono">ECL-2026-XXXX</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter Registration ID or QR payload"
                className="flex-1 px-3.5 py-2.5 bg-[#030617] border border-white/15 focus:border-[#00e5ff] rounded-xl text-white placeholder-slate-500 text-xs font-mono outline-none"
              />
              <button
                type="submit"
                disabled={isProcessing || !manualCode.trim()}
                className="px-4 py-2.5 rounded-xl font-bold font-orbitron text-xs uppercase bg-[#00e5ff] text-black hover:bg-cyan-300 disabled:opacity-50 transition-all cursor-pointer shrink-0"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Verify'}
              </button>
            </div>
          </form>
        )}

        {/* LIVE CAMERA SCANNER COMPONENT */}
        <div className="space-y-3">
          <CameraScanner
            onScanSuccess={handleProcessScan}
            isPaused={Boolean(scanResult) || isProcessing}
            onOpenManualEntry={() => setShowManualInput(true)}
          />
        </div>

        {/* Scanning in progress indicator */}
        {isProcessing && (
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center gap-2 text-xs text-cyan-300 font-semibold animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Verifying ticket cryptographic signature...</span>
          </div>
        )}

        {/* Bottom Actions: Scan History Link */}
        <div className="pt-2">
          <button
            onClick={onNavigateHistory}
            className="w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <History className="w-4 h-4 text-fuchsia-400" />
            <span>View Scan History (/volunteer/history)</span>
          </button>
        </div>
      </main>

      {/* FULL-SCREEN / BOTTOM-SHEET SCAN RESULT CARD OVERLAY */}
      <ScanResultCard
        scanResult={scanResult}
        station={station}
        onCheckIn={() => handleConfirmCheckIn(false)}
        onOverrideCheckIn={() => handleConfirmCheckIn(true)}
        onScanNext={handleScanNext}
        isCheckingIn={isCheckingIn}
      />

      {/* MANUAL PARTICIPANT LOOKUP MODAL */}
      <ManualSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        token={getStoredVolunteerToken()}
        station={station}
        onCheckInParticipant={(player) => handleProcessScan(player.registrationId)}
      />
    </div>
  );
}

