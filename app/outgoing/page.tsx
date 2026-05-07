'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, Search } from 'lucide-react';
import { QrCameraScanner } from '@/components/qr-camera-scanner';

type LotSummary = {
  id: string;
  lotNumber: string;
  quantity: number;
};

type BarcodeProduct = {
  id: string;
  name: string;
  barcode: string;
  unit?: string;
  lotId?: string;
  lots?: LotSummary[];
};

type Warehouse = { id: string; name: string };
type Customer = { id: string; name: string; phone?: string | null; email?: string | null };

export default function OutgoingGoods() {
  const router = useRouter();

  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<BarcodeProduct[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [weight, setWeight] = useState('');
  const [lotId, setLotId] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isResolvingBarcode, setIsResolvingBarcode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessState, setShowSuccessState] = useState(false);
  const barcodeInFlightRef = useRef<Set<string>>(new Set());

  const numericWeight = Number(weight);
  const isWeightValid = Number.isFinite(numericWeight) && numericWeight > 0;

  const selectedLot = useMemo(
    () => product?.lots?.find((l) => l.id === lotId) ?? null,
    [product?.lots, lotId],
  );
  const isFullPackageProduct = product?.unit === 'box' || product?.unit === 'pcs';

  const canSubmit = Boolean(product && warehouseId && customerId && lotId && isWeightValid && !isSubmitting);

  useEffect(() => {
    Promise.all([fetch('/api/warehouses'), fetch('/api/products'), fetch('/api/customers')]).then(async ([w, p, c]) => {
      if (w.ok) {
        const wv = await w.json();
        setWarehouses(wv);
        if (wv.length > 0) setWarehouseId(wv[0].id);
      }

      if (p.ok) {
        const pv = (await p.json()) as BarcodeProduct[];
        setProducts(pv.map((item) => ({
          ...item,
          lots: item.lots?.filter((lot) => lot.quantity > 0) ?? [],
        })));
      }

      if (c.ok) {
        const cv = (await c.json()) as Customer[];
        setCustomers(cv);
        if (cv.length > 0) setCustomerId(cv[0].id);
      }
    });
  }, []);

  const resetOutgoingForm = useCallback(() => {
    setProduct(null);
    setLotId('');
    setWeight('');
    setShowSuccessState(false);
  }, []);

  const resolveBarcode = useCallback(async (rawBarcode?: string) => {
    const nextBarcode = (rawBarcode ?? barcode).trim();

    if (!nextBarcode) {
      setMessageType('error');
      setMessage('لطفاً بارکد یا QR را وارد/اسکن کنید.');
      return;
    }

    if (barcodeInFlightRef.current.has(nextBarcode)) {
      return;
    }

    barcodeInFlightRef.current.add(nextBarcode);
    setIsResolvingBarcode(true);
    setShowSuccessState(false);

    try {
      const res = await fetch(`/api/barcode/${encodeURIComponent(nextBarcode)}`);
      if (!res.ok) {
        await fetch('/api/barcode/unknown', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ barcode: nextBarcode }),
        });
        resetOutgoingForm();
        setMessageType('error');
        setMessage('بارکد/QR ناشناخته ثبت شد.');
        return;
      }

      const data = (await res.json()) as BarcodeProduct;
      setProduct(data);

      const resolvedLotId = data.lotId ?? data.lots?.[0]?.id ?? '';
      setLotId(resolvedLotId);

      const lot = data.lots?.find((l) => l.id === resolvedLotId);
      setWeight(lot ? String(lot.quantity) : '');

      setMessageType('success');
      setMessage('اطلاعات خروج (محصول، لات و وزن) تکمیل شد.');
    } finally {
      barcodeInFlightRef.current.delete(nextBarcode);
      setIsResolvingBarcode(false);
    }
  }, [barcode, resetOutgoingForm]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initialBarcode = new URLSearchParams(window.location.search).get('barcode');
    if (initialBarcode) {
      setBarcode(initialBarcode);
      void resolveBarcode(initialBarcode);
    }
  }, [resolveBarcode]);

  const handleScannerDetected = useCallback((decodedText: string) => {
    setBarcode(decodedText);
    setScannerOpen(false);
    setMessageType('info');
    setMessage('کد با موفقیت اسکن شد. اطلاعات خروج به‌صورت خودکار تکمیل شد.');
    void resolveBarcode(decodedText);
  }, [resolveBarcode]);

  const handleScannerError = useCallback((errorMessage: string) => {
    setMessageType('error');
    setMessage(errorMessage);
  }, []);

  const submit = async () => {
    if (!product || !warehouseId || !customerId || !lotId || !isWeightValid) {
      setMessageType('error');
      setMessage('انتخاب مشتری برای ثبت خروج کالا الزامی است.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'STOCK_OUT',
          quantity: Number(weight),
          weight: Number(weight),
          productId: product.id,
          warehouseId,
          customerId,
          lotId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setMessageType('error');
        setMessage(data?.error ?? 'خطا در ثبت خروج.');
        return;
      }

      setMessageType('success');
      setMessage('خروج کالا با موفقیت ثبت شد.');
      setShowSuccessState(true);
      setProduct(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectProductManually = (selectedProduct: BarcodeProduct) => {
    setProduct(selectedProduct);
    setBarcode(selectedProduct.barcode);
    const resolvedLotId = selectedProduct.lotId ?? selectedProduct.lots?.[0]?.id ?? '';
    setLotId(resolvedLotId);

    const lot = selectedProduct.lots?.find((l) => l.id === resolvedLotId);
    setWeight(lot ? String(lot.quantity) : '');

    setShowSuccessState(false);
    setMessageType('success');
    setMessage('کالا از لیست انتخاب شد. اطلاعات خروج تکمیل شد.');
  };

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim();
    if (!search) return products;

    return products.filter((item) =>
      item.name.includes(search) || item.barcode.includes(search),
    );
  }, [productSearch, products]);

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
              setShowSuccessState(false);
            }}
            placeholder="بارکد یا QR را اسکن/وارد کنید"
            dir="ltr"
          />
          <button
            onClick={() => void resolveBarcode()}
            disabled={isResolvingBarcode}
            className="bg-secondary rounded-xl px-4 py-2 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isResolvingBarcode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            جستجو
          </button>
          <QrCameraScanner
            isOpen={scannerOpen}
            isBusy={isResolvingBarcode}
            onToggle={() => setScannerOpen((prev) => !prev)}
            onDetected={handleScannerDetected}
            onSetupError={handleScannerError}
          />
        </div>

        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-sm font-medium">انتخاب دستی کالا برای خروج</p>
          <input
            className="w-full border border-border rounded-xl p-2 bg-background"
            placeholder="جستجوی دستی کالا (نام یا بارکد)"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            dir="rtl"
          />

          <div className="border border-border rounded-xl max-h-48 overflow-y-auto divide-y divide-border">
            {filteredProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3">کالایی برای نمایش پیدا نشد.</p>
            ) : (
              filteredProducts.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => selectProductManually(item)}
                  className="w-full p-3 text-right hover:bg-muted/40 transition-colors"
                >
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">{item.barcode}</p>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {showSuccessState ? (
        <div className="bg-emerald-500/10 border border-emerald-300 rounded-2xl p-6 text-center animate-in fade-in duration-300">
          <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center animate-pulse">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <p className="font-semibold text-emerald-700">ثبت خروج موفق بود</p>
          <p className="text-sm text-emerald-700/80 mt-1">فرم خروج مخفی شد تا از ثبت تکراری جلوگیری شود.</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              className="bg-primary text-primary-foreground rounded-xl px-4 py-2"
              onClick={() => {
                setBarcode('');
                resetOutgoingForm();
                setMessage('');
                router.replace('/outgoing');
              }}
            >
              ثبت خروج جدید
            </button>
          </div>
        </div>
      ) : (
        product && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <p className="font-medium text-lg text-primary">کالا: {product.name}</p>
            <p className="text-xs text-muted-foreground" dir="ltr">barcode: {product.barcode}</p>

            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground mr-1">لات تخصیصی (بچ)</label>
              <select
                className="w-full border border-border rounded-xl p-2 bg-background font-mono text-sm"
                value={lotId}
                onChange={(e) => {
                  const nextLotId = e.target.value;
                  setLotId(nextLotId);
                  const nextLot = product.lots?.find((l) => l.id === nextLotId);
                  setWeight(nextLot ? String(nextLot.quantity) : '');
                }}
              >
                {product.lotId ? (
                  <option value={product.lotId}>
                    {product.lots?.find((l) => l.id === product.lotId)?.lotNumber || 'لات اسکن شده'} (مستقیم)
                  </option>
                ) : product.lots && product.lots.length > 0 ? (
                  product.lots.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.lotNumber} - موجودی: {l.quantity}
                    </option>
                  ))
                ) : (
                  <option value="">بدون لات فعال</option>
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground mr-1">انبار خروجی</label>
        <select
          className="w-full border border-border rounded-xl p-2 bg-background"
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
        >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
        </select>

        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">مشتری</label>
          <select
            className="w-full border border-border rounded-xl p-2 bg-background"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">انتخاب مشتری (الزامی)</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
                {customer.phone ? ` - ${customer.phone}` : customer.email ? ` - ${customer.email}` : ''}
              </option>
            ))}
          </select>
          {!customerId && (
            <p className="text-xs text-destructive">برای تکمیل عملیات خروج، انتخاب مشتری الزامی است.</p>
          )}
        </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground mr-1">وزن خروجی</label>
              <input
                className="w-full border border-border rounded-xl p-2 bg-background disabled:bg-secondary/50 disabled:text-muted-foreground"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={isFullPackageProduct ? 'وزن برای کالای بسته‌ای ثابت است' : 'وزن به کیلوگرم'}
                dir="ltr"
                readOnly={isFullPackageProduct}
                disabled={isFullPackageProduct}
              />
              <p className="text-xs text-muted-foreground">
                {isFullPackageProduct
                  ? 'برای کالاهای بسته‌ای/عددی وزن از لات خوانده می‌شود و قابل ویرایش نیست.'
                  : 'هنگام اسکن، وزن از لات پر می‌شود و می‌توانید قبل از ثبت ویرایش کنید.'}
                {selectedLot ? ` موجودی لات انتخابی: ${selectedLot.quantity}` : ''}
              </p>
            </div>

            <button
              onClick={submit}
              disabled={!canSubmit}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 mt-2 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              تایید خروج
            </button>
          </div>
        )
      )}

      {message && (
        <p
          className={
            messageType === 'error'
              ? 'text-sm text-destructive'
              : messageType === 'success'
                ? 'text-sm text-emerald-600'
                : 'text-sm text-muted-foreground'
          }
        >
          {message}
        </p>
      )}
    </div>
  );
}
