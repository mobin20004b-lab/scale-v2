'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';

export type LabelDialogData = {
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

const CANVAS_SIZE = 800;
const LABEL_SIZE = '10cm';
const PNG_PIXELS_PER_METER = CANVAS_SIZE / 0.1;
const PRINT_EVENT = 'label-print-request';

export default function PrintLabelDialog() {
  const [data, setData] = useState<LabelDialogData | null>(null);
  const [pngUrl, setPngUrl] = useState<string>('');
  const [isPreparing, setIsPreparing] = useState(false);
  const [pendingPrint, setPendingPrint] = useState(false);
  const assetsRef = useRef<HTMLDivElement>(null);
  const printImageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const openDialog = (event: Event) => {
      const detail = (event as CustomEvent<LabelDialogData>).detail;
      if (!detail) return;

      setPngUrl('');
      setPendingPrint(false);
      setData(detail);
      document.body.classList.add('print-label-page');
    };

    window.addEventListener(PRINT_EVENT, openDialog);
    return () => {
      window.removeEventListener(PRINT_EVENT, openDialog);
      document.body.classList.remove('print-label-page');
    };
  }, []);

  const closeDialog = () => {
    setData(null);
    setPngUrl('');
    setPendingPrint(false);
    document.body.classList.remove('print-label-page');
  };

  const buildPng = useCallback(async () => {
    if (!data || !assetsRef.current) return;

    setIsPreparing(true);
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsPreparing(false);
      return;
    }

    await Promise.race([
      Promise.all([
        document.fonts?.ready ?? Promise.resolve(),
        document.fonts?.load('900 42px Vazirmatn') ?? Promise.resolve(),
        document.fonts?.load('900 34px Vazirmatn') ?? Promise.resolve(),
      ]),
      new Promise((resolve) => setTimeout(resolve, 180)),
    ]);

    try {
      const [barcodeImage, qrImage] = await Promise.all([
        svgElementToImage(assetsRef.current.querySelector<SVGSVGElement>('[data-label-barcode] svg')),
        svgElementToImage(assetsRef.current.querySelector<SVGSVGElement>('[data-label-qr] svg')),
      ]);

      drawLabelCanvas(ctx, data, barcodeImage, qrImage);
      setPngUrl(addPngPhysicalSize(canvas.toDataURL('image/png')));
    } finally {
      setIsPreparing(false);
    }
  }, [data]);

  useEffect(() => {
    if (!data) return;

    const frame = requestAnimationFrame(() => {
      void buildPng();
    });

    return () => cancelAnimationFrame(frame);
  }, [buildPng, data]);

  useEffect(() => {
    if (!pendingPrint || !pngUrl) return;

    const image = printImageRef.current;
    if (!image) return;

    const print = () => {
      setPendingPrint(false);
      requestAnimationFrame(() => window.print());
    };

    if (image.complete) {
      print();
      return;
    }

    image.addEventListener('load', print, { once: true });
    return () => image.removeEventListener('load', print);
  }, [pendingPrint, pngUrl]);

  const handlePrint = async () => {
    if (!pngUrl) {
      setPendingPrint(true);
      await buildPng();
      return;
    }

    requestAnimationFrame(() => window.print());
  };

  if (!data) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/55 p-4 backdrop-blur-sm print:static print:block print:bg-transparent print:p-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-label-dialog-title"
      dir="rtl"
      style={{ fontFamily: 'var(--font-vazirmatn), Vazirmatn' }}
    >
      <div className="print:hidden absolute left-[-9999px] top-0" ref={assetsRef} aria-hidden="true">
        <div data-label-barcode>
          <Barcode
            value={data.barcode}
            width={2.2}
            height={96}
            fontSize={22}
            displayValue
            font="Vazirmatn"
            margin={0}
          />
        </div>
        <div data-label-qr>
          <QRCodeSVG value={data.qrCode} size={220} level="M" marginSize={0} />
        </div>
      </div>

      <section className="w-full max-w-[560px] rounded-[2rem] border border-stone-300 bg-[#fbfaf6] p-5 text-right shadow-2xl shadow-stone-950/25 print:contents">
        <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-stone-500">PNG Label</p>
            <h2 id="print-label-dialog-title" className="mt-1 text-2xl font-black text-stone-950">
              پیش‌نمایش چاپ لیبل
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              لیبل در همین صفحه آماده می‌شود. برای چاپ فقط دکمه چاپ را بزنید.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={closeDialog}
              className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-black text-stone-700 transition hover:bg-stone-100"
            >
              بستن
            </button>
            <button
              onClick={handlePrint}
              disabled={isPreparing}
              className="rounded-2xl bg-stone-950 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-primary disabled:cursor-wait disabled:opacity-60"
            >
              {isPreparing ? 'در حال ساخت...' : 'چاپ'}
            </button>
          </div>
        </div>

        <div
          id="print-label-root"
          className="mx-auto flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-white print:rounded-none"
          style={{ width: LABEL_SIZE, height: LABEL_SIZE, maxWidth: '100%' }}
        >
          {pngUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={printImageRef}
              src={pngUrl}
              alt="لیبل آماده چاپ"
              className="block object-contain"
              style={{ width: LABEL_SIZE, height: LABEL_SIZE }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-right text-base font-black text-stone-500">
              در حال ساخت PNG...
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export function dispatchPrintLabelDialog(data: LabelDialogData) {
  window.dispatchEvent(new CustomEvent(PRINT_EVENT, { detail: data }));
}

function drawLabelCanvas(
  ctx: CanvasRenderingContext2D,
  data: LabelDialogData,
  barcodeImage: HTMLImageElement,
  qrImage: HTMLImageElement,
) {
  const companyName = data.companyName || 'نساجی زنبق';
  const formattedDate = data.createdAt
    ? new Date(data.createdAt).toLocaleString('fa-IR')
    : '-';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 14;
  roundedRect(ctx, 14, 14, CANVAS_SIZE - 28, CANVAS_SIZE - 28, 18);
  ctx.stroke();

  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  ctx.fillStyle = '#111111';

  drawText(ctx, companyName, 730, 72, 42, 680, 700, 'right');

  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(70, 122);
  ctx.lineTo(730, 122);
  ctx.stroke();

  const infoRows = [
    `نام کالا: ${data.productName}`,
    `وزن ناخالص: ${formatNumber(data.grossWeight)} ${data.unit}`,
    `وزن خالص: ${formatNumber(data.netWeight)} ${data.unit}`,
  ];

  ctx.font = canvasFont(42, 900);
  infoRows.forEach((row, index) => {
    drawText(ctx, row, 730, 200 + index * 78, 42, 690, 900, 'right');
  });

  ctx.strokeStyle = '#c7c7c7';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(70, 445);
  ctx.lineTo(730, 445);
  ctx.stroke();

  // Barcode sits on the left of the QR code, as requested.
  drawImageContained(ctx, barcodeImage, 58, 492, 425, 170);
  drawImageContained(ctx, qrImage, 520, 470, 210, 210);

  ctx.strokeStyle = '#c7c7c7';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(70, 704);
  ctx.lineTo(730, 704);
  ctx.stroke();

  ctx.direction = 'ltr';
  drawText(ctx, formattedDate, CANVAS_SIZE / 2, 748, 34, 690, 900, 'center');
}

function drawText(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  fontSize: number,
  maxWidth: number,
  weight: number,
  align: CanvasTextAlign,
) {
  let size = fontSize;
  ctx.textAlign = align;
  ctx.font = canvasFont(size, weight);

  while (ctx.measureText(value).width > maxWidth && size > 22) {
    size -= 2;
    ctx.font = canvasFont(size, weight);
  }

  ctx.fillText(value, x, y, maxWidth);
}

function canvasFont(size: number, weight: number) {
  return `${weight} ${size}px Vazirmatn`;
}

function drawImageContained(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  ctx.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function svgElementToImage(element: SVGSVGElement | null): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!element) {
      reject(new Error('Label asset was not rendered.'));
      return;
    }

    const svg = element.cloneNode(true) as SVGSVGElement;
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' }),
    );
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load label asset.'));
    };
    image.src = url;
  });
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? value.toLocaleString('fa-IR') : '-';
}

function addPngPhysicalSize(dataUrl: string) {
  const prefix = 'data:image/png;base64,';
  if (!dataUrl.startsWith(prefix)) return dataUrl;

  const bytes = Uint8Array.from(atob(dataUrl.slice(prefix.length)), (char) => char.charCodeAt(0));
  const pngSignatureLength = 8;
  const ihdrChunkLength = 25;
  const insertAt = pngSignatureLength + ihdrChunkLength;

  if (bytes.length < insertAt) return dataUrl;

  const chunkType = new TextEncoder().encode('pHYs');
  const chunkData = new Uint8Array(9);
  writeUInt32(chunkData, 0, PNG_PIXELS_PER_METER);
  writeUInt32(chunkData, 4, PNG_PIXELS_PER_METER);
  chunkData[8] = 1;

  const crcInput = new Uint8Array(chunkType.length + chunkData.length);
  crcInput.set(chunkType, 0);
  crcInput.set(chunkData, chunkType.length);

  const chunk = new Uint8Array(4 + chunkType.length + chunkData.length + 4);
  writeUInt32(chunk, 0, chunkData.length);
  chunk.set(chunkType, 4);
  chunk.set(chunkData, 8);
  writeUInt32(chunk, 17, crc32(crcInput));

  const output = new Uint8Array(bytes.length + chunk.length);
  output.set(bytes.slice(0, insertAt), 0);
  output.set(chunk, insertAt);
  output.set(bytes.slice(insertAt), insertAt + chunk.length);

  let binary = '';
  const batchSize = 0x8000;
  for (let index = 0; index < output.length; index += batchSize) {
    binary += String.fromCharCode(...output.slice(index, index + batchSize));
  }

  return `${prefix}${btoa(binary)}`;
}

function writeUInt32(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}
