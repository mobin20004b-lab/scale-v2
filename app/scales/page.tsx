'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { Scale, Plus, Activity, Key, Server, Clock, CheckCircle2, XCircle, Terminal, RefreshCw, Copy, Settings2, HeartPulse } from 'lucide-react';

export default function ScalesManagement() {
  const { scales, warehouses, addScale, regenerateApiKey, updateScaleConfig } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newScaleName, setNewScaleName] = useState('');
  const [newScaleModel, setNewScaleModel] = useState('ESP32-WROOM-32');
  const [newScaleWarehouseId, setNewScaleWarehouseId] = useState(warehouses[0]?.id || '');
  const [selectedScaleForCurl, setSelectedScaleForCurl] = useState<string | null>(null);

  const handleAddScale = () => {
    if (!newScaleName || !newScaleWarehouseId) return;

    addScale({
      name: newScaleName,
      model: newScaleModel,
      warehouseId: newScaleWarehouseId,
      apiKey: `temp_${Date.now()}`,
      unit: 'kg',
      precision: 2,
      heartbeatSec: 15,
      firmwareVersion: '1.0.0',
    });

    setNewScaleName('');
    setIsAdding(false);
  };

  const warehouseNameMap = useMemo(
    () => Object.fromEntries(warehouses.map((warehouse) => [warehouse.id, warehouse.name])),
    [warehouses],
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">مدیریت ترازوها</h1>
          <p className="text-muted-foreground mt-1">مدیریت ناوگان ترازو، توکن API و تنظیمات دستگاه‌های ESP32.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-primary text-primary-foreground font-medium rounded-xl px-4 py-2 hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          افزودن ترازو
        </button>
      </div>

      {isAdding && (
        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-4">
          <h2 className="text-xl font-semibold mb-4">افزودن ترازوی جدید</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">نام ترازو</label>
              <input
                type="text"
                placeholder="مثال: سکوی بارگیری ۳"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                value={newScaleName}
                onChange={(e) => setNewScaleName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">مدل سخت‌افزار</label>
              <select
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                value={newScaleModel}
                onChange={(e) => setNewScaleModel(e.target.value)}
              >
                <option value="ESP32-WROOM-32">ESP32-WROOM-32</option>
                <option value="ESP32-S3">ESP32-S3</option>
                <option value="ESP8266">ESP8266</option>
                <option value="Custom">سفارشی</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">انبار</label>
              <select
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                value={newScaleWarehouseId}
                onChange={(e) => setNewScaleWarehouseId(e.target.value)}
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>{wh.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 rounded-xl font-medium text-muted-foreground hover:bg-secondary transition-colors"
            >
              لغو
            </button>
            <button
              onClick={handleAddScale}
              disabled={!newScaleName || !newScaleWarehouseId}
              className="bg-primary text-primary-foreground font-medium rounded-xl px-4 py-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              ایجاد ترازو و توکن
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {scales.map((scale) => (
          <div key={scale.id} className="bg-card p-6 rounded-3xl border border-border shadow-sm flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${scale.status === 'online' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'}`}>
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{scale.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    {scale.status === 'online' ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <XCircle className="w-3 h-3 text-destructive" />
                    )}
                    {scale.status === 'online' ? 'آنلاین' : 'آفلاین'}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 flex-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <Server className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">مدل:</span>
                </div>
                <span className="font-medium" dir="ltr">{scale.model}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">زمان فعالیت:</span>
                </div>
                <span className="font-medium">{scale.uptime}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">وزن:</span>
                </div>
                <span className="font-mono font-bold text-primary" dir="ltr">{scale.currentWeight.toFixed(scale.precision)} {scale.unit}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <HeartPulse className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">سلامت سیگنال:</span>
                </div>
                <span className={scale.signal === 'fresh' ? 'text-emerald-600 font-medium' : 'text-destructive font-medium'}>
                  {scale.signal === 'fresh' ? 'به‌روز' : 'قدیمی'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">انبار مقصد:</span>
                <span className="font-medium">{warehouseNameMap[scale.warehouseId] ?? 'نامشخص'}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Key className="w-4 h-4" />
                    توکن API اختصاصی
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const token = regenerateApiKey(scale.id);
                        if (token) navigator.clipboard.writeText(token);
                      }}
                      className="text-xs font-medium text-muted-foreground hover:text-primary flex items-center gap-1"
                      title="تولید و کپی توکن جدید"
                    >
                      <RefreshCw className="w-3 h-3" />
                      بازتولید
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(scale.apiKey)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      کپی
                    </button>
                  </div>
                </div>
                <div className="bg-secondary/50 p-3 rounded-xl font-mono text-xs text-secondary-foreground break-all text-left" dir="ltr">
                  {scale.apiKey}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <label className="space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1"><Settings2 className="w-3.5 h-3.5" /> واحد</span>
                  <select
                    value={scale.unit}
                    onChange={(e) => updateScaleConfig(scale.id, { unit: e.target.value as 'kg' | 'g' | 'ton' })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2"
                  >
                    <option value="kg">کیلوگرم</option>
                    <option value="g">گرم</option>
                    <option value="ton">تن</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-muted-foreground">دقت</span>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={scale.precision}
                    onChange={(e) => updateScaleConfig(scale.id, { precision: Number(e.target.value) || 0 })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-muted-foreground">Heartbeat (ثانیه)</span>
                  <input
                    type="number"
                    min={5}
                    value={scale.heartbeatSec}
                    onChange={(e) => updateScaleConfig(scale.id, { heartbeatSec: Number(e.target.value) || 5 })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-muted-foreground">نسخه Firmware</span>
                  <input
                    type="text"
                    dir="ltr"
                    value={scale.firmwareVersion}
                    onChange={(e) => updateScaleConfig(scale.id, { firmwareVersion: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2"
                  />
                </label>
              </div>

              <div>
                <button
                  onClick={() => setSelectedScaleForCurl(selectedScaleForCurl === scale.id ? null : scale.id)}
                  className="w-full flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-secondary/30 hover:bg-secondary/50 py-2 rounded-xl transition-colors"
                >
                  <Terminal className="w-4 h-4" />
                  نمونه‌های cURL برای دستگاه
                </button>

                {selectedScaleForCurl === scale.id && (
                  <div className="mt-2 space-y-2">
                    <div className="bg-zinc-900 text-zinc-300 p-4 rounded-xl font-mono text-xs overflow-x-auto text-left" dir="ltr">
                      <div className="mb-2 text-zinc-400"># ارسال وزن لحظه‌ای</div>
                      <pre>{`curl -X POST https://your-domain.com/api/v1/scales/${scale.id}/weight \\
  -H "Authorization: Bearer ${scale.apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"weight":1250.50,"unit":"${scale.unit}","uptime":"14d 2h 45m"}'`}</pre>
                    </div>
                    <div className="bg-zinc-900 text-zinc-300 p-4 rounded-xl font-mono text-xs overflow-x-auto text-left" dir="ltr">
                      <div className="mb-2 text-zinc-400"># دریافت پیکربندی دستگاه</div>
                      <pre>{`curl -X GET https://your-domain.com/api/scales/${scale.id} \\
  -H "Authorization: Bearer ${scale.apiKey}"`}</pre>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(scale.apiKey)}
                      className="w-full text-xs py-2 border rounded-xl border-border hover:bg-secondary flex items-center justify-center gap-2"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      کپی سریع توکن برای ترمینال
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
