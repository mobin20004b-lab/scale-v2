import PrintLabelClient from './PrintLabelClient';

type PrintLabelPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
  const unit = getSearchValue(params.unit, 'kg');
  const lotNumber = getSearchValue(params.lotNumber, '-');
  const createdAt = getSearchValue(params.createdAt, '');
  const barcode = getSearchValue(params.barcode, '-');
  const qrCode = getSearchValue(params.qrCode, '-');
  const quantity = Number(getSearchValue(params.quantity, '0'));

  return (
    <PrintLabelClient
      productName={productName}
      unit={unit}
      lotNumber={lotNumber}
      createdAt={createdAt}
      barcode={barcode}
      qrCode={qrCode}
      quantity={quantity}
    />
  );
}
