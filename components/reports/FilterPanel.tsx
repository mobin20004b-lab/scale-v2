'use client';

import { useState } from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import JalaliDateRange from './JalaliDateRange';

export type FilterValues = {
  startDate: string;
  endDate: string;
  customerId: string | null;
  warehouseId: string | null;
  productId: string | null;
  operatorId: string | null;
};

type FilterPanelProps = {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onReset: () => void;
};

const DATE_PRESETS = [
  { key: '7d', label: '۷ روز' },
  { key: '30d', label: '۳۰ روز' },
  { key: '90d', label: '۳ ماه' },
  { key: 'year', label: 'ابتدای سال' },
  { key: 'custom', label: 'دلخواه' },
] as const;

function getDateRange(key: string): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now);
  if (key === '7d') start.setDate(now.getDate() - 7);
  else if (key === '30d') start.setDate(now.getDate() - 30);
  else if (key === '90d') start.setDate(now.getDate() - 90);
  else if (key === 'year') start.setMonth(0, 1);
  else return { startDate: '', endDate: '' };
  return { startDate: start.toISOString(), endDate: now.toISOString() };
}

export default function FilterPanel({ values, onChange, onReset }: FilterPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activePreset, setActivePreset] = useState('7d');

  const activeCount = [values.customerId, values.warehouseId, values.productId, values.operatorId]
    .filter(Boolean).length;

  const handlePreset = (key: string) => {
    setActivePreset(key);
    if (key === 'custom') {
      onChange({ ...values, startDate: '', endDate: '' });
    } else {
      const range = getDateRange(key);
      onChange({ ...values, ...range });
    }
  };

  const handleDateChange = (start: string, end: string) => {
    setActivePreset('custom');
    onChange({ ...values, startDate: start, endDate: end });
  };

  const update = (partial: Partial<FilterValues>) => {
    onChange({ ...values, ...partial });
  };

  return (
    <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 md:p-5 text-sm font-medium hover:bg-secondary/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <span>فیلترها</span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary text-primary-foreground text-xs px-1.5">
              {activeCount}
            </span>
          )}
        </div>
        <span className="text-muted-foreground">{collapsed ? '▼' : '▲'}</span>
      </button>

      {!collapsed && (
        <div className="px-4 md:px-5 pb-5 space-y-4">
          {/* Date presets */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">محدوده زمانی</label>
            <div className="flex flex-wrap gap-1.5">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => handlePreset(p.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activePreset === p.key
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Jalali date range (visible on custom) */}
          {activePreset === 'custom' && (
            <JalaliDateRange
              startDate={values.startDate}
              endDate={values.endDate}
              onChange={handleDateChange}
            />
          )}

          {/* Filter grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <SearchableSelect
              label="مشتری"
              placeholder="همه مشتریان"
              value={values.customerId}
              onChange={(v) => update({ customerId: v })}
              fetchOptions={async (q) => {
                const res = await fetch(`/api/customers?search=${encodeURIComponent(q)}`);
                if (!res.ok) return [];
                const data = await res.json();
                return data.map((c: { id: string; name: string }) => ({ value: c.id, label: c.name }));
              }}
            />

            <SearchableSelect
              label="انبار"
              placeholder="همه انبارها"
              value={values.warehouseId}
              onChange={(v) => update({ warehouseId: v })}
              fetchOptions={async (q) => {
                const res = await fetch(`/api/warehouses?search=${encodeURIComponent(q)}`);
                if (!res.ok) return [];
                const data = await res.json();
                return data.map((w: { id: string; name: string }) => ({ value: w.id, label: w.name }));
              }}
            />

            <SearchableSelect
              label="محصول"
              placeholder="همه محصولات"
              value={values.productId}
              onChange={(v) => update({ productId: v })}
              fetchOptions={async (q) => {
                const res = await fetch(`/api/products?search=${encodeURIComponent(q)}`);
                if (!res.ok) return [];
                const data = await res.json();
                return data.map((p: { id: string; name: string }) => ({ value: p.id, label: p.name }));
              }}
            />

            <SearchableSelect
              label="اپراتور"
              placeholder="همه اپراتورها"
              value={values.operatorId}
              onChange={(v) => update({ operatorId: v })}
              fetchOptions={async (q) => {
                const res = await fetch(`/api/users?search=${encodeURIComponent(q)}`);
                if (!res.ok) return [];
                const data = await res.json();
                return data.map((u: { id: string; name?: string; username?: string }) => ({
                  value: u.id,
                  label: u.name || u.username || u.id,
                }));
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              پاک کردن فیلترها
            </button>
          </div>
        </div>
      )}
    </div>
  );
}