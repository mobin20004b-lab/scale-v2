'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Loader2, QrCode, ScanLine, ShieldCheck, XCircle } from 'lucide-react';

type QrCameraScannerProps = {
  isOpen: boolean;
  isBusy?: boolean;
  onToggle: () => void;
  onDetected: (decodedText: string) => void;
  onSetupError: (message: string) => void;
};

type ScannerStatus = 'idle' | 'loading' | 'ready' | 'error';

type CameraDevice = {
  id: string;
  label: string;
};

const SCANNER_ELEMENT_ID = 'outgoing-qr-reader';

export function QrCameraScanner({
  isOpen,
  isBusy = false,
  onToggle,
  onDetected,
  onSetupError,
}: QrCameraScannerProps) {
  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [lastDetected, setLastDetected] = useState('');
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');

  const scannerRef = useRef<{ start: Function; stop: Function; clear: Function } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStatus('idle');
      const activeScanner = scannerRef.current;
      scannerRef.current = null;
      if (activeScanner) {
        void Promise.resolve(activeScanner.stop())
          .catch(() => undefined)
          .finally(() => {
            void Promise.resolve(activeScanner.clear()).catch(() => undefined);
          });
      }
      return;
    }

    let mounted = true;

    const cleanupScanner = async () => {
      const activeScanner = scannerRef.current;
      if (!activeScanner) return;

      scannerRef.current = null;
      try {
        await Promise.resolve(activeScanner.stop());
      } catch {
        // ignore stop errors during camera switches/unmount
      }

      try {
        await Promise.resolve(activeScanner.clear());
      } catch {
        // ignore clear errors during camera switches/unmount
      }
    };

    const setupScanner = async () => {
      try {
        setStatus('loading');
        await cleanupScanner();
        if (!mounted) return;

        const { Html5Qrcode } = await import('html5-qrcode');
        if (!mounted) return;

        const devices = await Html5Qrcode.getCameras();
        if (!mounted) return;

        const mapped = devices.map((device: { id: string; label: string }, index: number) => ({
          id: device.id,
          label: device.label || `دوربین ${index + 1}`,
        }));

        setCameras(mapped);

        const preferredCamera =
          mapped.find((device) => /back|rear|environment|خلفی|پشت/i.test(device.label))?.id || mapped[0]?.id || '';

        const cameraIdToUse = selectedCameraId || preferredCamera;
        if (!cameraIdToUse) {
          setStatus('error');
          onSetupError('هیچ دوربینی روی دستگاه شما پیدا نشد.');
          return;
        }

        if (!selectedCameraId) {
          setSelectedCameraId(cameraIdToUse);
        }

        const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
        scannerRef.current = scanner;

        await scanner.start(
          cameraIdToUse,
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText: string) => {
            setLastDetected(decodedText);
            onDetected(decodedText);
            setStatus('ready');
          },
          () => undefined,
        );

        if (!mounted || scannerRef.current !== scanner) {
          await Promise.resolve(scanner.stop()).catch(() => undefined);
          await Promise.resolve(scanner.clear()).catch(() => undefined);
          return;
        }

        setStatus('ready');
      } catch {
        if (!mounted) return;
        setStatus('error');
        onSetupError('دسترسی به دوربین یا اسکنر ممکن نیست. لطفاً اجازه Camera را بررسی کنید.');
      }
    };

    void setupScanner();

    return () => {
      mounted = false;
      void cleanupScanner();
    };
  }, [isOpen, onDetected, onSetupError, selectedCameraId]);

  const statusText = useMemo(() => {
    if (isBusy) return 'در حال پردازش اطلاعات اسکن...';
    if (status === 'loading') return 'در حال آماده‌سازی دوربین...';
    if (status === 'ready') return 'دوربین آماده است. QR یا بارکد را داخل کادر بگیرید.';
    if (status === 'error') return 'مشکلی در راه‌اندازی اسکنر رخ داد.';
    return 'برای اسکن سریع‌تر، دوربین را فعال کنید.';
  }, [isBusy, status]);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onToggle}
        className="bg-primary text-primary-foreground rounded-xl px-4 py-2 flex items-center justify-center gap-2 w-full sm:w-auto shadow-sm hover:opacity-95 transition-opacity"
      >
        {isOpen ? <XCircle className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
        {isOpen ? 'بستن اسکنر' : 'اسکن با دوربین'}
      </button>

      {isOpen ? (
        <div className="rounded-2xl border border-border bg-gradient-to-b from-background to-muted/20 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">اسکن هوشمند QR / Barcode</p>
              <p className="text-xs text-muted-foreground">{statusText}</p>
            </div>
          </div>

          {cameras.length > 1 ? (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">انتخاب دوربین</label>
              <select
                value={selectedCameraId}
                onChange={(e) => setSelectedCameraId(e.target.value)}
                className="w-full border border-border rounded-xl p-2 bg-background text-sm"
              >
                {cameras.map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">برای بارکدهای ریز، معمولاً دوربین پشت نتیجه بهتری می‌دهد.</p>
            </div>
          ) : null}

          {lastDetected ? (
            <div className="rounded-xl border border-emerald-300/60 bg-emerald-500/10 p-2 text-xs">
              <p className="text-emerald-700 font-medium">آخرین کد اسکن‌شده</p>
              <p className="text-emerald-800/90 font-mono break-all mt-1" dir="ltr">{lastDetected}</p>
            </div>
          ) : null}

          <div className="rounded-xl border border-dashed border-primary/30 bg-background p-2">
            <div className="flex items-center justify-between px-1 pb-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><ScanLine className="w-3.5 h-3.5" /> ناحیه اسکن</span>
              <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> فقط روی دستگاه شما</span>
            </div>
            <div id={SCANNER_ELEMENT_ID} className="min-h-[280px] overflow-hidden rounded-lg" dir="ltr" />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onToggle}
              className="text-xs rounded-lg border border-border px-3 py-1.5 hover:bg-muted transition-colors"
            >
              توقف اسکن
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
