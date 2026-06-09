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
      sessionStorage.removeItem('labelData');
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
          className="flex h-[10cm] w-[10cm] flex-col border-[3px] border-gray-800 bg-white text-black print:m-0 print:border-[3px] print:border-gray-800"
          style={{ fontFamily: "var(--font-vazirmatn), system-ui, -apple-system, sans-serif" }}
        >
          <div className="flex flex-[0.8] items-center justify-center border-b border-gray-300 px-2">
            <div className="text-center">
              <h3 className="text-base font-bold tracking-wider">{data.companyName || 'نساجی زنبق'}</h3>
              <div className="mx-auto mt-1 h-[2px] w-20 bg-gray-600" />
            </div>
          </div>

          <div className="flex flex-[2.5] items-center justify-center px-3">
            <div className="flex w-full items-center gap-3" dir="rtl">
              <QRCodeSVG value={data.qrCode} size={80} level="M" className="shrink-0" />
              <div className="flex-1 space-y-1 text-sm leading-relaxed text-center">
                <p>
                  <span className="font-bold ml-1">نام کالا:</span>
                  <span>{data.productName}</span>
                </p>
                <p>
                  <span className="font-bold ml-1">وزن ناخالص:</span>
                  <span>{data.grossWeight} {data.unit}</span>
                </p>
                <p>
                  <span className="font-bold ml-1">وزن خالص:</span>
                  <span>{data.netWeight} {data.unit}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-[3.5] items-center justify-center border-y border-gray-300 px-5">
            <Barcode
              value={data.barcode}
              width={2.2}
              height={48}
              fontSize={14}
              displayValue
              margin={4}
            />
          </div>

          <div className="flex flex-[1.3] items-center justify-center px-5">
            <div className="w-full text-center">
              <p className="mb-1 text-sm font-bold">شماره بچ</p>
              <div dir="ltr" className="mx-auto grid w-full max-w-[75%] grid-cols-8 border border-gray-600 text-center font-mono leading-tight tracking-widest">
                {data.lotNumber.split('').slice(0, 8).map((digit, i) => (
                  <div
                    key={i}
                    className="border-l border-gray-600 py-[3px] text-sm last:border-l-0"
                  >
                    {digit}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-[1] items-center justify-center border-t border-gray-300 px-5">
            <p className="text-sm text-center truncate w-full">
              <span className="font-bold ml-1">تاریخ تولید:</span>
              <span>{formattedDate}</span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
