import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  RefreshCw,
  Flashlight,
  FlashlightOff,
  SwitchCamera,
  Keyboard,
} from 'lucide-react';

export function CameraScanner({
  onScanSuccess,
  isPaused,
  onOpenManualEntry,
}) {
  const [cameraError, setCameraError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [cameraCount, setCameraCount] = useState(0);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);

  const qrReaderRef = useRef(null);
  const scannerInstanceRef = useRef(null);
  const lastScannedCodeRef = useRef({ code: '', timestamp: 0 });

  // Handle successful QR decode with 3-second repeat debounce
  const handleDecodedText = useCallback(
    (decodedText) => {
      if (isPaused) return;

      const now = Date.now();
      const last = lastScannedCodeRef.current;

      // Ignore repeat scans of the exact same code within 3 seconds
      if (last.code === decodedText && now - last.timestamp < 3000) {
        return;
      }

      lastScannedCodeRef.current = { code: decodedText, timestamp: now };
      onScanSuccess?.(decodedText);
    },
    [isPaused, onScanSuccess]
  );

  // Initialize camera scanner
  const startScanner = useCallback(async () => {
    setIsInitializing(true);
    setCameraError(null);

    const readerEl = document.getElementById('qr-scanner-box');
    if (!readerEl) return;

    try {
      // Stop existing instance if any
      if (scannerInstanceRef.current) {
        try {
          if (scannerInstanceRef.current.isScanning) {
            await scannerInstanceRef.current.stop();
          }
          await scannerInstanceRef.current.clear();
        } catch {}
      }

      // Enumerate video devices
      const devices = await Html5Qrcode.getCameras().catch(() => []);
      setCameraCount(devices.length);

      const html5QrCode = new Html5Qrcode('qr-scanner-box');
      scannerInstanceRef.current = html5QrCode;

      // Prefer rear environment camera
      const cameraConfig = devices.length > 0 ? { deviceId: { exact: devices[currentCameraIndex % devices.length].id } } : { facingMode: 'environment' };

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrEdge = Math.floor(minEdge * 0.72);
            return { width: qrEdge, height: qrEdge };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleDecodedText(decodedText);
        },
        () => {
          // Silent frame drop - normal when no QR in frame
        }
      );

      // Check for torch capability
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && capabilities.torch) {
          setHasTorch(true);
        }
      } catch {}

      setIsInitializing(false);
    } catch (err) {
      console.error('[Scanner] Initialization error:', err);
      setIsInitializing(false);
      const msg =
        err?.message ||
        'Camera permission was not granted or video input was unavailable.';
      setCameraError(msg);
    }
  }, [currentCameraIndex, handleDecodedText]);

  useEffect(() => {
    startScanner();

    return () => {
      if (scannerInstanceRef.current) {
        try {
          if (scannerInstanceRef.current.isScanning) {
            scannerInstanceRef.current.stop().catch(() => {});
          }
          scannerInstanceRef.current.clear().catch(() => {});
        } catch {}
      }
    };
  }, [startScanner]);

  // Toggle torch / flashlight
  const handleToggleTorch = async () => {
    if (!scannerInstanceRef.current || !hasTorch) return;
    try {
      const nextTorch = !isTorchOn;
      await scannerInstanceRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setIsTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch toggle error:', err);
    }
  };

  // Switch between front and rear cameras
  const handleSwitchCamera = () => {
    if (cameraCount <= 1) return;
    setCurrentCameraIndex((prev) => (prev + 1) % cameraCount);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Scanner Viewport Container */}
      <div className="w-full relative rounded-3xl overflow-hidden bg-black border border-cyan-500/30 shadow-[0_0_25px_rgba(0,229,255,0.15)] aspect-square max-h-[380px] sm:max-h-[420px] flex items-center justify-center">
        {/* html5-qrcode video element container */}
        <div id="qr-scanner-box" ref={qrReaderRef} className="w-full h-full object-cover" />

        {/* Viewfinder Target Reticle Overlay */}
        {!cameraError && !isInitializing && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
            <div className="w-[72%] aspect-square rounded-2xl border-2 border-dashed border-cyan-400/70 relative">
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-cyan-300 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-cyan-300 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-cyan-300 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-cyan-300 rounded-br-lg" />

              {/* Animated laser scanline */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent shadow-[0_0_12px_#00e5ff] absolute top-1/2 -translate-y-1/2 animate-pulse" />
            </div>
          </div>
        )}

        {/* Loading Spinner during camera bootstrap */}
        {isInitializing && (
          <div className="absolute inset-0 bg-[#05071a]/90 flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-xs text-slate-300 font-semibold">
              Initializing live camera feed...
            </p>
          </div>
        )}

        {/* Camera Permission / Access Error Fallback Screen */}
        {cameraError && (
          <div className="absolute inset-0 bg-[#070b24] p-6 flex flex-col items-center justify-center text-center space-y-3.5 z-20">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Camera className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Camera Access Required</h3>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Please allow camera permissions in your browser to scan ticket QR passes.
              </p>
            </div>

            <div className="flex flex-col gap-2 w-full max-w-xs pt-1">
              <button
                onClick={startScanner}
                className="py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-black bg-[#00e5ff] hover:bg-cyan-300 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Camera Permission</span>
              </button>

              <button
                onClick={onOpenManualEntry}
                className="py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-200 bg-white/10 hover:bg-white/15 border border-white/10 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Keyboard className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>Manual Lookup</span>
              </button>
            </div>
          </div>
        )}

        {/* Top Control Overlay: Torch & Camera Switch Buttons */}
        {!cameraError && !isInitializing && (
          <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10 pointer-events-auto">
            {/* Flashlight toggle */}
            {hasTorch ? (
              <button
                onClick={handleToggleTorch}
                className={`p-2.5 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${
                  isTorchOn
                    ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.6)]'
                    : 'bg-black/50 text-slate-200 border-white/20 hover:bg-black/70'
                }`}
                title={isTorchOn ? 'Turn Off Flashlight' : 'Turn On Flashlight'}
                aria-label="Toggle Flashlight"
              >
                {isTorchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
              </button>
            ) : (
              <div />
            )}

            {/* Camera Switcher (if multiple cameras) */}
            {cameraCount > 1 && (
              <button
                onClick={handleSwitchCamera}
                className="p-2.5 rounded-xl bg-black/50 hover:bg-black/70 text-slate-200 border border-white/20 backdrop-blur-md transition-all cursor-pointer"
                title="Switch Camera"
                aria-label="Switch Camera"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Helper caption */}
      <p className="text-[11px] text-slate-400 text-center mt-2 font-mono">
        Point phone camera directly at the digital or printed ticket QR code
      </p>
    </div>
  );
}
