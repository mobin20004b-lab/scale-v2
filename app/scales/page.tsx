'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Scale,
  Warehouse,
} from 'lucide-react';

type ScaleDevice = {
  id: string;
  name: string;
  model: string;
  apiKey: string;
  unit: string;
  precision: number;
  heartbeat: number;
  warehouseId: string;
  warehouse?: { name: string };
};

type WarehouseOption = { id: string; name: string };

const makeToken = () => `sk_live_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;

export default function ScalesPage() {
  const [scales, setScales] = useState<ScaleDevice[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);

  const [name, setName] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [model, setModel] = useState('ESP32-WROOM-32');
  const [newScaleUnit, setNewScaleUnit] = useState('kg');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rotatingId, setRotatingId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [visibleTokenId, setVisibleTokenId] = useState<string | null>(null);
  const [unitDraftById, setUnitDraftById] = useState<Record<string, string>>({});
  const [updatingUnitId, setUpdatingUnitId] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const showTemporaryMessage = (type: 'error' | 'success', message: string) => {
    if (type === 'error') {
      setError(message);
      setSuccess('');
      setTimeout(() => setError(''), 3500);
      return;
    }

    setSuccess(message);
    setError('');
    setTimeout(() => setSuccess(''), 2500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [scalesRes, warehousesRes] = await Promise.all([fetch('/api/scales'), fetch('/api/warehouses')]);

      if (!scalesRes.ok || !warehousesRes.ok) {
        showTemporaryMessage('error', 'بارگیری اطلاعات ترازوها انجام نشد.');
        return;
      }

      const [scalesData, warehouseData]: [ScaleDevice[], WarehouseOption[]] = await Promise.all([
        scalesRes.json(),
        warehousesRes.json(),
      ]);

      setScales(scalesData);
      setUnitDraftById(
        Object.fromEntries(scalesData.map((scale) => [scale.id, scale.unit || 'kg']))
      );
      setWarehouses(warehouseData);
      if (!warehouseId) setWarehouseId(warehouseData[0]?.id ?? '');
    } catch (err) {
      console.error('Failed to load scales', err);
      showTemporaryMessage('error', 'خطای شبکه در دریافت اطلاعات ترازوها.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addScale = async () => {
    if (!name.trim()) {
      showTemporaryMessage('error', 'نام ترازو را وارد کنید.');
      return;
    }

    if (!warehouseId) {
      showTemporaryMessage('error', 'ابتدا یک انبار انتخاب کنید.');
      return;
    }

    setSaving(true);
    try {
      const token = makeToken();
      const res = await fetch('/api/scales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          model: model.trim(),
          warehouseId,
          apiKey: token,
          unit: newScaleUnit,
          precision: 2,
          heartbeat: 30,
        }),
      });

      if (!res.ok) {
        showTemporaryMessage('error', 'ایجاد ترازو با خطا مواجه شد.');
        return;
      }

      setName('');
      setModel('ESP32-WROOM-32');
      setNewScaleUnit('kg');
      await load();
      showTemporaryMessage('success', 'ترازوی جدید با موفقیت ایجاد شد.');
    } catch (err) {
      console.error('Failed to create scale', err);
      showTemporaryMessage('error', 'خطای شبکه در ایجاد ترازو.');
    } finally {
      setSaving(false);
    }
  };

  const rotateToken = async (id: string) => {
    setRotatingId(id);
    try {
      const res = await fetch(`/api/scales/${id}/rotate-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: makeToken() }),
      });

      if (!res.ok) {
        showTemporaryMessage('error', 'چرخش توکن انجام نشد.');
        return;
      }

      await load();
      showTemporaryMessage('success', 'توکن API با موفقیت تولید شد.');
    } catch (err) {
      console.error('Failed to rotate token', err);
      showTemporaryMessage('error', 'خطای شبکه در تولید مجدد توکن.');
    } finally {
      setRotatingId(null);
    }
  };

  const updateScaleUnit = async (id: string) => {
    const nextUnit = unitDraftById[id];
    if (!nextUnit) return;

    setUpdatingUnitId(id);
    try {
      const res = await fetch(`/api/scales/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unit: nextUnit }),
      });

      if (!res.ok) {
        showTemporaryMessage('error', 'بروزرسانی واحد ترازو انجام نشد.');
        return;
      }

      await load();
      showTemporaryMessage('success', 'واحد ترازو با موفقیت بروزرسانی شد.');
    } catch (err) {
      console.error('Failed to update scale unit', err);
      showTemporaryMessage('error', 'خطای شبکه در بروزرسانی واحد ترازو.');
    } finally {
      setUpdatingUnitId(null);
    }
  };

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showTemporaryMessage('success', `${label} کپی شد.`);
    } catch (err) {
      console.error('Failed to copy', err);
      showTemporaryMessage('error', `امکان کپی ${label} وجود ندارد.`);
    }
  };

  const filteredScales = useMemo(() => {
    return scales.filter((scale) => {
      const matchesWarehouse = warehouseFilter === 'all' || scale.warehouseId === warehouseFilter;
      const q = searchTerm.trim();
      const matchesQuery =
        !q ||
        scale.name.includes(q) ||
        scale.model.includes(q) ||
        scale.id.includes(q) ||
        scale.warehouse?.name?.includes(q);

      return matchesWarehouse && matchesQuery;
    });
  }, [scales, warehouseFilter, searchTerm]);

  const modelCount = useMemo(() => new Set(scales.map((s) => s.model)).size, [scales]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-gradient-to-br from-primary/10 via-card to-card border border-border rounded-3xl p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Scale className="w-8 h-8 text-primary" />
              مدیریت ترازوها
            </h1>
            <p className="text-muted-foreground mt-2">ثبت، پایش و مدیریت امن API Token ترازوهای متصل به انبار.</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="rounded-xl border border-border bg-background px-4 py-2 text-sm hover:bg-accent transition-colors inline-flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} بروزرسانی
          </button>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mt-5">
          <div className="rounded-2xl bg-background/80 border border-border p-4">
            <p className="text-sm text-muted-foreground">تعداد کل ترازوها</p>
            <p className="text-2xl font-semibold mt-1">{scales.length}</p>
          </div>
          <div className="rounded-2xl bg-background/80 border border-border p-4">
            <p className="text-sm text-muted-foreground">انبارهای فعال</p>
            <p className="text-2xl font-semibold mt-1">{new Set(scales.map((s) => s.warehouseId)).size}</p>
          </div>
          <div className="rounded-2xl bg-background/80 border border-border p-4">
            <p className="text-sm text-muted-foreground">مدل‌های ثبت‌شده</p>
            <p className="text-2xl font-semibold mt-1">{modelCount}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          {success}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Plus className="w-5 h-5 text-primary" /> افزودن ترازو
        </div>
        <div className="grid md:grid-cols-4 gap-3">
          <input
            className="border border-border rounded-xl p-2.5 bg-background"
            placeholder="نام ترازو"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="border border-border rounded-xl p-2.5 bg-background"
            placeholder="مدل"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
          <select
            className="border border-border rounded-xl p-2.5 bg-background"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          >
            {warehouses.length === 0 && <option value="">بدون انبار</option>}
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <select
            className="border border-border rounded-xl p-2.5 bg-background"
            value={newScaleUnit}
            onChange={(e) => setNewScaleUnit(e.target.value)}
          >
            <option value="kg">kg</option>
            <option value="g">g</option>
          </select>
        </div>
        <button
          onClick={addScale}
          disabled={saving || warehouses.length === 0}
          className="bg-primary text-primary-foreground rounded-xl px-4 py-2.5 inline-flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          ایجاد + تولید توکن
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 md:p-5">
        <div className="grid md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full border border-border rounded-xl py-2.5 pl-9 pr-3 bg-background"
              placeholder="جستجو بر اساس نام، مدل، شناسه یا انبار"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="border border-border rounded-xl p-2.5 bg-background"
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
          >
            <option value="all">همه انبارها</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {filteredScales.map((scale) => {
          const sampleWeight = scale.unit === 'kg' ? '55.29' : '55290';
          const curlCommand = `curl -X POST $BASE/api/v1/scales/any-id/weight \\\n  -H \"Authorization: Bearer ${scale.apiKey}\" \\\n  -H \"Content-Type: text/plain\" \\\n  -d '${sampleWeight}'`;

          return (
            <div key={scale.id} className="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-lg">{scale.name}</p>
                  <p className="text-sm text-muted-foreground">مدل: {scale.model}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground inline-flex items-center gap-1">
                  <Warehouse className="w-3 h-3" /> {scale.warehouse?.name ?? scale.warehouseId}
                </span>
              </div>

              <div className="rounded-xl border border-border bg-background p-3 space-y-2">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">واحد وزن ترازو</p>
                  <div className="flex items-center gap-2">
                    <select
                      className="text-xs rounded-lg border border-border bg-background px-2.5 py-1.5"
                      value={unitDraftById[scale.id] ?? scale.unit}
                      onChange={(e) =>
                        setUnitDraftById((prev) => ({ ...prev, [scale.id]: e.target.value }))
                      }
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                    </select>
                    <button
                      onClick={() => updateScaleUnit(scale.id)}
                      disabled={updatingUnitId === scale.id || (unitDraftById[scale.id] ?? scale.unit) === scale.unit}
                      className="text-xs rounded-lg border border-border px-2.5 py-1.5 hover:bg-accent disabled:opacity-50"
                    >
                      {updatingUnitId === scale.id ? 'در حال ذخیره...' : 'ذخیره واحد'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">API Token</p>
                  <button
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                    onClick={() => setVisibleTokenId(visibleTokenId === scale.id ? null : scale.id)}
                  >
                    {visibleTokenId === scale.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {visibleTokenId === scale.id ? 'مخفی' : 'نمایش'}
                  </button>
                </div>
                <p className="text-xs font-mono break-all" dir="ltr">
                  {visibleTokenId === scale.id ? scale.apiKey : `${scale.apiKey.slice(0, 10)}••••••••••••••`}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyText(scale.apiKey, 'توکن')}
                    className="text-xs rounded-lg border border-border px-2.5 py-1.5 hover:bg-accent inline-flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" /> کپی توکن
                  </button>
                  <button
                    onClick={() => rotateToken(scale.id)}
                    disabled={rotatingId === scale.id}
                    className="text-xs rounded-lg bg-secondary px-2.5 py-1.5 hover:bg-secondary/80 inline-flex items-center gap-1 disabled:opacity-60"
                  >
                    {rotatingId === scale.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} تولید مجدد
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-secondary/30 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">نمونه ارسال وزن (شناسه مسیر دلخواه است)</p>
                  <button
                    onClick={() => copyText(curlCommand, 'دستور cURL')}
                    className="text-xs rounded-lg border border-border px-2 py-1 hover:bg-background inline-flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> کپی
                  </button>
                </div>
                <pre className="text-xs overflow-auto" dir="ltr">
                  {curlCommand}
                </pre>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && filteredScales.length === 0 && (
        <div className="text-center py-12 border border-dashed border-border rounded-2xl bg-card">
          <p className="font-medium">موردی یافت نشد</p>
          <p className="text-sm text-muted-foreground mt-1">فیلترها را تغییر دهید یا یک ترازو جدید اضافه کنید.</p>
        </div>
      )}
    </div>
  );
}
