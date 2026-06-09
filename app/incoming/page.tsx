'use client';

import { useEffect, useMemo, useState } from 'react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { AlertCircle, CheckCircle2, Loader2, Printer, RefreshCcw } from 'lucide-react';
import { openLabelPrintWindow } from '@/lib/label-print';
import { calculateNetWeight } from '@/lib/net-weight';

type Product = {
  id: string;
  name: string;
  unit: string;
  spoolsPerBag?: number;
  spoolWeight?: number;
  bagWeight?: number;
  brandName?: string | null;
};
type Warehouse = { id: string; name: string };
type Scale = { id: string; name: string; currentWeight: number; signal: string };
type LotReceipt = {
  id: string;
  lotNumber: string;
  productId: string;
  quantity: number;
  barcode: string;
  qrCode: string;
  createdAt: string;
};

export default function IncomingGoods() {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [scales, setScales] = useState<Scale[]>([]);

  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [scaleId, setScaleId] = useState('');
  const [weight, setWeight] = useState('');
  const [spoolsCount, setSpoolsCount] = useState('12');
  const [spoolWeight, setSpoolWeight] = useState('0');
  const [bagWeight, setBagWeight] = useState('0');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const [generatedLot, setGeneratedLot] = useState<LotReceipt | null>(null);
  const [companyName, setCompanyName] = useState('نساجی زنبق');

  const loadInitialData = async () => {
    setIsBootstrapping(true);
    setError('');
    try {
      const [p, w, s, settingsRes] = await Promise.all([fetch('/api/products'), fetch('/api/warehouses'), fetch('/api/scales'), fetch('/api/settings')]);
      if (!p.ok || !w.ok || !s.ok || !settingsRes.ok) {
        throw new Error('Failed to load initial data');
      }

      const [pv, wv, sv, settingsData] = await Promise.all([p.json(), w.json(), s.json(), settingsRes.json()]);
      setProducts(pv);
      setWarehouses(wv);
      setScales(sv);
      setCompanyName(String(settingsData?.settings?.companyName ?? 'نساجی زنبق'));

      setProductId((prev) => prev || pv[0]?.id || '');
      setWarehouseId((prev) => prev || wv[0]?.id || '');
      setScaleId((prev) => prev || sv[0]?.id || '');
    } catch (e) {
      setError('دریافت داده‌های اولیه ناموفق بود.');
    } finally {
      setIsBootstrapping(false);
    }
  };

  useEffect(() => {
    loadInitialData();
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

  const selectedScale = useMemo(() => scales.find((s) => s.id === scaleId), [scaleId, scales]);
  const selectedProduct = useMemo(() => products.find((p) => p.id === productId), [productId, products]);
  const isFullPackageProduct = selectedProduct?.unit === 'box' || selectedProduct?.unit === 'pcs';

  useEffect(() => {
    if (!selectedProduct) return;
    setSpoolsCount(String(selectedProduct.spoolsPerBag ?? 12));
    setSpoolWeight(String(selectedProduct.spoolWeight ?? 0));
    setBagWeight(String(selectedProduct.bagWeight ?? 0));
  }, [selectedProduct]);

  useEffect(() => {
    if (!scaleId && isFullPackageProduct && weight !== '1') {
      setWeight('1');
    }
  }, [scaleId, isFullPackageProduct, weight]);

  const breakdown = calculateNetWeight({
    grossWeight: Number(weight || selectedScale?.currentWeight || 0),
    spoolsCount: Number(spoolsCount || 0),
    spoolWeight: Number(spoolWeight || 0),
    bagWeight: Number(bagWeight || 0),
  });
  const finalWeight = breakdown.netWeight;
  const canSubmit = Boolean(productId && warehouseId && Number.isFinite(finalWeight) && finalWeight > 0 && !isSubmitting);

  const submit = async () => {
    if (!canSubmit) {
      setError('لطفاً مقادیر را کامل کنید.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
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

      if (!res.ok) {
        throw new Error('ثبت ورود کالا ناموفق بود.');
      }

      const data = await res.json();
      setGeneratedLot(data.lot);
      setMessage('ورود کالا ثبت شد و برای چاپ آماده است.');
      if (!scaleId) {
        setWeight(isFullPackageProduct ? '1' : '');
      }
    } catch (e) {
      setError('خطا در ثبت ورود کالا.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (!generatedLot) return;
    const lotProduct = products.find((p) => p.id === generatedLot.productId);

    openLabelPrintWindow({
      companyName,
      productName: lotProduct?.name || '-',
      quantity: generatedLot.quantity,
      grossWeight: Number(weight || selectedScale?.currentWeight || generatedLot.quantity),
      netWeight: generatedLot.quantity,
      unit: lotProduct?.unit || 'kg',
      lotNumber: generatedLot.lotNumber,
      createdAt: generatedLot.createdAt,
      barcode: generatedLot.barcode,
      qrCode: generatedLot.qrCode,
    });
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto print:max-w-none print:m-0 print:p-0">
      <div className="print:hidden">
        <h1 className="text-3xl font-bold">ورود کالا</h1>
        <p className="text-muted-foreground">ثبت ورود با ترازو یا دستی + تولید رسید آماده برای پرینتر لیبل.</p>
      </div>

      {(error || message) && (
        <div className={`rounded-xl px-4 py-3 flex items-center gap-2 ${error ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600'}`}>
          {error ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          {error || message}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-4 space-y-3 print:hidden">
        <div className="flex justify-between items-center gap-2">
          <h2 className="font-semibold">فرم ورود</h2>
          <button
            type="button"
            onClick={loadInitialData}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border hover:bg-secondary"
          >
            <RefreshCcw className="w-4 h-4" />
            بروزرسانی اطلاعات
          </button>
        </div>

        <select className="w-full border border-border rounded-xl p-2 bg-background" value={productId} onChange={(e) => setProductId(e.target.value)}>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select className="w-full border border-border rounded-xl p-2 bg-background" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>

        <select className="w-full border border-border rounded-xl p-2 bg-background" value={scaleId} onChange={(e) => setScaleId(e.target.value)}>
          <option value="">بدون ترازو (ورود دستی)</option>
          {scales.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          step="0.001"
          min="0"
          className="w-full border border-border rounded-xl p-2 bg-background disabled:bg-secondary/50 disabled:text-muted-foreground"
          placeholder={isFullPackageProduct ? 'وزن برای کالای بسته‌ای ثابت است' : 'وزن ناخالص (اختیاری)'}
          value={scaleId ? selectedScale?.currentWeight || '' : weight}
          onChange={(e) => setWeight(e.target.value)}
          readOnly={!!scaleId || isFullPackageProduct}
          disabled={!!scaleId || isFullPackageProduct}
        />

        {isFullPackageProduct && !scaleId && <p className="text-xs text-muted-foreground">برای کالاهای بسته‌ای/عددی مقدار ورودی ثابت روی 1 قرار می‌گیرد.</p>}

        <div className="grid md:grid-cols-3 gap-3 rounded-xl border border-border p-3 bg-secondary/20">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">تعداد دوک</label>
            <input type="number" min="0" className="w-full border border-border rounded-lg p-2 bg-background" value={spoolsCount} onChange={(e) => setSpoolsCount(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">وزن هر دوک</label>
            <input type="number" step="0.001" min="0" className="w-full border border-border rounded-lg p-2 bg-background" value={spoolWeight} onChange={(e) => setSpoolWeight(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">وزن کیسه</label>
            <input type="number" step="0.001" min="0" className="w-full border border-border rounded-lg p-2 bg-background" value={bagWeight} onChange={(e) => setBagWeight(e.target.value)} />
          </div>
          <div className="md:col-span-3 text-sm space-y-1">
            <p>وزن ناخالص: <span className="font-mono">{breakdown.grossWeight}</span></p>
            <p>کسر وزن دوک‌ها: <span className="font-mono">{breakdown.spoolsCount} × {breakdown.spoolWeight} = {breakdown.spoolsTotalWeight}</span></p>
            <p>کسر وزن کیسه: <span className="font-mono">{breakdown.bagWeight}</span></p>
            <p className="font-semibold text-primary">وزن خالص = {breakdown.grossWeight} - ({breakdown.spoolsCount} × {breakdown.spoolWeight}) - {breakdown.bagWeight} = {breakdown.netWeight}</p>
          </div>
        </div>

        {selectedScale && (
          <div className="text-sm text-muted-foreground">
            وضعیت سیگنال: <span className="font-medium">{selectedScale.signal}</span> | وزن لحظه‌ای:{' '}
            <span className="font-mono" dir="ltr">
              {selectedScale.currentWeight}
            </span>
          </div>
        )}

        <button
          onClick={submit}
          disabled={!canSubmit || isBootstrapping}
          className="w-full bg-primary text-primary-foreground rounded-xl py-2 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          تایید ورود
        </button>
      </div>

      {generatedLot && (
        <div className="mt-8 p-6 bg-card border border-border rounded-2xl print:mt-0 print:border-none print:p-0 print:shadow-none">
          <div className="flex justify-between items-center mb-6 print:hidden">
            <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
              ورود با موفقیت ثبت شد
            </h2>
            <button
              onClick={handlePrint}
              className="bg-primary text-primary-foreground font-medium rounded-xl px-4 py-2 hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Printer className="w-5 h-5" />
              چاپ لیبل
            </button>
          </div>

          <div className="flex flex-col items-center justify-center space-y-4 bg-white p-6 rounded-2xl border border-border sm:w-[10cm] sm:h-[15cm] mx-auto text-black print:w-[10cm] print:h-[15cm] print:border-none print:bg-white print:m-0 print:p-0">
            <h1 className="text-4xl font-extrabold text-center">{companyName}</h1>
            <h1 className="text-2xl font-bold text-center">{selectedProduct?.brandName ? `${selectedProduct.brandName} - ${products.find((p) => p.id === generatedLot.productId)?.name}` : products.find((p) => p.id === generatedLot.productId)?.name}</h1>
            <p className="text-2xl font-semibold">وزن ناخالص: {Number(weight || selectedScale?.currentWeight || generatedLot.quantity)} {selectedProduct?.unit || 'kg'}</p>
            <p className="text-2xl font-semibold">وزن خالص: {generatedLot.quantity} {selectedProduct?.unit || 'kg'}</p>
            <p className="text-base text-gray-700" dir="ltr">
              {new Date(generatedLot.createdAt).toLocaleString('fa-IR')}
            </p>

            <div className="py-2 scale-125">
              <Barcode value={generatedLot.barcode} width={2.5} height={80} fontSize={18} displayValue />
            </div>

            <div className="pt-2">
              <QRCodeSVG value={generatedLot.qrCode} size={160} level="M" includeMargin />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
