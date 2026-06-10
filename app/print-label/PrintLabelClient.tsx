'use client';

import PrintLabelDialog from '@/components/PrintLabelDialog';

export default function PrintLabelClient() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f1e8] p-6 text-center" dir="rtl">
      <div className="space-y-4 rounded-3xl border border-stone-300 bg-white p-8 shadow-sm">
        <p className="text-lg font-bold text-stone-700">برای چاپ لیبل از دکمه چاپ داخل همان صفحه استفاده کنید.</p>
        <button
          onClick={() => window.history.back()}
          className="rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
        >
          بازگشت
        </button>
      </div>
      <PrintLabelDialog />
    </main>
  );
}
