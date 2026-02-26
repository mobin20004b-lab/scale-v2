export function generateLotNumber() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `LOT-${yyyy}${mm}${dd}-${random}`;
}

export function generateEntryBarcode(productBarcode: string, lotNumber: string) {
  const tail = lotNumber.split('-').slice(-1)[0] ?? lotNumber;
  return `${productBarcode}-${tail}`;
}

export function generateEntryQr(productId: string, lotNumber: string) {
  return `STOCK:${productId}:${lotNumber}`;
}
