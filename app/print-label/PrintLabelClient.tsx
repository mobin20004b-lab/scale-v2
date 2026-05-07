'use client';

import { useEffect } from 'react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { Printer } from 'lucide-react';

type PrintLabelClientProps = {
  companyName?: string;
  productName: string;
  unit: string;
  createdAt: string;
  barcode: string;
  qrCode: string;
  quantity: number;
  grossWeight?: number;
  netWeight?: number;
};

export default function PrintLabelClient({
  companyName,
  productName,
  unit,
  createdAt,
  barcode,
  qrCode,
  quantity,
  grossWeight,
  netWeight,
}: PrintLabelClientProps) {
  useEffect(() => {
    document.body.classList.add('print-label-page');
    const timeout = setTimeout(() => window.print(), 200);
    return () => {
      clearTimeout(timeout);
      document.body.classList.remove('print-label-page');
    };
  }, []);

  return (
    <main id="print-label-root" className="min-h-screen bg-background p-4 sm:p-8 print:bg-white print:p-0">
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
          <h1 className="text-center text-4xl font-extrabold">{companyName || ' '}</h1>
          <hr className="w-full border-gray-300" />
          <h1 className="text-center text-2xl font-bold">{productName}</h1>
          <p className="text-2xl font-semibold">
            وزن ناخالص: {Number.isFinite(grossWeight) ? grossWeight : Number.isFinite(quantity) ? quantity : 0} {unit}
          </p>
          <p className="text-2xl font-semibold">
            وزن خالص: {Number.isFinite(netWeight) ? netWeight : Number.isFinite(quantity) ? quantity : 0} {unit}
          </p>
          <p className="text-base text-gray-700" dir="ltr">
            {createdAt ? new Date(createdAt).toLocaleString('fa-IR') : '-'}
          </p>

          <div className="scale-125 py-2">
            <Barcode value={barcode} width={2.5} height={80} fontSize={18} displayValue />
          </div>

          <div className="pt-2">
            <QRCodeSVG value={qrCode} size={160} level="M" includeMargin />
          </div>
        </div>
      </div>
    </main>
  );
}
