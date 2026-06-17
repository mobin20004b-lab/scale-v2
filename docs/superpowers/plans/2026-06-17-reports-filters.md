# Reports Filter System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add comprehensive server-side filters to the reports page — customer, Jalali date range, warehouse, product, operator — with a clean filter panel UI using `date-fns-jalali`.

**Architecture:** All filters sent as API query params; Prisma builds dynamic WHERE clause server-side; results include filtered totals and pagination. Three new components: `SearchableSelect`, `JalaliDateRange`, `FilterPanel`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma 7, date-fns-jalali v4, Tailwind CSS 4, Lucide icons

---

### Task 1: Create SearchableSelect component

**Files:**
- Create: `components/reports/SearchableSelect.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, ChevronDown, Loader2 } from 'lucide-react';

type Option = { value: string; label: string };

type SearchableSelectProps = {
  label: string;
  placeholder?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  fetchOptions: (query: string) => Promise<Option[]>;
  emptyMessage?: string;
};

export default function SearchableSelect({
  label,
  placeholder = 'جستجو...',
  value,
  onChange,
  fetchOptions,
  emptyMessage = 'موردی یافت نشد',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const doFetch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const result = await fetchOptions(q);
      setOptions(result);
    } finally {
      setLoading(false);
    }
  }, [fetchOptions]);

  useEffect(() => {
    if (open) {
      doFetch('');
    }
  }, [open, doFetch]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!open) return;
    debounceRef.current = setTimeout(() => doFetch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, open, doFetch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectOption = (option: Option) => {
    setSelectedLabel(option.label);
    onChange(option.value);
    setOpen(false);
    setQuery('');
  };

  const clearValue = () => {
    setSelectedLabel(null);
    onChange(null);
    setQuery('');
    setOpen(false);
  };

  const selected = value !== null && value !== '';

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 h-10 w-full rounded-[var(--radius-input)] border border-input bg-background px-3 py-2 text-sm cursor-pointer"
      >
        {selected ? (
          <span className="flex-1 truncate">{selectedLabel}</span>
        ) : (
          <span className="flex-1 text-muted-foreground/80">{placeholder}</span>
        )}
        {selected && (
          <button onClick={(e) => { e.stopPropagation(); clearValue(); }} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-card shadow-overlay overflow-hidden">
          <div className="relative border-b border-border">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو..."
              className="w-full border-0 bg-transparent px-3 pr-9 py-2.5 text-sm outline-none"
              dir="rtl"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                در حال جستجو...
              </div>
            ) : options.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">{emptyMessage}</div>
            ) : (
              options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => selectOption(opt)}
                  className={`w-full text-right px-3 py-2.5 text-sm hover:bg-secondary/40 transition-colors ${value === opt.value ? 'bg-primary/10 text-primary font-medium' : ''}`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript validity**

Run: `npx tsc --noEmit --strict components/reports/SearchableSelect.tsx`
Expected: No type errors

---

### Task 2: Create JalaliDateRange component

**Files:**
- Create: `components/reports/JalaliDateRange.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';

type JalaliDateRangeProps = {
  startDate: string;   // Gregorian ISO string or ''
  endDate: string;     // Gregorian ISO string or ''
  onChange: (start: string, end: string) => void;
};

function gregorianToJalaliInput(date: Date): string {
  try {
    const { format } = require('date-fns-jalali');
    return format(date, 'yyyy/MM/dd');
  } catch {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  }
}

function jalaliInputToGregorian(input: string): Date | null {
  try {
    const { parse } = require('date-fns-jalali');
    const parsed = parse(input, 'yyyy/MM/dd', new Date());
    if (isNaN(parsed.getTime())) return null;
    return parsed;
  } catch {
    return null;
  }
}

const JALALI_PATTERN = /^\d{4}\/\d{2}\/\d{2}$/;

export default function JalaliDateRange({ startDate, endDate, onChange }: JalaliDateRangeProps) {
  const [startInput, setStartInput] = useState(startDate ? gregorianToJalaliInput(new Date(startDate)) : '');
  const [endInput, setEndInput] = useState(endDate ? gregorianToJalaliInput(new Date(endDate)) : '');
  const [startError, setStartError] = useState(false);
  const [endError, setEndError] = useState(false);

  const handleStartChange = (value: string) => {
    setStartInput(value);
    if (value && !JALALI_PATTERN.test(value)) {
      setStartError(true);
      return;
    }
    setStartError(false);
    if (value) {
      const date = jalaliInputToGregorian(value);
      if (date) {
        onChange(date.toISOString(), endDate);
        return;
      }
    }
    onChange('', endDate);
  };

  const handleEndChange = (value: string) => {
    setEndInput(value);
    if (value && !JALALI_PATTERN.test(value)) {
      setEndError(true);
      return;
    }
    setEndError(false);
    if (value) {
      const date = jalaliInputToGregorian(value);
      if (date) {
        onChange(startDate, date.toISOString());
        return;
      }
    }
    onChange(startDate, '');
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="block text-xs text-muted-foreground">محدوده تاریخ (شمسی)</label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            value={endInput}
            onChange={(e) => handleEndChange(e.target.value)}
            placeholder="۱۴۰۴/۱۲/۲۹"
            className={`h-10 w-full rounded-[var(--radius-input)] border px-3 py-2 text-sm bg-background pl-8 ${endError ? 'border-destructive ring-1 ring-destructive/30' : 'border-input'}`}
          />
          <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
        <span className="text-muted-foreground text-sm">تا</span>
        <div className="relative flex-1">
          <input
            value={startInput}
            onChange={(e) => handleStartChange(e.target.value)}
            placeholder="۱۴۰۴/۰۱/۰۱"
            className={`h-10 w-full rounded-[var(--radius-input)] border px-3 py-2 text-sm bg-background pl-8 ${startError ? 'border-destructive ring-1 ring-destructive/30' : 'border-input'}`}
          />
          <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>
      {(startError || endError) && (
        <p className="text-xs text-destructive">فرمت تاریخ باید YYYY/MM/DD باشد</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create barrel export**

```tsx
// components/reports/index.ts
export { default as SearchableSelect } from './SearchableSelect';
export { default as JalaliDateRange } from './JalaliDateRange';
export { default as FilterPanel } from './FilterPanel';
```

---

### Task 3: Create FilterPanel component

**Files:**
- Create: `components/reports/FilterPanel.tsx`

- [ ] **Step 1: Write the component**

```tsx
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
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit --strict components/reports/FilterPanel.tsx`
Expected: No type errors

---

### Task 4: Update API route with dynamic filtering + pagination

**Files:**
- Modify: `app/api/reports/route.ts` (full rewrite)

- [ ] **Step 1: Rewrite the API route**

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const customerId = searchParams.get('customerId');
  const warehouseId = searchParams.get('warehouseId');
  const productId = searchParams.get('productId');
  const operatorId = searchParams.get('operatorId');
  const search = searchParams.get('search')?.trim();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)));

  try {
    if (type !== 'inventory') {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    // Build dynamic where clause
    const where: Record<string, unknown> = {};

    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {};
      if (startDate) createdAt.gte = new Date(startDate);
      if (endDate) createdAt.lte = new Date(endDate);
      where.createdAt = createdAt;
    }

    if (customerId) where.customerId = customerId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;
    if (operatorId) where.createdBy = operatorId;

    if (search) {
      where.OR = [
        { product: { name: { contains: search, mode: 'insensitive' } } },
        { warehouse: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Get total count for pagination
    const total = await prisma.inventoryLedger.count({ where: where as any });

    // Fetch paginated data
    const ledgers = await prisma.inventoryLedger.findMany({
      where: where as any,
      include: {
        product: { select: { name: true } },
        warehouse: { select: { name: true } },
        customer: { select: { id: true, name: true } },
        customerOrder: { select: { id: true, status: true, paymentStatus: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Resolve creator names
    const creatorIds = Array.from(
      new Set(
        ledgers
          .map((l) => l.createdBy)
          .filter((v): v is string => Boolean(v) && v !== 'EXTERNAL_API'),
      ),
    );

    const creators = creatorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, name: true, username: true },
        })
      : [];

    const creatorsById = new Map(
      creators.map((c) => [c.id, c.name || c.username]),
    );

    const rows = ledgers.map((ledger) => ({
      ...ledger,
      operatorName: ledger.createdBy
        ? creatorsById.get(ledger.createdBy) || ledger.createdBy
        : '—',
    }));

    // Compute filtered totals (separate aggregation query)
    const aggregation = await prisma.inventoryLedger.aggregate({
      where: where as any,
      _sum: { weight: true, quantity: true },
      _count: true,
    });

    const totals = {
      incoming: 0,
      outgoing: 0,
      transactions: aggregation._count || 0,
    };

    // For accurate incoming/outgoing, sum separately by type
    const byType = await prisma.inventoryLedger.groupBy({
      by: ['type'],
      where: { ...where as any, type: { in: ['STOCK_IN', 'STOCK_OUT'] } },
      _sum: { weight: true },
    });

    for (const entry of byType) {
      const val = entry._sum.weight ?? 0;
      if (entry.type === 'STOCK_IN') totals.incoming += val;
      if (entry.type === 'STOCK_OUT') totals.outgoing += val;
    }

    return NextResponse.json({
      rows,
      totals,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Report API error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit --strict app/api/reports/route.ts`
Expected: No type errors

---

### Task 5: Update reports page to use new filter system

**Files:**
- Modify: `app/reports/page.tsx`

- [ ] **Step 1: Rewrite page with FilterPanel integration**

```tsx
'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Calendar, Search, ArrowDownToLine, ArrowUpFromLine, Package2, Warehouse, FileDown, Loader2 } from 'lucide-react';
import FilterPanel, { type FilterValues } from '@/components/reports/FilterPanel';

type InventoryRow = {
  id: string;
  type: 'STOCK_IN' | 'STOCK_OUT' | 'STOCK_IN_UNDO' | 'STOCK_OUT_UNDO';
  quantity: number;
  weight: number | null;
  createdAt: string;
  product: { name: string };
  warehouse: { name: string };
  customer: { id: string; name: string } | null;
  customerOrder: { status: string; paymentStatus: string } | null;
  operatorName: string;
};

type ReportResponse = {
  rows: InventoryRow[];
  totals: { incoming: number; outgoing: number; transactions: number };
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

const PAGE_SIZE = 10;

const typeLabel: Record<InventoryRow['type'], string> = {
  STOCK_IN: 'ورود',
  STOCK_OUT: 'خروج',
  STOCK_IN_UNDO: 'لغو ورود',
  STOCK_OUT_UNDO: 'لغو خروج',
};

const initialFilters: FilterValues = {
  startDate: '',
  endDate: '',
  customerId: null,
  warehouseId: null,
  productId: null,
  operatorId: null,
};

export default function ReportsPage() {
  const [filters, setFilters] = useState<FilterValues>(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return { ...initialFilters, startDate: start.toISOString(), endDate: now.toISOString() };
  });

  const [activeType, setActiveType] = useState<'ALL' | 'STOCK_IN' | 'STOCK_OUT'>('ALL');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [totals, setTotals] = useState({ incoming: 0, outgoing: 0, transactions: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ type: 'inventory' });
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.customerId) params.set('customerId', filters.customerId);
      if (filters.warehouseId) params.set('warehouseId', filters.warehouseId);
      if (filters.productId) params.set('productId', filters.productId);
      if (filters.operatorId) params.set('operatorId', filters.operatorId);
      if (activeType !== 'ALL') params.set('type', activeType);
      if (search.trim()) params.set('search', search.trim());
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        const json: ReportResponse = await res.json();
        setRows(json.rows);
        setTotals(json.totals);
        setTotalPages(json.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch report data', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, activeType, search, page]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const resetFilters = () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    setFilters({ ...initialFilters, startDate: start.toISOString(), endDate: now.toISOString() });
    setActiveType('ALL');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">گزارش‌ها</h1>
        <p className="text-muted-foreground mt-1">نمایش ساده‌تر، قابل جستجو و قابل فیلتر برای مدیریت بهتر تردد کالا.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard title="کل ورود" value={`${totals.incoming.toFixed(2)} kg`} icon={<ArrowDownToLine className="w-5 h-5 text-emerald-600" />} />
        <SummaryCard title="کل خروج" value={`${totals.outgoing.toFixed(2)} kg`} icon={<ArrowUpFromLine className="w-5 h-5 text-rose-600" />} />
        <SummaryCard title="تعداد تراکنش" value={`${totals.transactions}`} icon={<Package2 className="w-5 h-5 text-primary" />} />
      </div>

      {/* Filter Panel */}
      <FilterPanel
        values={filters}
        onChange={(v) => { setFilters(v); setPage(1); }}
        onReset={resetFilters}
      />

      {/* Table Card */}
      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 md:p-5 border-b border-border space-y-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
            <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-xl w-fit">
              <FilterButton active={activeType === 'ALL'} onClick={() => { setActiveType('ALL'); setPage(1); }}>
                همه
              </FilterButton>
              <FilterButton active={activeType === 'STOCK_IN'} onClick={() => { setActiveType('STOCK_IN'); setPage(1); }}>
                ورودها
              </FilterButton>
              <FilterButton active={activeType === 'STOCK_OUT'} onClick={() => { setActiveType('STOCK_OUT'); setPage(1); }}>
                خروجی‌ها
              </FilterButton>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileDown className="w-4 h-4" />
              <span className="text-xs">خروجی Excel (به زودی)</span>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full border border-border rounded-xl p-2 pr-9 bg-background"
              placeholder="جستجو بر اساس کالا، انبار یا مشتری"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-secondary/30 text-muted-foreground">
              <tr>
                <th className="text-right p-3">تاریخ</th>
                <th className="text-right p-3">نوع عملیات</th>
                <th className="text-right p-3">کالا</th>
                <th className="text-right p-3">انبار</th>
                <th className="text-right p-3">مشتری</th>
                <th className="text-right p-3">اپراتور</th>
                <th className="text-right p-3">وضعیت سفارش/پرداخت</th>
                <th className="text-right p-3">مقدار</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="p-10 text-center text-muted-foreground" colSpan={8}>
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      در حال بارگذاری...
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="p-6 text-center text-muted-foreground" colSpan={8}>نتیجه‌ای پیدا نشد.</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-border/60 hover:bg-secondary/15 transition-colors">
                    <td className="p-3 whitespace-nowrap">{new Date(row.createdAt).toLocaleString('fa-IR')}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${row.type === 'STOCK_IN' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-rose-500/10 text-rose-700'}`}>
                        {typeLabel[row.type]}
                      </span>
                    </td>
                    <td className="p-3">{row.product.name}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Warehouse className="w-3.5 h-3.5" />
                        {row.warehouse.name}
                      </span>
                    </td>
                    <td className="p-3">
                      {row.customer ? (
                        <Link className="text-primary hover:underline font-medium" href={`/customers?customerId=${row.customer.id}`}>
                          {row.customer.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3">{row.operatorName || '—'}</td>
                    <td className="p-3">
                      {row.customerOrder ? (
                        <div className="flex flex-wrap gap-1 text-xs">
                          <span className="rounded-full bg-blue-500/10 text-blue-700 px-2 py-1">{row.customerOrder.status}</span>
                          <span className="rounded-full bg-amber-500/10 text-amber-700 px-2 py-1">{row.customerOrder.paymentStatus}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 font-medium" dir="ltr">{(row.weight ?? row.quantity).toFixed(2)} kg</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
          <span>صفحه {page} از {totalPages}</span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary/30 transition-colors"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              قبلی
            </button>
            <button
              className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary/30 transition-colors"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              بعدی
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm text-muted-foreground">{title}</h3>
        {icon}
      </div>
      <p className="text-2xl font-bold mt-3" dir="ltr">{value}</p>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Remove `PAGE_SIZE` constant from `page.tsx`** (it's defined in the file, let's check — it's used at line 20. In the rewrite it's used at line 40. This is fine.)

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit --strict app/reports/page.tsx`
Expected: No type errors

---

### Task 6: Verify API endpoint has warehouse + product endpoints

**Files:**
- Check: `app/api/warehouses/route.ts` and `app/api/products/route.ts` exist

- [ ] **Step 1: Check if API endpoints exist**

Run: `ls app/api/warehouses/ app/api/products/` to verify

If they don't exist, the `FilterPanel` fetchOptions will fail for those selects. We'll need to handle this — but likely they already exist since the inventory system uses them.

---

### Task 7: Build and test

- [ ] **Step 1: Run build**

Run: `npm run build` or `npx next build`
Expected: Successful build with no errors

- [ ] **Step 2: Fix any issues**

If build fails, address errors and re-run.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add comprehensive filter system to reports page

- Server-side filtering by customer, warehouse, product, operator, date range
- Jalali date range picker using date-fns-jalali
- SearchableSelect combobox for entity selection
- Collapsible FilterPanel with active filter count badge
- Server-side pagination with filtered summary totals
- Future-ready for Excel export via query-param-based filtering"
```
