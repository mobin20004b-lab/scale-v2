'use client';

import { useEffect, useMemo, useState } from 'react';
import Barcode from 'react-barcode';
import QRCode from 'react-qr-code';
import { generateEntryBarcode, generateEntryQr, generateLotNumber } from '@/lib/stock-utils';

type Product = { id: string; name: string; unit: string; barcode: string };
type Warehouse = { id: string; name: string };
type Scale = { id: string; name: string; currentWeight: number; signal: string };

export default function IncomingGoods() {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [scales, setScales] = useState<Scale[]>([]);
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [scaleId, setScaleId] = useState('');
  const [weight, setWeight] = useState('');
  const [message, setMessage] = useState('');

  const [lastLabel, setLastLabel] = useState<{
    productName: string;
    weight: number;
    unit: string;
    lotNumber: string;
    entryBarcode: string;
    entryQr: string;
  } | null>(null);

  useEffect(() => {
    Promise.all([fetch('/api/products'), fetch('/api/warehouses'), fetch('/api/scales')]).then(async ([p, w, s]) => {
      if (p.ok) {
        const pv = await p.json();
        setProducts(pv);
        setProductId(pv[0]?.id ?? '');
      }
      if (w.ok) {
        const wv = await w.json();
        setWarehouses(wv);
        setWarehouseId(wv[0]?.id ?? '');
      }
      if (s.ok) {
        const sv = await s.json();
        setScales(sv);
        setScaleId(sv[0]?.id ?? '');
      }
    });
  }, []);

  useEffect(() => {
    if (!scaleId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/scales?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const sv = await res.json();
          setScales(sv);
        }
      } catch (e) {
        console.error('Failed to poll scales', e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [scaleId]);

  const selectedScale = scales.find((s) => s.id === scaleId);
  const selectedProduct = useMemo(() => products.find((p) => p.id === productId), [products, productId]);

  const submit = async () => {
    const finalWeight = Number(weight || selectedScale?.currentWeight || 0);
    if (!selectedProduct || !warehouseId || finalWeight <= 0) return;

    const lotNumber = generateLotNumber();
    const entryBarcode = generateEntryBarcode(selectedProduct.barcode, lotNumber);
    const entryQr = generateEntryQr(selectedProduct.id, lotNumber);

    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'STOCK_IN',
        quantity: finalWeight,
        weight: finalWeight,
        productId: selectedProduct.id,
        warehouseId,
        scaleId: scaleId || null,
        sourceTxId: lotNumber,
      }),
    });

    if (res.ok) {
      setMessage('ورود کالا ثبت شد و برچسب آماده چاپ است.');
      setLastLabel({
        productName: selectedProduct.name,
        weight: finalWeight,
        unit: selectedProduct.unit,
        lotNumber,
        entryBarcode,
        entryQr,
      });
    } else {
      setMessage('خطا در ثبت ورود کالا.');
    }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-3xl font-bold">ورود کالا</h1>
      <p className="text-muted-foreground">برای هر ورود، شماره لات مجزا و بارکد اختصاصی ساخته می‌شود.</p>

      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <select className="w-full border border-border rounded-xl p-2 bg-background" value={productId} onChange={(e) => setProductId(e.target.value)}>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select className="w-full border border-border rounded-xl p-2 bg-background" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>

        <select className="w-full border border-border rounded-xl p-2 bg-background" value={scaleId} onChange={(e) => setScaleId(e.target.value)}>
          <option value="">بدون ترازو (ورود دستی)</option>
          {scales.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <input
          className="w-full border border-border rounded-xl p-2 bg-background disabled:bg-secondary/50 disabled:text-muted-foreground"
          placeholder="وزن دستی (اختیاری)"
          value={scaleId ? (selectedScale?.currentWeight || '') : weight}
          onChange={(e) => setWeight(e.target.value)}
          readOnly={!!scaleId}
          disabled={!!scaleId}
        />

        {selectedScale && <p className="text-sm text-muted-foreground">وضعیت سیگنال: {selectedScale.signal}</p>}

        <button onClick={submit} className="w-full bg-primary text-primary-foreground rounded-xl py-2">تایید ورود</button>
        {message && <p className="text-sm">{message}</p>}
      </div>

      {lastLabel && (
        <div className="bg-card border border-border rounded-2xl p-4 print-label">
          <div className="flex items-center justify-between print:hidden mb-3">
            <h2 className="text-xl font-semibold">برچسب قابل چاپ</h2>
            <button onClick={() => window.print()} className="bg-secondary rounded-xl px-4 py-2">Print</button>
          </div>

          <div className="label-sheet bg-white text-black rounded-xl p-4 border border-dashed border-slate-300">
            <div className="flex justify-between gap-4 items-start">
              <div>
                <p className="text-xs tracking-wide uppercase text-slate-600">Incoming Label</p>
                <p className="text-lg font-bold">{lastLabel.productName}</p>
                <p className="text-sm">Weight: {lastLabel.weight.toFixed(2)} {lastLabel.unit}</p>
                <p className="text-sm">Lot: {lastLabel.lotNumber}</p>
                <p className="text-[11px] text-slate-600 mt-1">Barcode: {lastLabel.entryBarcode}</p>
              </div>
              <div className="bg-white p-1">
                <QRCode value={lastLabel.entryQr} size={78} />
              </div>
            </div>
            <div className="mt-3 flex justify-center bg-white">
              <Barcode value={lastLabel.entryBarcode} width={1.5} height={52} fontSize={12} margin={0} displayValue />
            </div>
          </div>

          <style jsx>{`
            @media print {
              body * { visibility: hidden; }
              .print-label, .print-label * { visibility: visible; }
              .print-label { position: fixed; inset: 0; margin: 0; border: none; background: white; }
              .label-sheet { width: 100mm; min-height: 50mm; border: 1px solid #d1d5db; border-radius: 0; margin: 0 auto; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
