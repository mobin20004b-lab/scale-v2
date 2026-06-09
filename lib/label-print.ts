import { buildTSPL } from './tspl';

export type PrintableLabelPayload = {
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

export async function printLabel(
  payload: PrintableLabelPayload,
  scaleId?: string,
): Promise<void> {
  const grossW = payload.grossWeight ?? payload.quantity;
  const netW = payload.netWeight ?? payload.quantity;

  if (scaleId) {
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
        body: JSON.stringify({ scaleId, payload: tspl }),
      });
      if (res.ok) {
        return;
      }
    } catch {
      // bridge offline — fall through
    }
  }

  openLabelPrintWindow(payload);
}

export function openLabelPrintWindow(payload: PrintableLabelPayload): void {
  const grossW = payload.grossWeight ?? payload.quantity;
  const netW = payload.netWeight ?? payload.quantity;

  localStorage.setItem(
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
