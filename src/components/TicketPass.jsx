import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, CheckCircle, MapPin, Calendar, Gamepad2 } from 'lucide-react';
import { EVENT_METADATA } from '../config/eventConfig';

export const TicketPass = ({ registrationData, onBackToHome }) => {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const ticketRef = useRef(null);

  const {
    registrationId = 'ECL-2026-0001',
    qrToken = '',
    fullName = 'Esports Player',
    phone = '9876543210',
    campusId = '11111',
    campusEmail = '',
    year = '1st Year',
    selection = 'Free Fire',
    paymentMode = 'UPI',
    paymentStatus = 'PENDING',
    status = 'PENDING',
  } = registrationData || {};

  // Generate live QR Code on mount from signed qrToken (with fallback to registrationId)
  useEffect(() => {
    const qrPayload = qrToken || registrationId;

    QRCode.toDataURL(qrPayload, {
      width: 200,
      margin: 1,
      color: {
        dark: '#070b2a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR code generation error:', err));
  }, [qrToken, registrationId]);

  // Client-side Ticket Download as High-Res PNG
  const handleDownloadTicket = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 900;
    canvas.height = 1200;

    // Draw ticket dark cyber background
    const bgGrad = ctx.createLinearGradient(0, 0, 900, 1200);
    bgGrad.addColorStop(0, '#070b2a');
    bgGrad.addColorStop(0.5, '#0e1442');
    bgGrad.addColorStop(1, '#05071a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 900, 1200);

    // Decorative cyber border
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, 840, 1140);

    // Header strip
    ctx.fillStyle = '#2b4bff';
    ctx.fillRect(30, 30, 840, 110);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PROXIMA E-CLASH 2026 — PLAYER PASS', 450, 95);

    // Subtitle
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('OFFICIAL ESPORTS TOURNAMENT CREDENTIAL', 450, 195);

    // Registration ID Banner
    ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
    ctx.fillRect(150, 235, 600, 75);
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(150, 235, 600, 75);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px monospace';
    ctx.fillText(`PLAYER ID: ${registrationId}`, 450, 283);

    // Field Labels & Values
    ctx.textAlign = 'left';

    const fields = [
      ['PLAYER NAME', fullName],
      ['YENEPOYA CAMPUS ID', campusId],
      ['STUDENT EMAIL', campusEmail],
      ['CONTACT NUMBER', phone],
      ['STUDENT YEAR', year],
      ['TOURNAMENT GAME', selection],
      ['TOURNAMENT DATE', 'Monday, Oct 26, 2026 (09:00 AM)'],
      ['ARENA VENUE', 'Yenepoya Complex, Balmatta'],
    ];

    let startY = 370;
    fields.forEach(([label, val]) => {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px sans-serif';
      ctx.fillText(label, 120, startY);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(val, 120, startY + 28);

      startY += 70;
    });

    // Draw QR Code
    if (qrDataUrl) {
      const qrImg = new Image();
      qrImg.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(360, 950, 180, 180);
        ctx.drawImage(qrImg, 370, 960, 160, 160);

        ctx.textAlign = 'center';
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('SCAN AT ARENA SECURITY FOR FAST CHECK-IN', 450, 1160);

        // Trigger download
        const a = document.createElement('a');
        a.download = `PROXIMA-ECLASH-PASS-${registrationId}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
      };
      qrImg.src = qrDataUrl;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Visual Digital Ticket Card */}
      <div
        ref={ticketRef}
        className="relative rounded-3xl p-6 sm:p-8 border border-[#00e5ff]/40 shadow-neon-blue bg-gradient-to-b from-[#090f38] via-[#060b29] to-[#04071d] overflow-hidden transition-all"
      >
        {/* Top Decorative Header Strip */}
        <div className="absolute top-0 inset-x-0 h-2.5 bg-gradient-to-r from-[#00e5ff] via-[#2b4bff] to-[#7c3aed]" />

        {/* Header Branding */}
        <div className="flex items-start justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden p-[1.5px] bg-gradient-to-tr from-[#00e5ff] via-[#2b4bff] to-[#7c3aed] shadow-[0_0_15px_rgba(0,229,255,0.4)] shrink-0">
              <img
                src="/proxima-logo.png"
                alt="PROXIMA Logo"
                className="w-full h-full object-cover rounded-[10.5px]"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40">
                  <Gamepad2 className="w-3.5 h-3.5" />
                  Esports Arena Pass
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Verified Credential</span>
              </div>
              <h2 className="font-orbitron font-black text-xl sm:text-2xl text-white mt-1">
                PROXIMA <span className="text-[#00e5ff]">2026</span>
              </h2>
              <p className="text-[11px] text-slate-300 font-medium font-rajdhani">
                {EVENT_METADATA.school}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block font-mono">
              Player ID
            </span>
            <div className="font-mono font-bold text-lg sm:text-xl tracking-wider text-[#00e5ff]">
              {registrationId}
            </div>
          </div>
        </div>

        {/* Ticket Perforated Cutouts on Sides */}
        <div className="relative py-6 my-2">
          <div className="absolute -left-10 sm:-left-12 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#05071a] border-r border-white/15" />
          <div className="absolute -right-10 sm:-right-12 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#05071a] border-l border-white/15" />
          <div className="w-full border-t-2 border-dashed border-white/20" />
        </div>

        {/* Middle Details Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 uppercase font-bold text-[10px] block">Player Name</span>
            <span className="font-bold text-white text-sm sm:text-base">{fullName}</span>
          </div>

          <div>
            <span className="text-slate-400 uppercase font-bold text-[10px] block">Campus ID</span>
            <span className="font-mono font-bold text-cyan-300 text-sm sm:text-base">{campusId}</span>
          </div>

          <div>
            <span className="text-slate-400 uppercase font-bold text-[10px] block">Tournament Game</span>
            <span className="font-orbitron font-extrabold text-sm text-amber-300">{selection}</span>
          </div>

          <div>
            <span className="text-slate-400 uppercase font-bold text-[10px] block">Year of Study</span>
            <span className="font-bold text-slate-200">{year}</span>
          </div>

          <div>
            <span className="text-slate-400 uppercase font-bold text-[10px] block">Tournament Date</span>
            <span className="font-medium text-slate-200 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-cyan-400" /> {EVENT_METADATA.shortDate || 'Oct 26, 2026'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 uppercase font-bold text-[10px] block">Venue</span>
            <span className="font-medium text-slate-200 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-rose-400" /> Balmatta Arena
            </span>
          </div>

          <div className="col-span-2 pt-1 border-t border-white/5 flex items-center justify-between">
            <span className="text-slate-400 uppercase font-bold text-[10px]">Payment &amp; Status:</span>
            <span className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                paymentMode === 'CASH'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              }`}>
                {paymentMode === 'CASH' ? 'CASH' : 'UPI'}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                (status || 'PENDING') === 'CONFIRMED'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {(status || 'PENDING') === 'CONFIRMED' ? 'STATUS: CONFIRMED' : 'STATUS: PENDING'}
              </span>
            </span>
          </div>
        </div>

        {/* QR Code and Check-in Barcode Section */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-5 bg-black/30 p-4 rounded-2xl">
          <div className="text-center sm:text-left space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              <span>Official Player Verification</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight max-w-[260px]">
              Present this digital pass at the arena check-in desk along with your student ID card.
            </p>
          </div>

          {qrDataUrl && (
            <div className="p-2 bg-white rounded-xl shadow-md shrink-0">
              <img src={qrDataUrl} alt="Tournament Pass QR Code" className="w-24 h-24 object-contain" />
            </div>
          )}
        </div>

        {/* Bottom Security Notice */}
        <div className="mt-5 text-center text-[10px] text-slate-500 font-mono">
          Mobile Only Tournament • Non-Transferable • Yenepoya University
        </div>
      </div>

      {/* Action Buttons: 1-Click Download, Print, Return */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={handleDownloadTicket}
          className="w-full sm:flex-1 py-3 px-5 rounded-xl font-bold font-orbitron text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center gap-2 bg-[#00e5ff] text-[#070b2a] hover:bg-[#00e5ff]/90 shadow-neon-blue active:scale-95 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Download Pass (PNG)</span>
        </button>

        <button
          onClick={handlePrint}
          className="w-full sm:w-auto py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15 active:scale-95 transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Print</span>
        </button>

        <button
          onClick={onBackToHome}
          className="w-full sm:w-auto py-3 px-4 rounded-xl font-semibold text-xs text-slate-300 hover:text-white transition-colors"
        >
          Return to Overview
        </button>
      </div>
    </div>
  );
};
