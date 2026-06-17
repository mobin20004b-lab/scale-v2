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
  _scaleId?: string,
): Promise<void> {
  openLabelPrintDialog(payload);
}

export function openLabelPrintDialog(payload: PrintableLabelPayload): void {
  const grossW = payload.grossWeight ?? payload.quantity;
  const netW = payload.netWeight ?? payload.quantity;

  window.dispatchEvent(
    new CustomEvent('label-print-request', {
      detail: {
        companyName: payload.companyName ?? '',
        productName: payload.productName,
        grossWeight: grossW,
        netWeight: netW,
        unit: payload.unit,
        lotNumber: payload.lotNumber,
        createdAt: payload.createdAt,
        barcode: payload.barcode,
        qrCode: payload.qrCode,
      },
    }),
  );
}
