'use client';

import { useState, useEffect } from 'react';
import { ScanBarcode, Link as LinkIcon, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface UnknownBarcode {
  id: string;
  barcode: string;
  status: 'OPEN' | 'TEMP_RECEIVING' | 'MAPPED';
  capturedAt: string;
  resolvedAt: string | null;
  resolvedTo: string | null;
}

interface Product {
  id: string;
  name: string;
  barcode: string;
}

export default function UnknownBarcodesPage() {
  const [barcodes, setBarcodes] = useState<UnknownBarcode[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mappingId, setMappingId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [barcodesRes, productsRes] = await Promise.all([
        fetch('/api/barcode/unknown'),
        fetch('/api/products')
      ]);

      if (barcodesRes.ok && productsRes.ok) {
        setBarcodes(await barcodesRes.json());
        setProducts(await productsRes.json());
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMap = async (id: string) => {
    if (!selectedProductId) return;

    try {
      const res = await fetch('/api/barcode/unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: 'MAPPED',
          productId: selectedProductId
        }),
      });

      if (res.ok) {
        setSuccess('بارکد با موفقیت متصل شد.');
        setTimeout(() => setSuccess(''), 3000);
        setMappingId(null);
        setSelectedProductId('');
        fetchData();
      } else {
        setError('خطا در اتصال بارکد.');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      setError('خطای شبکه.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(dateString));
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">بارکدهای ناشناخته</h1>
        <p className="text-muted-foreground mt-1">مدیریت و اتصال بارکدهای اسکن شده‌ای که در سیستم ثبت نشده‌اند.</p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 text-emerald-600 px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          {success}
        </div>
      )}

      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
            <ScanBarcode className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-semibold">لیست بارکدهای باز</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-border bg-secondary/20">
                <th className="px-6 py-4 text-sm font-medium text-muted-foreground">بارکد اسکن شده</th>
                <th className="px-6 py-4 text-sm font-medium text-muted-foreground">زمان اسکن</th>
                <th className="px-6 py-4 text-sm font-medium text-muted-foreground">وضعیت</th>
                <th className="px-6 py-4 text-sm font-medium text-muted-foreground text-left">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : barcodes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    هیچ بارکد ناشناخته‌ای یافت نشد.
                  </td>
                </tr>
              ) : (
                barcodes.map((barcode) => (
                  <tr key={barcode.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono font-medium text-foreground bg-secondary/50 px-3 py-1.5 rounded-lg" dir="ltr">
                        {barcode.barcode}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {formatDate(barcode.capturedAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-700">
                        در انتظار بررسی
                      </span>
                    </td>
                    <td className="px-6 py-4 text-left">
                      {mappingId === barcode.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <select
                            className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary max-w-[200px]"
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(e.target.value)}
                          >
                            <option value="">انتخاب محصول...</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleMap(barcode.id)}
                            disabled={!selectedProductId}
                            className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                          >
                            تایید
                          </button>
                          <button
                            onClick={() => { setMappingId(null); setSelectedProductId(''); }}
                            className="bg-secondary text-secondary-foreground px-3 py-2 rounded-lg text-sm font-medium hover:bg-secondary/80"
                          >
                            لغو
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setMappingId(barcode.id)}
                          className="flex items-center gap-2 text-sm font-medium text-primary hover:bg-primary/10 px-3 py-2 rounded-lg transition-colors ml-auto"
                        >
                          <LinkIcon className="w-4 h-4" />
                          اتصال به محصول
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
