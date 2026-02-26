'use client';

import { useEffect, useState } from 'react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, CheckCircle2 } from 'lucide-react';

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
  const [generatedLot, setGeneratedLot] = useState<any>(null);

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

    if (res.ok) {
      const data = await res.json();
      setGeneratedLot(data.lot);
      setMessage('ورود کالا ثبت شد و برای چاپ آماده است.');
    } else {
      setMessage('خطا در ثبت ورود کالا.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 max-w-2xl print:max-w-none print:m-0 print:p-0">
      <div className="print:hidden">
        <h1 className="text-3xl font-bold">ورود کالا</h1>
        <p className="text-muted-foreground">وزن پایدار ترازو یا وزن دستی را ثبت کنید.</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 space-y-3 print:hidden">
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

      {generatedLot && (
        <div className="mt-8 p-6 bg-card border border-border rounded-2xl print:mt-0 print:border-none print:p-0 print:shadow-none">
          <div className="flex justify-between items-center mb-6 print:hidden">
            <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
              ورود با موفقیت ثبت شد
            </h2>
            <button onClick={handlePrint} className="bg-primary text-primary-foreground font-medium rounded-xl px-4 py-2 hover:bg-primary/90 transition-colors flex items-center gap-2">
              <Printer className="w-5 h-5" />
              چاپ برچسب
            </button>
          </div>

          {/* Label Preview / Print Content */}
          <div className="flex flex-col items-center justify-center space-y-4 bg-white p-6 rounded-2xl border border-border sm:w-[10cm] sm:h-[15cm] mx-auto text-black print:w-[10cm] print:h-[15cm] print:border-none print:bg-white print:m-0 print:p-0">
            <h1 className="text-2xl font-bold text-center">
              {products.find(p => p.id === generatedLot.productId)?.name}
            </h1>
            <p className="text-xl font-medium">وزن: {generatedLot.quantity} kg</p>
            <p className="text-lg text-gray-700">شماره لات: <span className="font-mono">{generatedLot.lotNumber}</span></p>

            <div className="py-2 scale-110">
              <Barcode value={generatedLot.barcode} width={2} height={60} fontSize={14} displayValue={true} />
            </div>

            <div className="pt-2">
              <QRCodeSVG value={generatedLot.qrCode} size={120} level="M" includeMargin={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
