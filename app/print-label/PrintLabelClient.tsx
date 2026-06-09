'use client';

import { useEffect } from 'react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';

type PrintLabelClientProps = {
  companyName?: string;
  productName: string;
  unit: string;
  lotNumber: string;
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
  lotNumber,
  createdAt,
  barcode,
  quantity,
  grossWeight,
  netWeight,
  qrCode,
}: PrintLabelClientProps) {
  useEffect(() => {
    document.body.classList.add('print-label-page');
    const timeout = setTimeout(() => window.print(), 200);
    return () => {
      clearTimeout(timeout);
      document.body.classList.remove('print-label-page');
    };
  }, []);

  const netW = netWeight ?? quantity;
  const grossW = grossWeight ?? netW;

  const batchDigits = lotNumber.split('').slice(0, 8);
  while (batchDigits.length < 8) {
    batchDigits.push('');
  }

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleString('fa-IR')
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
          {/* Header */}
          <div className="flex flex-[1.2] items-center justify-center border-b border-gray-300 px-2">
            <div className="relative flex w-full items-center justify-center">
              <QRCodeSVG value={qrCode} size={40} level="M" className="absolute left-0" />
              <div className="text-center">
                <h3 className="text-base font-bold tracking-wider">{companyName || 'نساجی زنبق'}</h3>
                <div className="mx-auto mt-1 h-[2px] w-20 bg-gray-600" />
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="flex flex-[2] items-center justify-center px-5">
            <div className="w-full space-y-1 text-sm leading-relaxed text-center">
              <p>
                <span className="font-bold ml-1">نام کالا:</span>
                <span>{productName}</span>
              </p>
              <p>
                <span className="font-bold ml-1">وزن ناخالص:</span>
                <span>{grossW} {unit}</span>
              </p>
              <p>
                <span className="font-bold ml-1">وزن خالص:</span>
                <span>{netW} {unit}</span>
              </p>
            </div>
          </div>

          {/* Barcode */}
          <div className="flex flex-[3.5] items-center justify-center border-y border-gray-300 px-5">
            <Barcode
              value={barcode}
              width={2.2}
              height={48}
              fontSize={14}
              displayValue
              margin={4}
            />
          </div>

          {/* Batch Section */}
          <div className="flex flex-[1.3] items-center justify-center px-5">
            <div className="w-full text-center">
              <p className="mb-1 text-sm font-bold">شماره بچ</p>
              <div dir="ltr" className="mx-auto grid w-full max-w-[75%] grid-cols-8 border border-gray-600 text-center font-mono leading-tight tracking-widest">
                {batchDigits.map((digit, i) => (
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

          {/* Date Section */}
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
