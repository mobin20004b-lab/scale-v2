'use client';

import { FormEvent, useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { Button, Card, FormField, Input, Toast } from '@/components/ui';
import { DEFAULT_COMPANY_NAME } from '@/lib/company';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingBootstrap, setCheckingBootstrap] = useState(true);
  const [companyName, setCompanyName] = useState(DEFAULT_COMPANY_NAME);

  useEffect(() => {
    const checkBootstrap = async () => {
      try {
        const res = await fetch('/api/bootstrap');
        if (res.ok) {
          const data = await res.json();
          if (data.requiresBootstrap) {
            router.replace('/signup');
            return;
          }
        }
      } finally {
        setCheckingBootstrap(false);
      }
    };

    checkBootstrap();
  }, [router]);


  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) return;
        const data = await res.json();
        const resolvedCompanyName = String(data?.settings?.companyName ?? '').trim();
        if (resolvedCompanyName) setCompanyName(resolvedCompanyName);
      } catch {
        // Ignore and keep fallback company name.
      }
    };

    loadSettings();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      redirect: false,
      identifier,
      password,
    });

    setLoading(false);

    if (!result || result.error) {
      setError('نام کاربری یا رمز عبور صحیح نیست.');
      return;
    }

    router.push('/');
  };

  if (checkingBootstrap) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-muted-foreground">در حال آماده‌سازی سیستم...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <Card className="p-6 space-y-4">
          <div>
            <h1 className="text-2xl font-bold">ورود به {companyName}</h1>
            <p className="text-sm text-muted-foreground">با نام کاربری/ایمیل و رمز عبور وارد شوید.</p>
          </div>

          <FormField label="نام کاربری یا ایمیل" required>
            <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          </FormField>

          <FormField label="رمز عبور" required>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </FormField>

          {error ? <Toast tone="destructive">{error}</Toast> : null}

          <Button disabled={loading} className="w-full">
            {loading ? 'در حال ورود...' : 'ورود'}
          </Button>
        </Card>
      </form>
    </div>
  );
}
