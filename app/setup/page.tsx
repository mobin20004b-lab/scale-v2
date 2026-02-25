'use client';

import { FormEvent, useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: 'گرین‌استاک',
    name: '',
    username: '',
    email: '',
    password: '',
    warehouseName: 'انبار مرکزی',
  });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const res = await fetch('/api/bootstrap');
        if (res.ok) {
          const data = await res.json();
          if (!data.requiresBootstrap) {
            router.replace('/login');
            return;
          }
        }
      } finally {
        setChecking(false);
      }
    };

    checkAvailability();
  }, [router]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'راه‌اندازی اولیه انجام نشد.');
      setLoading(false);
      return;
    }

    const loginResult = await signIn('credentials', {
      redirect: false,
      identifier: form.username,
      password: form.password,
    });

    setLoading(false);

    if (!loginResult || loginResult.error) {
      router.push('/login');
      return;
    }

    router.push('/');
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <p className="text-muted-foreground">در حال بررسی وضعیت راه‌اندازی...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <form onSubmit={onSubmit} className="w-full max-w-2xl bg-card border border-border rounded-2xl p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">راه‌اندازی اولیه سیستم</h1>
          <p className="text-muted-foreground text-sm mt-1">برای اولین ورود، اطلاعات مدیر سیستم و داده‌های اولیه را ثبت کنید.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">نام شرکت</label>
            <input className="w-full border border-border rounded-xl px-3 py-2 bg-background" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm mb-1">نام انبار پیش‌فرض</label>
            <input className="w-full border border-border rounded-xl px-3 py-2 bg-background" value={form.warehouseName} onChange={(e) => setForm({ ...form, warehouseName: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm mb-1">نام مدیر</label>
            <input required className="w-full border border-border rounded-xl px-3 py-2 bg-background" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm mb-1">نام کاربری مدیر</label>
            <input required className="w-full border border-border rounded-xl px-3 py-2 bg-background" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm mb-1">ایمیل مدیر</label>
            <input required type="email" className="w-full border border-border rounded-xl px-3 py-2 bg-background" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm mb-1">رمز عبور مدیر</label>
            <input required minLength={6} type="password" className="w-full border border-border rounded-xl px-3 py-2 bg-background" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button disabled={loading} className="w-full bg-primary text-primary-foreground rounded-xl py-2">
          {loading ? 'در حال ایجاد مدیر و داده‌های اولیه...' : 'ایجاد مدیر و شروع کار'}
        </button>
      </form>
    </div>
  );
}
