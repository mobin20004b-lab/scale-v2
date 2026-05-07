export type PrintableLabelPayload = {
  companyName?: string;
  productName: string;
  quantity: number;
  grossWeight?: number;
  netWeight?: number;
  unit: string;
  createdAt: string;
  barcode: string;
  qrCode: string;
};

export const buildLabelPrintUrl = (payload: PrintableLabelPayload) => {
  const params = new URLSearchParams({
    productName: payload.productName,
    companyName: payload.companyName ?? '',
    quantity: String(payload.quantity),
    grossWeight: String(payload.grossWeight ?? payload.quantity),
    netWeight: String(payload.netWeight ?? payload.quantity),
    unit: payload.unit,
    createdAt: payload.createdAt,
    barcode: payload.barcode,
    qrCode: payload.qrCode,
  });

  return `/print-label?${params.toString()}`;
};

export const openLabelPrintWindow = (payload: PrintableLabelPayload) => {
  const url = buildLabelPrintUrl(payload);
  const popup = window.open(url, '_blank', 'noopener,noreferrer');

  if (!popup) {
    window.location.assign(url);
  }
};
