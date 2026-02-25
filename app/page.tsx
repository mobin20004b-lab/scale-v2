'use client';

import { useEffect, useMemo, useState } from 'react';
import { Package, ArrowDownToLine, ArrowUpFromLine, Activity } from 'lucide-react';

type Ledger = {
  id: string;
  type: 'STOCK_IN' | 'STOCK_OUT' | 'STOCK_IN_UNDO' | 'STOCK_OUT_UNDO';
  weight: number | null;
  quantity: number;
  createdAt: string;
};

type Scale = { id: string; status: 'ONLINE' | 'OFFLINE' | 'ARCHIVED' };

export default function Dashboard() {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [scales, setScales] = useState<Scale[]>([]);

  useEffect(() => {
    Promise.all([fetch('/api/inventory'), fetch('/api/scales')]).then(async ([inventoryRes, scaleRes]) => {
      if (inventoryRes.ok) setLedgers(await inventoryRes.json());
      if (scaleRes.ok) setScales(await scaleRes.json());
    });
  }, []);

  const today = new Date().toDateString();

  const metrics = useMemo(() => {
    const total = ledgers.reduce((sum, entry) => {
      const w = entry.weight ?? entry.quantity;
      if (entry.type === 'STOCK_IN' || entry.type === 'STOCK_OUT_UNDO') return sum + w;
      if (entry.type === 'STOCK_OUT' || entry.type === 'STOCK_IN_UNDO') return sum - w;
      return sum;
    }, 0);

    const incomingToday = ledgers
      .filter((entry) => entry.type === 'STOCK_IN' && new Date(entry.createdAt).toDateString() === today)
      .reduce((sum, entry) => sum + (entry.weight ?? entry.quantity), 0);

    const outgoingToday = ledgers
      .filter((entry) => entry.type === 'STOCK_OUT' && new Date(entry.createdAt).toDateString() === today)
      .reduce((sum, entry) => sum + (entry.weight ?? entry.quantity), 0);

    return {
      total,
      incomingToday,
      outgoingToday,
      onlineScales: scales.filter((s) => s.status === 'ONLINE').length,
    };
  }, [ledgers, scales, today]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">داشبورد</h1>
        <p className="text-muted-foreground mt-1">داده‌ها به‌صورت زنده از دیتابیس خوانده می‌شوند.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card title="موجودی کل" value={`${metrics.total.toFixed(2)} کیلوگرم`} subtitle="در حال حاضر در انبار" icon={<Package className="w-5 h-5 text-primary" />} />
        <Card title="ورودی امروز" value={`${metrics.incomingToday.toFixed(2)} کیلوگرم`} subtitle="ثبت شده امروز" icon={<ArrowDownToLine className="w-5 h-5 text-primary" />} />
        <Card title="خروجی امروز" value={`${metrics.outgoingToday.toFixed(2)} کیلوگرم`} subtitle="خارج شده امروز" icon={<ArrowUpFromLine className="w-5 h-5 text-primary" />} />
        <Card title="ترازوهای فعال" value={`${metrics.onlineScales} / ${scales.length}`} subtitle="دستگاه‌های متصل" icon={<Activity className="w-5 h-5 text-primary" />} />
      </div>
    </div>
  );
}

function Card({ title, value, subtitle, icon }: { title: string; value: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <div className="p-6 bg-card rounded-2xl border border-border shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {icon}
      </div>
      <div className="mt-4">
        <div className="text-3xl font-bold text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </div>
    </div>
  );
}
