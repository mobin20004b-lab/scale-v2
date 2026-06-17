'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Calendar, Search, ArrowDownToLine, ArrowUpFromLine, Package2, Warehouse, FileDown, Loader2 } from 'lucide-react';
import FilterPanel, { type FilterValues } from '@/components/reports/FilterPanel';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [exporting, setExporting] = useState(false);
  const fetchingRef = useRef(false);

  const fetchReport = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ type: 'inventory' });
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.customerId) params.set('customerId', filters.customerId);
      if (filters.warehouseId) params.set('warehouseId', filters.warehouseId);
      if (filters.productId) params.set('productId', filters.productId);
      if (filters.operatorId) params.set('operatorId', filters.operatorId);
      if (activeType !== 'ALL') params.set('transactionType', activeType);
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
      fetchingRef.current = false;
      setIsLoading(false);
    }
  }, [filters, activeType, search, page]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const exportExcel = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const params = new URLSearchParams({ type: 'inventory', export: 'true' });
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.customerId) params.set('customerId', filters.customerId);
      if (filters.warehouseId) params.set('warehouseId', filters.warehouseId);
      if (filters.productId) params.set('productId', filters.productId);
      if (filters.operatorId) params.set('operatorId', filters.operatorId);
      if (activeType !== 'ALL') params.set('transactionType', activeType);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (!res.ok) throw new Error('Export failed');
      const { rows: allRows } = await res.json();

      const XLSX = await import('xlsx');
      const data = allRows.map((r: InventoryRow, idx: number) => {
        const d = new Date(r.createdAt);
        return {
          'ردیف': idx + 1,
          'تاریخ': d.toLocaleDateString('fa-IR'),
          'ساعت': d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
          'نوع عملیات': typeLabel[r.type],
          'کالا': r.product.name,
          'انبار': r.warehouse.name,
          'مشتری': r.customer?.name ?? '—',
          'اپراتور': r.operatorName || '—',
          'وضعیت سفارش': r.customerOrder?.status ?? '—',
          'وضعیت پرداخت': r.customerOrder?.paymentStatus ?? '—',
          'مقدار (kg)': (r.weight ?? r.quantity).toFixed(2),
        };
      });

      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [
        { wch: 6 }, { wch: 14 }, { wch: 8 }, { wch: 14 }, { wch: 22 },
        { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
        { wch: 14 },
      ];

      const lastRow = data.length + 1;
      const qtyCol = XLSX.utils.encode_col(10);

      // Summary sheet
      const summaryData: Record<string, string>[] = [
        { 'عنوان': 'تعداد تراکنش‌ها', 'مقدار': '' },
        { 'عنوان': 'جمع کل مقدار (kg)', 'مقدار': '' },
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryData, { header: ['عنوان', 'مقدار'] });
      const rowCol = XLSX.utils.encode_col(0);
      wsSummary[XLSX.utils.encode_cell({ r: 1, c: 1 })] = { t: 'n', f: `COUNTA('گزارش'!${rowCol}2:${rowCol}${lastRow})` };
      wsSummary[XLSX.utils.encode_cell({ r: 2, c: 1 })] = { t: 'n', f: `SUM('گزارش'!${qtyCol}2:${qtyCol}${lastRow})` };
      wsSummary['!cols'] = [{ wch: 24 }, { wch: 16 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsSummary, 'خلاصه');
      XLSX.utils.book_append_sheet(wb, ws, 'گزارش');
      const now = new Date();
      const filename = `گزارش_حرکات_انبار_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

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
        {isLoading && rows.length === 0 ? (
          <>
            <SummarySkeleton />
            <SummarySkeleton />
            <SummarySkeleton />
          </>
        ) : (
          <>
            <SummaryCard title="کل ورود" value={`${totals.incoming.toFixed(2)} kg`} icon={<ArrowDownToLine className="w-5 h-5 text-emerald-600" />} />
            <SummaryCard title="کل خروج" value={`${totals.outgoing.toFixed(2)} kg`} icon={<ArrowUpFromLine className="w-5 h-5 text-rose-600" />} />
            <SummaryCard title="تعداد تراکنش" value={`${totals.transactions}`} icon={<Package2 className="w-5 h-5 text-primary" />} />
          </>
        )}
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
              <Loader2
                className={`w-4 h-4 animate-spin text-muted-foreground mr-1 transition-opacity duration-200 ${
                  isLoading && rows.length > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              />
            </div>

            <button
              onClick={exportExcel}
              disabled={exporting}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              <span className="text-xs">{exporting ? 'در حال خروجی...' : 'خروجی Excel'}</span>
            </button>
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
                <th className="text-right p-3 w-12">ردیف</th>
                <th className="text-right p-3">تاریخ</th>
                <th className="text-right p-3">ساعت</th>
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
              {isLoading && rows.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-border/60">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="p-3"><Skeleton className="h-5 w-full max-w-[120px]" /></td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td className="p-6 text-center text-muted-foreground" colSpan={10}>نتیجه‌ای پیدا نشد.</td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row.id} className="border-t border-border/60 hover:bg-secondary/15 transition-colors">
                    <td className="p-3 text-muted-foreground text-center">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="p-3 whitespace-nowrap">{new Date(row.createdAt).toLocaleDateString('fa-IR')}</td>
                    <td className="p-3 whitespace-nowrap text-muted-foreground" dir="ltr">{new Date(row.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</td>
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

function SummarySkeleton() {
  return (
    <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-3">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-8 w-28" />
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