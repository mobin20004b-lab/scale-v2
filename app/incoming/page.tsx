'use client';

import { useEffect, useState } from 'react';

type Product = { id: string; name: string; unit: string };
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
        const res = await fetch(`/api/scales?t=\${Date.now()}`, { cache: 'no-store' });
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

  const submit = async () => {
    const finalWeight = Number(weight || selectedScale?.currentWeight || 0);
    if (!productId || !warehouseId || finalWeight <= 0) return;

    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'STOCK_IN',
        quantity: finalWeight,
        weight: finalWeight,
        productId,
        warehouseId,
        scaleId: scaleId || null,
      }),
    });

    setMessage(res.ok ? 'ورود کالا ثبت شد و برای چاپ آماده است.' : 'خطا در ثبت ورود کالا.');
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-3xl font-bold">ورود کالا</h1>
      <p className="text-muted-foreground">وزن پایدار ترازو یا وزن دستی را ثبت کنید.</p>

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
    </div>
  );
}
