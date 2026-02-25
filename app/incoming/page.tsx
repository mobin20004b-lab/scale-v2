'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { Scale, PackagePlus, Printer, CheckCircle2 } from 'lucide-react';
import QRCode from 'react-qr-code';
import Barcode from 'react-barcode';

export default function IncomingGoods() {
  const { scales, updateScaleWeight, addInventoryItem } = useStore();
  const [selectedScaleId, setSelectedScaleId] = useState<string>(scales[0]?.id || '');
  const [goodsType, setGoodsType] = useState('');
  const [isStable, setIsStable] = useState(false);
  const [registeredItem, setRegisteredItem] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const selectedScale = scales.find(s => s.id === selectedScaleId);

  // Simulate real-time weight updates
  useEffect(() => {
    if (!selectedScaleId) return;
    
    const interval = setInterval(() => {
      // Randomly fluctuate weight to simulate real scale
      const fluctuation = (Math.random() - 0.5) * 2;
      const baseWeight = 1250; // Mock base weight
      const newWeight = Math.max(0, baseWeight + fluctuation);
      
      updateScaleWeight(selectedScaleId, Number(newWeight.toFixed(2)));
      
      // Simulate stability (if fluctuation is small)
      setIsStable(Math.abs(fluctuation) < 0.5);
    }, 500);

    return () => clearInterval(interval);
  }, [selectedScaleId, updateScaleWeight]);

  const handleRegister = () => {
    if (!selectedScale || !goodsType) return;
    
    const item = addInventoryItem({
      type: goodsType,
      weight: selectedScale.currentWeight,
      warehouseId: selectedScale.warehouseId,
    });
    
    setRegisteredItem(item);
    setGoodsType('');
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html lang="fa" dir="rtl">
          <head>
            <title>چاپ برچسب</title>
            <style>
              body { font-family: Tahoma, system-ui, sans-serif; padding: 20px; }
              .label { border: 2px solid #000; padding: 20px; max-width: 400px; margin: 0 auto; text-align: center; }
              .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
              .detail { font-size: 18px; margin: 5px 0; }
              .qr-container { margin: 20px auto; display: flex; justify-content: center; }
              .barcode-container { margin: 20px auto; display: flex; justify-content: center; }
            </style>
          </head>
          <body>
            ${printContent}
            <script>
              window.onload = () => {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">ورود کالا</h1>
        <p className="text-muted-foreground mt-1">وزن‌کشی و ثبت موجودی جدید.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Registration Form */}
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              انتخاب ترازو
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  ترازوی فعال
                </label>
                <select 
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                  value={selectedScaleId}
                  onChange={(e) => setSelectedScaleId(e.target.value)}
                >
                  {scales.map(scale => (
                    <option key={scale.id} value={scale.id}>{scale.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4">
                <div className="bg-secondary/30 rounded-2xl p-6 text-center border border-secondary">
                  <div className="text-sm font-medium text-muted-foreground mb-2">وزن فعلی</div>
                  <div className="text-5xl font-mono font-bold text-primary tracking-tight" dir="ltr">
                    {selectedScale?.currentWeight.toFixed(2)} <span className="text-2xl text-muted-foreground">kg</span>
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${isStable ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                    <span className="text-sm font-medium text-muted-foreground">
                      {isStable ? 'پایدار' : 'در حال خواندن...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-primary" />
              جزئیات کالا
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  نوع کالا
                </label>
                <input 
                  type="text"
                  placeholder="مثال: سیب ارگانیک"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                  value={goodsType}
                  onChange={(e) => setGoodsType(e.target.value)}
                />
              </div>

              <button
                onClick={handleRegister}
                disabled={!goodsType || !isStable || selectedScale?.currentWeight === 0}
                className="w-full bg-primary text-primary-foreground font-medium rounded-xl px-4 py-4 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                تایید و ثبت ورود
              </button>
            </div>
          </div>
        </div>

        {/* Label Preview */}
        <div>
          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm sticky top-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">پیش‌نمایش برچسب</h2>
              {registeredItem && (
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 bg-primary/10 px-4 py-2 rounded-lg transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  چاپ برچسب
                </button>
              )}
            </div>

            {registeredItem ? (
              <div className="bg-white text-black p-8 rounded-2xl border-2 border-dashed border-gray-300">
                <div ref={printRef} className="label">
                  <div className="text-center border-b-2 border-black pb-4 mb-4">
                    <div className="title text-2xl font-bold uppercase tracking-wider">گرین‌استاک</div>
                    <div className="text-sm text-gray-600">برچسب ورود</div>
                  </div>
                  
                  <div className="space-y-2 text-right mb-6">
                    <div className="flex justify-between">
                      <span className="font-semibold">شناسه:</span>
                      <span className="font-mono" dir="ltr">{registeredItem.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">نوع:</span>
                      <span>{registeredItem.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">وزن:</span>
                      <span className="font-mono font-bold text-lg" dir="ltr">{registeredItem.weight.toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">تاریخ:</span>
                      <span dir="ltr">{new Date(registeredItem.date).toLocaleDateString('fa-IR')}</span>
                    </div>
                  </div>

                  <div className="qr-container flex justify-center mb-4">
                    <QRCode value={registeredItem.id} size={120} />
                  </div>
                  
                  <div className="barcode-container flex justify-center">
                    <Barcode value={registeredItem.id} width={2} height={50} displayValue={false} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[400px] border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-muted-foreground bg-secondary/20">
                <Printer className="w-12 h-12 mb-4 opacity-20" />
                <p>برای ایجاد برچسب، یک کالا ثبت کنید</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
