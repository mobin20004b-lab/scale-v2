'use client';

import { FormEvent, useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { Button, Card, FormField, Input, Toast } from '@/components/ui';

export default function SetupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: 'نساجی زنبق',
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
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-muted-foreground">در حال بررسی وضعیت راه‌اندازی...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <form onSubmit={onSubmit} className="w-full max-w-2xl">
        <Card className="p-6 md:p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">راه‌اندازی اولیه سیستم</h1>
            <p className="mt-1 text-sm text-muted-foreground">برای اولین ورود، اطلاعات مدیر سیستم و داده‌های اولیه را ثبت کنید.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="نام شرکت">
              <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            </FormField>
            <FormField label="نام انبار پیش‌فرض">
              <Input value={form.warehouseName} onChange={(e) => setForm({ ...form, warehouseName: e.target.value })} />
            </FormField>
            <FormField label="نام مدیر" required>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </FormField>
            <FormField label="نام کاربری مدیر" required>
              <Input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </FormField>
            <FormField label="ایمیل مدیر" required>
              <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </FormField>
            <FormField label="رمز عبور مدیر" required>
              <Input required minLength={6} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </FormField>
          </div>

          {error ? <Toast tone="destructive">{error}</Toast> : null}

          <Button disabled={loading} className="w-full">
            {loading ? 'در حال ایجاد مدیر و داده‌های اولیه...' : 'ایجاد مدیر و شروع کار'}
          </Button>
        </Card>
      </form>
    </div>
  );
}
