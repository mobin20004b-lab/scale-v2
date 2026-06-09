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

  lines.push('SIZE 100 mm, 150 mm');
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

  lines.push(`QRCODE 300,${y},H,5,A,0,"${escapeTSPL(content.qrCode)}"`);
  lines.push(`TEXT 20,${y},"3",0,1,1,"${escapeTSPL(content.productName)}"`);
  y += 45;

  lines.push(`TEXT 20,${y},"2",0,1,1,"${escapeTSPL(`وزن ناخالص: ${content.grossWeight} ${content.unit}`)}"`);
  y += 35;

  lines.push(`TEXT 20,${y},"2",0,1,1,"${escapeTSPL(`وزن خالص: ${content.netWeight} ${content.unit}`)}"`);
  y += 50;

  lines.push(`BAR 20,${y},460,2,0`);
  y += 20;

  lines.push(`BARCODE 20,${y},"128",40,1,0,2,2,"${escapeTSPL(content.barcode)}"`);
  y += 65;

  lines.push(`TEXT 20,${y},"2",0,1,1,"${escapeTSPL(`شماره بچ: ${content.lotNumber}`)}"`);
  y += 35;

  const formattedDate = content.createdAt
    ? new Date(content.createdAt).toLocaleString('fa-IR')
    : '-';
  lines.push(`TEXT 20,${y},"2",0,1,1,"${escapeTSPL(formattedDate)}"`);

  lines.push('PRINT 1,1');

  return lines.join('\r\n');
}

function escapeTSPL(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
