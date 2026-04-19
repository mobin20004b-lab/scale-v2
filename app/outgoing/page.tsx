'use client';

import { useState, useEffect } from 'react';
import { QrCode, Search, XCircle } from 'lucide-react';

type BarcodeProduct = {
  id: string;
  name: string;
  barcode: string;
  lotId?: string;
  lots?: { id: string; lotNumber: string; quantity: number }[];
};

type Warehouse = { id: string; name: string };

export default function OutgoingGoods() {
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [weight, setWeight] = useState('');
  const [lotId, setLotId] = useState('');
  const [message, setMessage] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const numericWeight = Number(weight);
  const isWeightValid = Number.isFinite(numericWeight) && numericWeight > 0;
  const canSubmit = Boolean(product && warehouseId && lotId && isWeightValid);

  useEffect(() => {
    fetch('/api/warehouses').then(async (w) => {
      if (w.ok) {
        const wv = await w.json();
        setWarehouses(wv);
        if (wv.length > 0) setWarehouseId(wv[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!scannerOpen) return;

    let scanner: { render: (onSuccess: (decodedText: string) => void, onError?: (errorMessage: string, error?: unknown) => void) => void; clear: () => Promise<void> } | null = null;
    let mounted = true;

    const setupScanner = async () => {
      try {
        const { Html5QrcodeScanner } = await import('html5-qrcode');
        if (!mounted) return;

        scanner = new Html5QrcodeScanner(
          'outgoing-qr-reader',
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            rememberLastUsedCamera: true,
          },
          false,
        );

        scanner.render(
          (decodedText) => {
            setBarcode(decodedText);
            setScannerOpen(false);
            setMessage('کد با موفقیت اسکن شد. برای ادامه جستجو را بزنید.');
          },
          () => undefined,
        );
      } catch {
        setMessage('دسترسی به دوربین یا اسکنر ممکن نیست.');
      }
    };

    setupScanner();

    return () => {
      mounted = false;
      if (scanner) {
        scanner.clear().catch(() => undefined);
      }
    };
  }, [scannerOpen]);

  const resolveBarcode = async () => {
    if (!barcode.trim()) {
      setMessage('لطفاً بارکد یا QR را وارد/اسکن کنید.');
      return;
    }

    const res = await fetch(`/api/barcode/${encodeURIComponent(barcode.trim())}`);
    if (!res.ok) {
      await fetch('/api/barcode/unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode }),
      });
      setProduct(null);
      setMessage('بارکد/QR ناشناخته ثبت شد.');
      return;
    }
    const data = await res.json();
    setProduct(data);
    let resolvedLotId = '';
    if (data.lotId) {
      resolvedLotId = data.lotId;
    } else if (data.lots && data.lots.length > 0) {
      resolvedLotId = data.lots[0].id;
    }
    setLotId(resolvedLotId);
    const selectedLot = data.lots?.find((l: { id: string; quantity: number }) => l.id === resolvedLotId);
    setWeight(selectedLot ? String(selectedLot.quantity) : '');
    setMessage('');
  };

  const submit = async () => {
    if (!product || !warehouseId || Number(weight) <= 0 || !lotId) return;
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'STOCK_OUT',
        quantity: Number(weight),
        weight: Number(weight),
        productId: product.id,
        warehouseId,
        lotId,
      }),
    });

    setMessage(res.ok ? 'خروج کالا ثبت شد.' : 'خطا در ثبت خروج.');
  };

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-3xl font-bold">خروج کالا</h1>

      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
          <input
            className="w-full border border-border rounded-xl p-2 bg-background"
            value={barcode}
            onChange={(e) => {
              setBarcode(e.target.value);
              setWeight('');
              setLotId('');
              setProduct(null);
            }}
            placeholder="بارکد یا QR را اسکن/وارد کنید"
            dir="ltr"
          />
          <button
            onClick={resolveBarcode}
            className="bg-secondary rounded-xl px-4 py-2 flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            جستجو
          </button>
          <button
            onClick={() => setScannerOpen((prev) => !prev)}
            className="bg-primary text-primary-foreground rounded-xl px-4 py-2 flex items-center justify-center gap-2"
          >
            {scannerOpen ? <XCircle className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
            {scannerOpen ? 'بستن اسکنر' : 'اسکن QR'}
          </button>
        </div>

        {scannerOpen && (
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs text-muted-foreground mb-2">QR یا بارکد لات را مقابل دوربین بگیرید.</p>
            <div id="outgoing-qr-reader" className="min-h-[280px]" dir="ltr" />
          </div>
        )}
      </div>

      {product && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="font-medium text-lg text-primary">کالا: {product.name}</p>

          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground mr-1">لات تخصیصی (بچ)</label>
            <select
              className="w-full border border-border rounded-xl p-2 bg-background font-mono text-sm"
              value={lotId}
              onChange={(e) => {
                const nextLotId = e.target.value;
                setLotId(nextLotId);
                const selectedLot = product.lots?.find((l) => l.id === nextLotId);
                setWeight(selectedLot ? String(selectedLot.quantity) : '');
              }}
            >
              {product.lotId ? (
                <option value={product.lotId}>{product.lots?.find(l => l.id === product.lotId)?.lotNumber || 'لات اسکن شده'} (مستقیم)</option>
              ) : (
                product.lots && product.lots.length > 0 ? (
                  product.lots.map(l => (
                    <option key={l.id} value={l.id}>{l.lotNumber} - موجودی: {l.quantity}</option>
                  ))
                ) : (
                  <option value="">بدون لات فعال</option>
                )
              )}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground mr-1">انبار خروجی</label>
            <select className="w-full border border-border rounded-xl p-2 bg-background" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground mr-1">وزن خروجی</label>
            <input className="w-full border border-border rounded-xl p-2 bg-background" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="وزن به کیلوگرم" dir="ltr" />
            <p className="text-xs text-muted-foreground">Prefilled from lot stock; editable before submit.</p>
          </div>

          <button onClick={submit} disabled={!canSubmit} className="w-full bg-primary text-primary-foreground rounded-xl py-3 mt-2 disabled:opacity-50 transition-opacity">تایید خروج</button>
        </div>
      )}
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
