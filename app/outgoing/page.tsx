'use client';

import { useState } from 'react';

type BarcodeProduct = { id: string; name: string; barcode: string };

export default function OutgoingGoods() {
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [warehouseId, setWarehouseId] = useState('');
  const [weight, setWeight] = useState('');
  const [message, setMessage] = useState('');

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
    setProduct(await res.json());
    setMessage('');
  };

  const submit = async () => {
    if (!product || !warehouseId || Number(weight) <= 0) return;
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'STOCK_OUT',
        quantity: Number(weight),
        weight: Number(weight),
        productId: product.id,
        warehouseId,
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
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <p>کالا: {product.name}</p>
          <input className="w-full border border-border rounded-xl p-2 bg-background" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} placeholder="شناسه انبار" dir="ltr" />
          <input className="w-full border border-border rounded-xl p-2 bg-background" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="وزن خروجی" dir="ltr" />
          <button onClick={submit} className="w-full bg-primary text-primary-foreground rounded-xl py-2">تایید خروج</button>
        </div>
      )}
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
