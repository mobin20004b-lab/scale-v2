'use client';

import { useEffect, useMemo, useState } from 'react';
import { Camera, Loader2, QrCode, ScanLine, ShieldCheck, XCircle } from 'lucide-react';

type QrCameraScannerProps = {
  isOpen: boolean;
  isBusy?: boolean;
  onToggle: () => void;
  onDetected: (decodedText: string) => void;
  onSetupError: (message: string) => void;
};

type ScannerStatus = 'idle' | 'loading' | 'ready' | 'error';

const SCANNER_ELEMENT_ID = 'outgoing-qr-reader';

export function QrCameraScanner({
  isOpen,
  isBusy = false,
  onToggle,
  onDetected,
  onSetupError,
}: QrCameraScannerProps) {
  const [status, setStatus] = useState<ScannerStatus>('idle');

  useEffect(() => {
    if (!isOpen) {
      setStatus('idle');
      return;
    }

    let scanner: {
      render: (
        onSuccess: (decodedText: string) => void,
        onError?: (errorMessage: string, error?: unknown) => void,
      ) => void;
      clear: () => Promise<void>;
    } | null = null;
    let mounted = true;

    const setupScanner = async () => {
      try {
        setStatus('loading');
        const { Html5QrcodeScanner } = await import('html5-qrcode');
        if (!mounted) return;

        scanner = new Html5QrcodeScanner(
          SCANNER_ELEMENT_ID,
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            rememberLastUsedCamera: true,
            supportedScanTypes: [0, 1],
          },
          false,
        );

        scanner.render(
          (decodedText) => {
            onDetected(decodedText);
            setStatus('ready');
          },
          () => undefined,
        );

        setStatus('ready');
      } catch {
        setStatus('error');
        onSetupError('دسترسی به دوربین یا اسکنر ممکن نیست. لطفاً اجازه Camera را بررسی کنید.');
      }
    };

    void setupScanner();

    return () => {
      mounted = false;
      if (scanner) {
        scanner.clear().catch(() => undefined);
      }
    };
  }, [isOpen, onDetected, onSetupError]);

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
        className="bg-primary text-primary-foreground rounded-xl px-4 py-2 flex items-center justify-center gap-2 w-full sm:w-auto"
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

          <div className="rounded-xl border border-dashed border-primary/30 bg-background p-2">
            <div className="flex items-center justify-between px-1 pb-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><ScanLine className="w-3.5 h-3.5" /> ناحیه اسکن</span>
              <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> فقط روی دستگاه شما</span>
            </div>
            <div id={SCANNER_ELEMENT_ID} className="min-h-[280px] overflow-hidden rounded-lg" dir="ltr" />
          </div>

          <ul className="text-xs text-muted-foreground space-y-1 list-disc pr-4">
            <li>نور محیط را کمی بیشتر کنید تا اسکن سریع‌تر انجام شود.</li>
            <li>کد را مستقیم و بدون لرزش مقابل دوربین نگه دارید.</li>
            <li>در صورت کندی، فاصله دوربین تا کد را کمی تغییر دهید.</li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
