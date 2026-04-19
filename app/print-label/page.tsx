'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { Printer } from 'lucide-react';

export default function PrintLabelPage() {
  const searchParams = useSearchParams();
  const productName = searchParams.get('productName') ?? '-';
  const unit = searchParams.get('unit') ?? 'kg';
  const lotNumber = searchParams.get('lotNumber') ?? '-';
  const createdAt = searchParams.get('createdAt') ?? '';
  const barcode = searchParams.get('barcode') ?? '-';
  const qrCode = searchParams.get('qrCode') ?? '-';
  const quantity = Number(searchParams.get('quantity') ?? '0');

  useEffect(() => {
    const timeout = setTimeout(() => window.print(), 200);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <main className="min-h-screen bg-background p-4 sm:p-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-[10cm] print:max-w-none">
        <div className="mb-4 flex justify-end print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-primary-foreground"
          >
            <Printer className="h-4 w-4" />
            چاپ مجدد
          </button>
        </div>

        <div className="mx-auto flex h-[15cm] w-[10cm] flex-col items-center justify-center space-y-4 rounded-2xl border border-border bg-white p-6 text-black print:m-0 print:border-none print:p-0">
          <h1 className="text-center text-2xl font-bold">{productName}</h1>
          <p className="text-xl font-medium">
            وزن/تعداد: {Number.isFinite(quantity) ? quantity : 0} {unit}
          </p>
          <p className="text-lg text-gray-700">
            شماره لات: <span className="font-mono">{lotNumber}</span>
          </p>
          <p className="text-sm text-gray-700" dir="ltr">
            {createdAt ? new Date(createdAt).toLocaleString('fa-IR') : '-'}
          </p>

          <div className="scale-110 py-2">
            <Barcode value={barcode} width={2} height={60} fontSize={14} displayValue />
          </div>

          <div className="pt-2">
            <QRCodeSVG value={qrCode} size={120} level="M" includeMargin />
          </div>
        </div>
      </div>
    </main>
  );
}
