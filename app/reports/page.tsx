'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Search, ArrowDownToLine, ArrowUpFromLine, Package2, Warehouse } from 'lucide-react';

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

const PAGE_SIZE = 10;

const typeLabel: Record<InventoryRow['type'], string> = {
  STOCK_IN: 'ورود',
  STOCK_OUT: 'خروج',
  STOCK_IN_UNDO: 'لغو ورود',
  STOCK_OUT_UNDO: 'لغو خروج',
};

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('7d');
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeType, setActiveType] = useState<'ALL' | 'STOCK_IN' | 'STOCK_OUT'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchReportData = async () => {
      setIsLoading(true);
      try {
        const now = new Date();
        const start = new Date(now);
        if (dateRange === '7d') start.setDate(now.getDate() - 7);
        if (dateRange === '30d') start.setDate(now.getDate() - 30);
        if (dateRange === '90d') start.setDate(now.getDate() - 90);
        if (dateRange === 'year') start.setMonth(0, 1);

        const query = new URLSearchParams({
          type: 'inventory',
          startDate: start.toISOString(),
          endDate: now.toISOString(),
        });

        const res = await fetch(`/api/reports?${query.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setRows(json);
          setPage(1);
        }
      } catch (error) {
        console.error('Failed to fetch report data', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportData();
  }, [dateRange]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return rows.filter((row) => {
      const isMatchingType = activeType === 'ALL' || row.type === activeType;
      const isMatchingText =
        !normalizedSearch ||
        row.product.name.toLowerCase().includes(normalizedSearch) ||
        row.warehouse.name.toLowerCase().includes(normalizedSearch) ||
        row.customer?.name.toLowerCase().includes(normalizedSearch) ||
        row.operatorName.toLowerCase().includes(normalizedSearch) ||
        typeLabel[row.type].toLowerCase().includes(normalizedSearch);

      return isMatchingType && isMatchingText;
    });
  }, [rows, activeType, search]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const value = row.weight ?? row.quantity;
        if (row.type === 'STOCK_IN') acc.incoming += value;
        if (row.type === 'STOCK_OUT') acc.outgoing += value;
        acc.transactions += 1;
        return acc;
      },
      { incoming: 0, outgoing: 0, transactions: 0 },
    );
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">گزارش‌ها</h1>
        <p className="text-muted-foreground mt-1">نمایش ساده‌تر، قابل جستجو و قابل فیلتر برای مدیریت بهتر تردد کالا.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard title="کل ورود" value={`${totals.incoming.toFixed(2)} kg`} icon={<ArrowDownToLine className="w-5 h-5 text-emerald-600" />} />
        <SummaryCard title="کل خروج" value={`${totals.outgoing.toFixed(2)} kg`} icon={<ArrowUpFromLine className="w-5 h-5 text-rose-600" />} />
        <SummaryCard title="تعداد تراکنش" value={`${totals.transactions}`} icon={<Package2 className="w-5 h-5 text-primary" />} />
      </div>

      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-border space-y-3">
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
              <Calendar className="w-4 h-4" />
              <select className="bg-transparent" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                <option value="7d">۷ روز گذشته</option>
                <option value="30d">۳۰ روز گذشته</option>
                <option value="90d">۳ ماه گذشته</option>
                <option value="year">از ابتدای سال</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full border border-border rounded-xl p-2 pr-9 bg-background"
              placeholder="جستجو بر اساس کالا، انبار یا نوع عملیات"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
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
              {!isLoading && pagedRows.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-muted-foreground" colSpan={8}>نتیجه‌ای پیدا نشد.</td>
                </tr>
              )}

              {isLoading && (
                <tr>
                  <td className="p-6 text-center text-muted-foreground" colSpan={8}>در حال بارگذاری...</td>
                </tr>
              )}

              {pagedRows.map((row) => (
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
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
          <span>صفحه {page} از {totalPages}</span>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>قبلی</button>
            <button className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-50" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>بعدی</button>
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

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
    >
      {children}
    </button>
  );
}
