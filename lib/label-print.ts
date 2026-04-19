export type PrintableLabelPayload = {
  productName: string;
  quantity: number;
  unit: string;
  lotNumber: string;
  createdAt: string;
  barcode: string;
  qrCode: string;
};

export const buildLabelPrintUrl = (payload: PrintableLabelPayload) => {
  const params = new URLSearchParams({
    productName: payload.productName,
    quantity: String(payload.quantity),
    unit: payload.unit,
    lotNumber: payload.lotNumber,
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
