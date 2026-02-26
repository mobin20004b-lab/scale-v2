'use client';

import { useEffect, useState } from 'react';

type BarcodeProduct = { id: string; name: string; barcode: string; unit: string };
type Warehouse = { id: string; name: string };
type Lot = {
  lotNumber: string;
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  availableQuantity: number;
  lastUpdatedAt: string;
};

export default function OutgoingGoods() {
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [weight, setWeight] = useState('');
  const [message, setMessage] = useState('');
  const [lots, setLots] = useState<Lot[]>([]);
  const [selectedLot, setSelectedLot] = useState('');

  useEffect(() => {
    fetch('/api/warehouses').then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setWarehouses(data);
        setWarehouseId(data[0]?.id ?? '');
      }
    });
  }, []);

  const loadLots = async (resolvedProduct: BarcodeProduct, selectedWarehouseId: string) => {
    const qp = new URLSearchParams({ productId: resolvedProduct.id });
    if (selectedWarehouseId) qp.set('warehouseId', selectedWarehouseId);
    const res = await fetch(`/api/lots?${qp.toString()}`);
    if (res.ok) {
      const data: Lot[] = await res.json();
      setLots(data);
      setSelectedLot(data[0]?.lotNumber ?? '');
    } else {
      setLots([]);
      setSelectedLot('');
    }
  };

  const resolveBarcode = async () => {
    const res = await fetch(`/api/barcode/${barcode}`);
    if (!res.ok) {
      await fetch('/api/barcode/unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode }),
      });
      setProduct(null);
      setLots([]);
      setSelectedLot('');
      setMessage('بارکد ناشناخته ثبت شد.');
      return;
    }

    const resolved = await res.json();
    setProduct(resolved);
    setMessage('');
    await loadLots(resolved, warehouseId);
  };

  const submit = async () => {
    if (!product || !warehouseId || Number(weight) <= 0 || !selectedLot) return;
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'STOCK_OUT',
        quantity: Number(weight),
        weight: Number(weight),
        productId: product.id,
        warehouseId,
        sourceTxId: selectedLot,
      }),
    });

    if (res.ok) {
      setMessage('خروج کالا ثبت شد.');
      await loadLots(product, warehouseId);
    } else {
      setMessage('خطا در ثبت خروج.');
    }
  };

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-3xl font-bold">خروج کالا</h1>
      <input className="w-full border border-border rounded-xl p-2 bg-background" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="بارکد را اسکن/وارد کنید" dir="ltr" />
      <button onClick={resolveBarcode} className="bg-secondary rounded-xl px-4 py-2">جستجو</button>

      {product && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <p>کالا: {product.name}</p>

          <select className="w-full border border-border rounded-xl p-2 bg-background" value={warehouseId} onChange={(e) => {
            const id = e.target.value;
            setWarehouseId(id);
            if (product) loadLots(product, id);
          }}>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">لات‌های در دسترس برای ارسال:</p>
            <select className="w-full border border-border rounded-xl p-2 bg-background" value={selectedLot} onChange={(e) => setSelectedLot(e.target.value)}>
              {lots.length === 0 && <option value="">لات در دسترس نیست</option>}
              {lots.map((lot) => (
                <option key={lot.lotNumber} value={lot.lotNumber}>
                  {lot.lotNumber} - موجودی: {lot.availableQuantity.toFixed(2)} {product.unit}
                </option>
              ))}
            </select>
          </div>

          <input className="w-full border border-border rounded-xl p-2 bg-background" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="وزن خروجی" dir="ltr" />
          <button onClick={submit} className="w-full bg-primary text-primary-foreground rounded-xl py-2">تایید خروج</button>
        </div>
      )}
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
