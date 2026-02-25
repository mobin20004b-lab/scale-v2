'use client';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Package, ArrowDownToLine, ArrowUpFromLine, Activity } from 'lucide-react';
import { useStore } from '@/lib/store';

const data = [
  { name: 'شنبه', in: 4000, out: 2400 },
  { name: 'یکشنبه', in: 3000, out: 1398 },
  { name: 'دوشنبه', in: 2000, out: 9800 },
  { name: 'سه‌شنبه', in: 2780, out: 3908 },
  { name: 'چهارشنبه', in: 1890, out: 4800 },
  { name: 'پنج‌شنبه', in: 2390, out: 3800 },
  { name: 'جمعه', in: 3490, out: 4300 },
];

export default function Dashboard() {
  const { inventory, scales } = useStore();
  
  const totalWeight = inventory
    .filter(i => i.status === 'in_stock')
    .reduce((sum, item) => sum + item.weight, 0);
    
  const incomingToday = inventory
    .filter(i => new Date(i.date).toDateString() === new Date().toDateString())
    .reduce((sum, item) => sum + item.weight, 0);
    
  const outgoingToday = inventory
    .filter(i => i.status === 'removed' && new Date(i.date).toDateString() === new Date().toDateString())
    .reduce((sum, item) => sum + item.weight, 0);
    
  const onlineScales = scales.filter(s => s.status === 'online').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">داشبورد</h1>
        <p className="text-muted-foreground mt-1">نمای کلی از عملیات انبار شما.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-6 bg-card rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">موجودی کل</h3>
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-foreground">{totalWeight.toFixed(2)} کیلوگرم</div>
            <p className="text-xs text-muted-foreground mt-1">در حال حاضر در انبار</p>
          </div>
        </div>
        
        <div className="p-6 bg-card rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">ورودی امروز</h3>
            <ArrowDownToLine className="w-5 h-5 text-primary" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-foreground">{incomingToday.toFixed(2)} کیلوگرم</div>
            <p className="text-xs text-muted-foreground mt-1">ثبت شده امروز</p>
          </div>
        </div>

        <div className="p-6 bg-card rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">خروجی امروز</h3>
            <ArrowUpFromLine className="w-5 h-5 text-primary" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-foreground">{outgoingToday.toFixed(2)} کیلوگرم</div>
            <p className="text-xs text-muted-foreground mt-1">خارج شده امروز</p>
          </div>
        </div>

        <div className="p-6 bg-card rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">ترازوهای فعال</h3>
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-foreground">{onlineScales} / {scales.length}</div>
            <p className="text-xs text-muted-foreground mt-1">دستگاه‌های متصل</p>
          </div>
        </div>
      </div>

      <div className="p-6 bg-card rounded-2xl border border-border shadow-sm">
        <h3 className="text-lg font-medium text-foreground mb-6">فعالیت هفتگی (کیلوگرم)</h3>
        <div className="h-[300px] w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-muted-foreground)' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-muted-foreground)' }} />
              <Tooltip 
                cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-card)' }}
              />
              <Bar dataKey="in" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="ورودی" />
              <Bar dataKey="out" fill="var(--color-accent)" radius={[4, 4, 0, 0]} name="خروجی" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
