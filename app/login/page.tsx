'use client';

import { FormEvent, useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingBootstrap, setCheckingBootstrap] = useState(true);

  useEffect(() => {
    const checkBootstrap = async () => {
      try {
        const res = await fetch('/api/bootstrap');
        if (res.ok) {
          const data = await res.json();
          if (data.requiresBootstrap) {
            router.replace('/setup');
            return;
          }
        }
      } finally {
        setCheckingBootstrap(false);
      }
    };

    checkBootstrap();
  }, [router]);

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
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <p className="text-muted-foreground">در حال آماده‌سازی سیستم...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-card border border-border rounded-2xl p-6 space-y-4">
        <h1 className="text-2xl font-bold">ورود به گرین‌استاک</h1>
        <p className="text-muted-foreground text-sm">با نام کاربری/ایمیل و رمز عبور وارد شوید.</p>

        <div>
          <label className="block text-sm mb-1">نام کاربری یا ایمیل</label>
          <input
            className="w-full border border-border rounded-xl px-3 py-2 bg-background"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">رمز عبور</label>
          <input
            type="password"
            className="w-full border border-border rounded-xl px-3 py-2 bg-background"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <button disabled={loading} className="w-full bg-primary text-primary-foreground rounded-xl py-2">
          {loading ? 'در حال ورود...' : 'ورود'}
        </button>
      </form>
    </div>
  );
}
