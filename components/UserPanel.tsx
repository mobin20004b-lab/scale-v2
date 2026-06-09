'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSession, signOut } from 'next-auth/react';
import { LogOut, Settings, UserCircle2 } from 'lucide-react';

type SessionUser = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

export default function UserPanel() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      const session = await getSession();
      setUser((session?.user as SessionUser | undefined) ?? null);
    };

    loadSession();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut({ redirect: false });
    router.push('/login');
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-2 py-1.5">
      <div className="flex items-center gap-2 px-2">
        <UserCircle2 className="h-5 w-5 text-muted-foreground" />
        <div className="text-right leading-tight">
          <p className="text-xs font-semibold text-foreground">{user?.name || 'کاربر سیستم'}</p>
          <p className="text-[10px] text-muted-foreground">{user?.role || user?.email || 'وضعیت فعال'}</p>
        </div>
      </div>
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-secondary"
      >
        <Settings className="h-3.5 w-3.5" />
        تنظیمات
      </Link>
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="inline-flex items-center gap-1 rounded-lg bg-destructive/90 px-2 py-1 text-xs font-medium text-destructive-foreground disabled:opacity-70"
      >
        <LogOut className="h-3.5 w-3.5" />
        {isLoggingOut ? 'خروج...' : 'خروج'}
      </button>
    </div>
  );
}
