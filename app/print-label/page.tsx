import PrintLabelClient from './PrintLabelClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'چاپ لیبل',
};

export default function PrintLabelPage() {
  return <PrintLabelClient />;
}
