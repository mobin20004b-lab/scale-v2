'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { PackageMinus, Camera, Search, CheckCircle2, AlertCircle } from 'lucide-react';

export default function OutgoingGoods() {
  const { inventory, removeInventoryItem } = useStore();
  const [scannedCode, setScannedCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const item = inventory.find(i => i.id === scannedCode);

  useEffect(() => {
    if (isScanning) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        (decodedText) => {
          setScannedCode(decodedText);
          setIsScanning(false);
          scanner.clear();
        },
        (error) => {
          // Ignore scanning errors as they happen constantly until a code is found
        }
      );

      return () => {
        scanner.clear().catch(console.error);
      };
    }
  }, [isScanning]);

  const handleRemove = () => {
    if (!item) return;
    
    if (item.status === 'removed') {
      setError('این کالا قبلاً از انبار خارج شده است.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    removeInventoryItem(item.id);
    setSuccess(`کالای ${item.type} (${item.weight} کیلوگرم) با موفقیت از انبار خارج شد.`);
    setScannedCode('');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">خروج کالا</h1>
        <p className="text-muted-foreground mt-1">برای خروج کالا از انبار، بارکد یا کد QR را اسکن کنید.</p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 text-emerald-600 px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          {success}
        </div>
      )}

      <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="شناسه بارکد را وارد یا اسکن کنید..."
              className="w-full bg-background border border-border rounded-xl pr-12 pl-4 py-4 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow font-mono text-left"
              dir="ltr"
              value={scannedCode}
              onChange={(e) => setScannedCode(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsScanning(!isScanning)}
            className={`px-6 rounded-xl font-medium flex items-center gap-2 transition-colors ${
              isScanning 
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' 
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            <Camera className="w-5 h-5" />
            {isScanning ? 'لغو' : 'اسکن'}
          </button>
        </div>

        {isScanning && (
          <div className="rounded-2xl overflow-hidden border-2 border-primary">
            <div id="reader" className="w-full"></div>
          </div>
        )}

        {item && (
          <div className="mt-8 pt-8 border-t border-border">
            <h3 className="text-lg font-semibold mb-4">جزئیات کالا</h3>
            <div className="bg-secondary/30 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">شناسه</span>
                <span className="font-mono font-medium" dir="ltr">{item.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">نوع</span>
                <span className="font-medium">{item.type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">وزن</span>
                <span className="font-mono font-bold text-lg text-primary" dir="ltr">{item.weight.toFixed(2)} kg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">وضعیت</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  item.status === 'in_stock' 
                    ? 'bg-emerald-500/20 text-emerald-700' 
                    : 'bg-destructive/20 text-destructive'
                }`}>
                  {item.status === 'in_stock' ? 'موجود در انبار' : 'خارج شده'}
                </span>
              </div>
            </div>

            <button
              onClick={handleRemove}
              disabled={item.status === 'removed'}
              className="w-full mt-6 bg-primary text-primary-foreground font-medium rounded-xl px-4 py-4 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <PackageMinus className="w-5 h-5" />
              تایید خروج
            </button>
          </div>
        )}

        {!item && scannedCode && !isScanning && (
          <div className="mt-8 pt-8 border-t border-border text-center text-muted-foreground">
            هیچ کالایی با شناسه <span className="font-mono font-medium text-foreground" dir="ltr">{scannedCode}</span> یافت نشد
          </div>
        )}
      </div>
    </div>
  );
}
