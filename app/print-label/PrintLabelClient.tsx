'use client';

import { useEffect, useState } from 'react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';

type LabelData = {
  companyName?: string;
  productName: string;
  grossWeight: number;
  netWeight: number;
  unit: string;
  lotNumber: string;
  createdAt: string;
  barcode: string;
  qrCode: string;
};

export default function PrintLabelClient() {
  const [data, setData] = useState<LabelData | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('labelData');
    if (!raw) return;

    try {
      const parsed: LabelData = JSON.parse(raw);
      localStorage.removeItem('labelData');
      setData(parsed);

      document.body.classList.add('print-label-page');

      requestAnimationFrame(() => {
        window.print();
      });
    } catch {
      localStorage.removeItem('labelData');
    }

    return () => {
      document.body.classList.remove('print-label-page');
    };
  }, []);

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center space-y-4">
          <p className="text-lg text-gray-600">داده‌ای برای چاپ وجود ندارد.</p>
          <button
            onClick={() => window.close()}
            className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            بستن
          </button>
        </div>
      </main>
    );
  }

  const formattedDate = data.createdAt
    ? new Date(data.createdAt).toLocaleString('fa-IR')
    : '-';

  return (
    <main
      id="print-label-root"
      className="min-h-screen bg-gray-100 p-6 print:bg-white print:p-0"
    >
      <div className="mx-auto max-w-[10cm] print:max-w-none">
        <div className="mb-4 flex justify-end print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground shadow-sm"
          >
            چاپ مجدد
          </button>
        </div>

        <div
          dir="rtl"
          className="box-border flex h-[100mm] w-[100mm] overflow-hidden flex-col border-[3px] border-gray-800 bg-white text-black print:m-0 print:h-[100mm] print:w-[100mm] print:border-[3px] print:border-gray-800"
          style={{ fontFamily: "var(--font-vazirmatn), system-ui, -apple-system, sans-serif" }}
        >
          <div className="flex min-h-0 flex-[0.75] items-center justify-center border-b border-gray-300 px-2">
            <div className="max-w-full text-center">
              <h3 className="truncate text-sm font-bold tracking-wider">{data.companyName || 'نساجی زنبق'}</h3>
              <div className="mx-auto mt-1 h-[2px] w-16 bg-gray-600" />
            </div>
          </div>

          <div className="flex min-h-0 flex-[2.2] items-center justify-center px-2">
            <div className="flex min-w-0 w-full items-center gap-2" dir="rtl">
              <QRCodeSVG value={data.qrCode} size={68} level="M" className="shrink-0" />
              <div className="min-w-0 flex-1 space-y-0.5 text-center text-[13px] leading-tight">
                <p className="break-words text-sm font-bold">
                  <span className="ml-1">نام کالا:</span>
                  <span>{data.productName}</span>
                </p>
                <p className="truncate font-bold">
                  <span className="ml-1">وزن ناخالص:</span>
                  <span>{data.grossWeight} {data.unit}</span>
                </p>
                <p className="truncate font-bold">
                  <span className="ml-1">وزن خالص:</span>
                  <span>{data.netWeight} {data.unit}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-[3.35] items-center justify-center overflow-hidden border-y border-gray-300 px-2 [&_svg]:h-auto [&_svg]:max-h-[30mm] [&_svg]:max-w-full">
            <Barcode
              value={data.barcode}
              width={1.45}
              height={42}
              fontSize={11}
              displayValue
              margin={2}
            />
          </div>

          <div className="flex min-h-0 flex-[1.25] items-center justify-center px-3">
            <div className="w-full text-center">
              <p className="mb-0.5 text-xs font-bold">شماره بچ</p>
              <div dir="ltr" className="mx-auto grid w-full max-w-[72%] grid-cols-8 overflow-hidden border border-gray-600 text-center font-mono text-xs leading-tight tracking-widest">
                {data.lotNumber.split('').slice(0, 8).map((digit, i) => (
                  <div
                    key={i}
                    className="border-l border-gray-600 py-[2px] last:border-l-0"
                  >
                    {digit}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-[0.9] items-center justify-center border-t border-gray-300 px-3">
            <p className="w-full truncate text-center text-xs">
              <span className="font-bold ml-1">تاریخ تولید:</span>
              <span>{formattedDate}</span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
