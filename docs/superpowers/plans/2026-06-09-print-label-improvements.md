# Print Label Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix print label logic — wire up PrintJob queue for ESP32/thermal printers, fix browser fallback (remove URL params, setTimeout race), fix weight fallback chain.

**Architecture:** Browser click → `printLabel(payload)` → tries `POST /api/print-jobs` with TSPL commands → on failure, `sessionStorage` → `window.open('/print-label')` → reads sessionStorage → `window.print()`. Remove URL params, setTimeout race.

**Tech Stack:** Next.js, TypeScript, Prisma, TSPL

---

### Task 1: Create TSPL label builder (`lib/tspl.ts`)

**Files:**
- Create: `lib/tspl.ts`

- [ ] **Step 1: Write `lib/tspl.ts`**

```typescript
export type LabelContent = {
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

export function buildTSPL(content: LabelContent): string {
  const lines: string[] = [];

  // Label size 100mm x 150mm
  lines.push('SIZE 100 mm, 150 mm');
  lines.push('GAP 3 mm, 0 mm');
  lines.push('DIRECTION 1');
  lines.push('CLS');
  lines.push('CODEPAGE UTF-8');

  const yBase = 20;
  let y = yBase;

  // Company name (centered)
  const companyText = content.companyName || 'نساجی زنبق';
  lines.push(`TEXT 300,${y},"3",0,1,1,"${escapeTSPL(companyText)}"`);
  y += 50;

  // Horizontal line
  lines.push(`BAR 20,${y},460,2,0`);
  y += 20;

  // Product name
  lines.push(`TEXT 300,${y},"3",0,1,1,"${escapeTSPL(content.productName)}"`);
  y += 40;

  // Gross weight
  lines.push(`TEXT 20,${y},"2",0,1,1,"وزن ناخالص: ${content.grossWeight} ${content.unit}"`);
  y += 35;

  // Net weight
  lines.push(`TEXT 20,${y},"2",0,1,1,"وزن خالص: ${content.netWeight} ${content.unit}"`);
  y += 50;

  // Horizontal line
  lines.push(`BAR 20,${y},460,2,0`);
  y += 20;

  // Barcode (Code 128)
  lines.push(`BARCODE 20,${y},"128",40,1,0,2,2,"${escapeTSPL(content.barcode)}"`);
  y += 65;

  // Batch number label
  lines.push(`TEXT 20,${y},"2",0,1,1,"شماره بچ: ${escapeTSPL(content.lotNumber)}"`);
  y += 35;

  // Date
  const formattedDate = content.createdAt
    ? new Date(content.createdAt).toLocaleString('fa-IR')
    : '-';
  lines.push(`TEXT 20,${y},"2",0,1,1,"${escapeTSPL(formattedDate)}"`);

  // QR code (bottom-right area)
  const qrY = y - 60;
  lines.push(`QRCODE 200,${qrY},H,4,A,0,"${escapeTSPL(content.qrCode)}"`);

  // Print 1 copy
  lines.push('PRINT 1,1');

  return lines.join('\r\n');
}

function escapeTSPL(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
```

### Task 2: Refactor `lib/label-print.ts`

**Files:**
- Modify: `lib/label-print.ts`

- [ ] **Step 1: Rewrite `lib/label-print.ts`**

New content:

```typescript
import { LabelContent, buildTSPL } from './tspl';

export type { LabelContent };

type PrintLabelPayload = {
  companyName?: string;
  productName: string;
  quantity: number;
  grossWeight?: number;
  netWeight?: number;
  unit: string;
  lotNumber: string;
  createdAt: string;
  barcode: string;
  qrCode: string;
};

export async function printLabel(payload: PrintLabelPayload): Promise<void> {
  const grossW = payload.grossWeight ?? payload.quantity;
  const netW = payload.netWeight ?? payload.quantity;

  // Try PrintJob queue first (for ESP32/bridge)
  const tspl = buildTSPL({
    companyName: payload.companyName,
    productName: payload.productName,
    grossWeight: grossW,
    netWeight: netW,
    unit: payload.unit,
    lotNumber: payload.lotNumber,
    createdAt: payload.createdAt,
    barcode: payload.barcode,
    qrCode: payload.qrCode,
  });

  try {
    const res = await fetch('/api/print-jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: tspl }),
    });
    if (res.ok) {
      return; // printed via ESP32/bridge
    }
  } catch {
    // Bridge offline — fall through to browser print
  }

  // Fallback: browser print via sessionStorage
  openLabelPrintWindow(payload);
}

export function openLabelPrintWindow(payload: PrintLabelPayload): void {
  const grossW = payload.grossWeight ?? payload.quantity;
  const netW = payload.netWeight ?? payload.quantity;

  sessionStorage.setItem(
    'labelData',
    JSON.stringify({
      companyName: payload.companyName ?? '',
      productName: payload.productName,
      grossWeight: grossW,
      netWeight: netW,
      unit: payload.unit,
      lotNumber: payload.lotNumber,
      createdAt: payload.createdAt,
      barcode: payload.barcode,
      qrCode: payload.qrCode,
    }),
  );

  const popup = window.open('/print-label', '_blank', 'noopener,noreferrer');
  if (!popup) {
    window.location.assign('/print-label');
  }
}
```

### Task 3: Simplify `app/print-label/page.tsx`

**Files:**
- Modify: `app/print-label/page.tsx`

- [ ] **Step 1: Rewrite `app/print-label/page.tsx`**

```typescript
import PrintLabelClient from './PrintLabelClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'چاپ لیبل',
};

export default function PrintLabelPage() {
  return <PrintLabelClient />;
}
```

### Task 4: Fix `app/print-label/PrintLabelClient.tsx`

**Files:**
- Modify: `app/print-label/PrintLabelClient.tsx`

- [ ] **Step 1: Rewrite `app/print-label/PrintLabelClient.tsx`**

```typescript
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
    const raw = sessionStorage.getItem('labelData');
    if (!raw) return;

    const parsed: LabelData = JSON.parse(raw);
    sessionStorage.removeItem('labelData');
    setData(parsed);

    document.body.classList.add('print-label-page');

    // Trigger print after render
    requestAnimationFrame(() => {
      window.print();
    });

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
          {/* Header */}
          <div className="flex flex-[1.2] items-center justify-center border-b border-gray-300 px-2">
            <div className="relative flex w-full items-center justify-center">
              <QRCodeSVG value={data.qrCode} size={40} level="M" className="absolute left-0" />
              <div className="text-center">
                <h3 className="text-base font-bold tracking-wider">{data.companyName || 'نساجی زنبق'}</h3>
                <div className="mx-auto mt-1 h-[2px] w-20 bg-gray-600" />
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="flex flex-[2] items-center justify-center px-5">
            <div className="w-full space-y-1 text-sm leading-relaxed text-center">
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

          {/* Barcode */}
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

          {/* Batch Section */}
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
```

### Task 5: Update `app/incoming/page.tsx` to use the new flow

**Files:**
- Modify: `app/incoming/page.tsx`

- [ ] **Step 1: Update the import and handler**

Change the import from:
```typescript
import { openLabelPrintWindow } from '@/lib/label-print';
```
to:
```typescript
import { printLabel } from '@/lib/label-print';
```

Replace `handlePrint` function:
```typescript
const handlePrint = async () => {
  if (!generatedLot) return;
  const lotProduct = products.find((p) => p.id === generatedLot.productId);

  await printLabel({
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
```

### Task 6: Update `app/products/page.tsx` to use the new flow

**Files:**
- Modify: `app/products/page.tsx`

- [ ] **Step 1: Update the import and handler**

Change the import:
```typescript
import { openLabelPrintWindow } from '@/lib/label-print';
```
to:
```typescript
import { printLabel } from '@/lib/label-print';
```

Replace the `onClick` handler (lines 625-639):
```typescript
onClick={async () => {
  await printLabel({
    companyName,
    productName: receiptLot.productName,
    quantity: receiptLot.quantity,
    grossWeight: receiptLot.quantity,
    netWeight: receiptLot.quantity,
    unit: receiptLot.productUnit,
    lotNumber: receiptLot.lotNumber,
    createdAt: receiptLot.createdAt,
    barcode: receiptLot.barcode,
    qrCode: receiptLot.qrCode,
  });
}}
```

### Task 7: Update PrintJob API to accept jobs without scaleId

**Files:**
- Modify: `app/api/print-jobs/route.ts`

- [ ] **Step 1: Allow null scaleId for ad-hoc print jobs**

Change the POST handler to make `scaleId` optional. When no scaleId is provided, the job is queued for any available bridge:

```typescript
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();

  try {
    const printJob = await prisma.printJob.create({
      data: {
        scaleId: data.scaleId || 'bridge',
        payload: data.payload,
        status: 'QUEUED',
      },
    });

    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        action: 'PRINT_JOB_CREATED',
        entityType: 'PRINT_JOB',
        entityId: printJob.id,
        details: JSON.stringify({ scaleId: data.scaleId || null }),
      },
    });

    return NextResponse.json(printJob, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create print job' }, { status: 500 });
  }
}
```
