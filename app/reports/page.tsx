'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, Filter, Calendar, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('inventory');
  const [dateRange, setDateRange] = useState('7d');
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchReportData = async () => {
      setIsLoading(true);
      try {
        // In a real app, you'd calculate start/end dates based on dateRange
        // and pass them to the API. For this demo, we'll just fetch all or mock.
        const res = await fetch(`/api/reports?type=${reportType}`);
        if (res.ok) {
          const json = await res.json();
          // Transform data for charts if needed
          setData(json);
        }
      } catch (error) {
        console.error('Failed to fetch report data', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportData();
  }, [reportType, dateRange]);

  // Mock data for charts since we don't have real historical data yet
  const chartData = [
    { name: 'شنبه', in: 4000, out: 2400 },
    { name: 'یکشنبه', in: 3000, out: 1398 },
    { name: 'دوشنبه', in: 2000, out: 9800 },
    { name: 'سه‌شنبه', in: 2780, out: 3908 },
    { name: 'چهارشنبه', in: 1890, out: 4800 },
    { name: 'پنج‌شنبه', in: 2390, out: 3800 },
    { name: 'جمعه', in: 3490, out: 4300 },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">گزارش‌ها و تحلیل‌ها</h1>
          <p className="text-muted-foreground mt-1">مشاهده و استخراج داده‌های عملکرد انبار و ترازوها.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="bg-secondary text-secondary-foreground font-medium rounded-xl px-4 py-2 hover:bg-secondary/80 transition-colors flex items-center gap-2">
            <Filter className="w-4 h-4" />
            فیلتر پیشرفته
          </button>
          <button className="bg-primary text-primary-foreground font-medium rounded-xl px-4 py-2 hover:bg-primary/90 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            خروجی اکسل
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-muted-foreground">کل ورودی (هفته)</h3>
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground" dir="ltr">24,580 kg</div>
            <div className="text-sm text-emerald-600 mt-2 flex items-center gap-1">
              <span>+۱۵٪</span>
              <span className="text-muted-foreground">نسبت به هفته قبل</span>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-muted-foreground">کل خروجی (هفته)</h3>
            <div className="p-2 bg-destructive/10 text-destructive rounded-xl">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground" dir="ltr">18,240 kg</div>
            <div className="text-sm text-destructive mt-2 flex items-center gap-1">
              <span>-۵٪</span>
              <span className="text-muted-foreground">نسبت به هفته قبل</span>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-muted-foreground">تراکنش‌های موفق</h3>
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground" dir="ltr">1,284</div>
            <div className="text-sm text-emerald-600 mt-2 flex items-center gap-1">
              <span>۹۹.۸٪</span>
              <span className="text-muted-foreground">نرخ موفقیت</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-xl w-fit">
            <button 
              onClick={() => setReportType('inventory')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${reportType === 'inventory' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              گردش کالا
            </button>
            <button 
              onClick={() => setReportType('low-stock')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${reportType === 'low-stock' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              کالاهای رو به اتمام
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <select 
              className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="7d">۷ روز گذشته</option>
              <option value="30d">۳۰ روز گذشته</option>
              <option value="90d">۳ ماه گذشته</option>
              <option value="year">امسال</option>
            </select>
          </div>
        </div>

        <div className="p-6">
          <div className="h-[400px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} dx={-10} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}
                  cursor={{ fill: '#f3f4f6' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="in" name="ورودی (kg)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                <Bar dataKey="out" name="خروجی (kg)" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
