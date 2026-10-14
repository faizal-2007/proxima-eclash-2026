/**
 * Web Audio API and Haptic feedback helper for Volunteer Scanner.
 * Synthesizes clean audio tones without requiring external mp3 assets.
 */

let audioCtx = null;
let isMuted = false;

export function setSoundMuted(muted) {
  isMuted = muted;
  try {
    localStorage.setItem('proxima_scanner_muted', muted ? 'true' : 'false');
  } catch {}
}

export function getSoundMuted() {
  try {
    return localStorage.getItem('proxima_scanner_muted') === 'true';
  } catch {
    return false;
  }
}

function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play a high, upbeat chime for successful check-in
 */
export function playSuccessFeedback() {
  // Haptic feedback
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(100);
    } catch {}
  }

  if (isMuted) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch (err) {
    console.warn('Audio feedback failed:', err);
  }
}

/**
 * Play an amber double-beep warning for wrong station or already checked-in
 */
export function playWarningFeedback() {
  // Haptic feedback
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([80, 50, 80]);
    } catch {}
  }

  if (isMuted) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';

    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(440, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  } catch (err) {
    console.warn('Audio feedback failed:', err);
  }
}

/**
 * Play a low buzz error for invalid, tampered, or unknown tickets
 */
export function playErrorFeedback() {
  // Haptic feedback
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch {}
  }

  if (isMuted) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';

    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(130, now + 0.3);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch (err) {
    console.warn('Audio feedback failed:', err);
  }
}
