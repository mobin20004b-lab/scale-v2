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

  lines.push('SIZE 100 mm, 100 mm');
  lines.push('GAP 3 mm, 0 mm');
  lines.push('DIRECTION 1');
  lines.push('CLS');
  lines.push('CODEPAGE UTF-8');

  let y = 20;

  const companyText = content.companyName || 'نساجی زنبق';
  lines.push(`TEXT 300,${y},"3",0,1,1,"${escapeTSPL(companyText)}"`);
  y += 50;

  lines.push(`BAR 20,${y},460,2,0`);
  y += 20;

  lines.push(`TEXT 115,${y},"3",0,2,2,"${escapeTSPL(content.productName)}"`);
  y += 90;

  lines.push(`TEXT 95,${y},"3",0,1,2,"${escapeTSPL(`وزن ناخالص: ${content.grossWeight} ${content.unit}`)}"`);
  y += 55;

  lines.push(`TEXT 115,${y},"3",0,1,2,"${escapeTSPL(`وزن خالص: ${content.netWeight} ${content.unit}`)}"`);
  y += 65;

  const formattedDate = content.createdAt
    ? new Date(content.createdAt).toLocaleString('fa-IR')
    : '-';
  lines.push(`BAR 20,${y},460,2,0`);
  y += 30;

  // Barcode is placed to the left of the QR code. Batch/lot text is intentionally omitted.
  lines.push(`BARCODE 20,${y},"128",48,1,0,2,2,"${escapeTSPL(content.barcode)}"`);
  lines.push(`QRCODE 330,${y - 10},H,5,A,0,"${escapeTSPL(content.qrCode)}"`);

  y = 705;
  lines.push(`BAR 20,${y},460,2,0`);
  y += 30;
  lines.push(`TEXT 145,${y},"2",0,2,2,"${escapeTSPL(formattedDate)}"`);

  lines.push('PRINT 1,1');

  return lines.join('\r\n');
}

function escapeTSPL(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
