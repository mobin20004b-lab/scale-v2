'use client';

import { useState, useEffect } from 'react';

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

  useEffect(() => {
    fetch('/api/warehouses').then(async (w) => {
      if (w.ok) {
        const wv = await w.json();
        setWarehouses(wv);
        if (wv.length > 0) setWarehouseId(wv[0].id);
      }
    });
  }, []);

  const resolveBarcode = async () => {
    const res = await fetch(`/api/barcode/${barcode}`);
    if (!res.ok) {
      await fetch('/api/barcode/unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode }),
      });
      setProduct(null);
      setMessage('بارکد ناشناخته ثبت شد.');
      return;
    }
    const data = await res.json();
    setProduct(data);
    if (data.lotId) {
      setLotId(data.lotId);
    } else if (data.lots && data.lots.length > 0) {
      setLotId(data.lots[0].id);
    } else {
      setLotId('');
    }
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
      <input className="w-full border border-border rounded-xl p-2 bg-background" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="بارکد را اسکن/وارد کنید" dir="ltr" />
      <button onClick={resolveBarcode} className="bg-secondary rounded-xl px-4 py-2">جستجو</button>

      {product && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="font-medium text-lg text-primary">کالا: {product.name}</p>

          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground mr-1">لات تخصیصی (بچ)</label>
            <select className="w-full border border-border rounded-xl p-2 bg-background font-mono text-sm" value={lotId} onChange={(e) => setLotId(e.target.value)}>
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
          </div>

          <button onClick={submit} disabled={!lotId} className="w-full bg-primary text-primary-foreground rounded-xl py-3 mt-2 disabled:opacity-50 transition-opacity">تایید خروج</button>
        </div>
      )}
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
