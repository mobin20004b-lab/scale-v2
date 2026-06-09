import PrintLabelClient from './PrintLabelClient';
import type { Metadata } from 'next';

type PrintLabelPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: 'چاپ لیبل',
};

const getSearchValue = (value: string | string[] | undefined, fallback: string) => {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
};

export default async function PrintLabelPage({ searchParams }: PrintLabelPageProps) {
  const params = await searchParams;

  const productName = getSearchValue(params.productName, '-');
  const companyName = getSearchValue(params.companyName, '');
  const unit = getSearchValue(params.unit, 'kg');
  const lotNumber = getSearchValue(params.lotNumber, '-');
  const createdAt = getSearchValue(params.createdAt, '');
  const barcode = getSearchValue(params.barcode, '-');
  const qrCode = getSearchValue(params.qrCode, '-');
  const quantity = Number(getSearchValue(params.quantity, '0'));
  const grossWeight = Number(getSearchValue(params.grossWeight, String(quantity)));
  const netWeight = Number(getSearchValue(params.netWeight, String(quantity)));

  return (
    <PrintLabelClient
      productName={productName}
      companyName={companyName}
      unit={unit}
      lotNumber={lotNumber}
      createdAt={createdAt}
      barcode={barcode}
      qrCode={qrCode}
      quantity={quantity}
      grossWeight={grossWeight}
      netWeight={netWeight}
    />
  );
}
