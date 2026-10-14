import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  Gamepad2,
} from 'lucide-react';
import { saveVolunteerSession } from '../utils/volunteerAuth';

export function VolunteerLoginPage({ onSuccess, onBackToHome }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage('');
    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      setErrorMessage('Please enter both your volunteer username and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/volunteer/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: cleanUser,
          password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 429) {
          const waitSecs = data?.retryAfterSeconds || 600;
          setRetryCountdown(waitSecs);
          setErrorMessage(
            data?.error || 'Too many failed login attempts. Please wait before trying again.'
          );
        } else {
          setErrorMessage(
            data?.error || `Authentication failed (HTTP ${response.status}).`
          );
        }
        setIsSubmitting(false);
        return;
      }

      // Successful authentication
      saveVolunteerSession(data.token, data.volunteer);
      onSuccess?.(data.volunteer);
    } catch (err) {
      console.error('Volunteer login network error:', err);
      setErrorMessage('Network connection error. Please verify your internet connectivity.');
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = (demoUser, demoPass) => {
    setUsername(demoUser);
    setPassword(demoPass);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-[#05071a] text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans relative selection:bg-cyan-500 selection:text-black">
      {/* Top Accent Gradient Bar (Blue to Violet to Magenta) */}
      <div className="fixed top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#2b4bff] via-[#7c3aed] to-[#d946ef] z-50" />

      {/* Header bar */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between pt-2">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition-colors py-2 px-2.5 rounded-lg active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit to Main Site</span>
        </button>

        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
          Arena Staff Only
        </span>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-auto py-6">
        <div className="bg-gradient-to-b from-[#0a0f33] via-[#080d2a] to-[#05081c] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_0_30px_rgba(43,75,255,0.15)] relative overflow-hidden">
          {/* Subtle Cyber Glow Background */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#7c3aed]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#2b4bff]/20 rounded-full blur-3xl pointer-events-none" />

          {/* Brand & Title */}
          <div className="text-center space-y-2 mb-7">
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-[#2b4bff] via-[#7c3aed] to-[#d946ef] shadow-[0_0_20px_rgba(124,58,237,0.4)] text-white mb-2">
              <Gamepad2 className="w-7 h-7" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-orbitron text-white tracking-wide">
              VOLUNTEER CHECK-IN
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto">
              All volunteers have equal check-in authority. Sign in using your <strong>Campus ID</strong> as your username and password.
            </p>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{errorMessage}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="volunteer-username"
                className="block text-xs uppercase font-bold tracking-wider text-slate-300 mb-1.5"
              >
                Volunteer Campus ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="volunteer-username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  value={username}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUsername(val);
                    // Helpful ease-of-use: if password is empty or was identical to previous username, keep in sync
                    if (!password || password === username) {
                      setPassword(val);
                    }
                  }}
                  placeholder="e.g. 11111 or 22222"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#030617] border border-white/15 focus:border-[#00e5ff] focus:ring-2 focus:ring-[#00e5ff]/20 rounded-xl text-white placeholder-slate-500 text-sm outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="volunteer-password"
                className="block text-xs uppercase font-bold tracking-wider text-slate-300 mb-1.5"
              >
                Password (Campus ID)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="volunteer-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your Campus ID"
                  required
                  className="w-full pl-10 pr-11 py-3 bg-[#030617] border border-white/15 focus:border-[#00e5ff] focus:ring-2 focus:ring-[#00e5ff]/20 rounded-xl text-white placeholder-slate-500 text-sm outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[50px] py-3.5 px-4 rounded-xl font-bold font-orbitron text-sm uppercase tracking-wider text-white bg-gradient-to-r from-[#2b4bff] via-[#7c3aed] to-[#d946ef] hover:opacity-95 shadow-[0_0_20px_rgba(124,58,237,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Campus ID...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Access Scanner Dashboard</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Seed Credentials Box for Verification */}
          <div className="mt-6 pt-5 border-t border-white/10 text-xs space-y-2">
            <span className="text-slate-400 block font-semibold text-[11px] uppercase tracking-wider">
              Quick Test Volunteer Campus IDs:
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => handleFillDemo('11111', '11111')}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-cyan-300">Volunteer 1 (Alan Ray)</div>
                <div className="font-mono text-slate-400 truncate">ID: 11111</div>
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('22222', '22222')}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-fuchsia-300">Volunteer 2 (Samir Khan)</div>
                <div className="font-mono text-slate-400 truncate">ID: 22222</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer attribution */}
      <div className="text-center text-xs text-slate-500 py-2">
        PROXIMA E-CLASH 2026 • Volunteer Check-in System • 12-Hour Session Security
      </div>
    </div>
  );
}
