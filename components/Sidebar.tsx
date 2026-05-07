'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, Menu, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CommandPalette from '@/components/CommandPalette';
import UserPanel from '@/components/UserPanel';
import { navItems, quickActionsByPath } from '@/lib/navigation';
import { DEFAULT_COMPANY_NAME } from '@/lib/company';

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const [companyName, setCompanyName] = useState(DEFAULT_COMPANY_NAME);


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

  if (pathname === '/login' || pathname === '/setup' || pathname.startsWith('/print-label')) {
    return <>{children}</>;
  }

  const groupedNavigation = Object.entries(
    navItems.reduce<Record<string, typeof navItems>>((acc, item) => {
      if (!acc[item.goal]) acc[item.goal] = [];
      acc[item.goal].push(item);
      return acc;
    }, {}),
  );

  const activeItem = navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const breadcrumbSegments = pathname.split('/').filter(Boolean);
  const quickActions =
    quickActionsByPath[pathname] ||
    quickActionsByPath[activeItem?.href ?? ''] ||
    quickActionsByPath['/'];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        className={`fixed inset-y-0 right-0 z-50 w-72 bg-card border-l border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-border bg-primary/5">
          <span className="text-xl font-bold text-primary tracking-tight">{companyName}</span>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-foreground">
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="h-[calc(100vh-4rem)] overflow-y-auto p-4 space-y-5">
          {groupedNavigation.map(([goal, items]) => (
            <div key={goal} className="space-y-2">
              <p className="px-3 text-xs font-semibold text-muted-foreground">{goal}</p>
              {items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground font-semibold shadow-sm ring-2 ring-primary/35'
                        : 'text-foreground hover:bg-secondary hover:text-secondary-foreground'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </motion.div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="space-y-3 px-4 py-3 border-b border-border bg-card lg:px-8">
          <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 ml-4 text-foreground rounded-lg hover:bg-secondary lg:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                <Link href="/" className="hover:text-foreground">خانه</Link>
                {breadcrumbSegments.map((segment, index) => {
                  const href = `/${breadcrumbSegments.slice(0, index + 1).join('/')}`;
                  const isLast = index === breadcrumbSegments.length - 1;
                  const matched = navItems.find((item) => item.href === href);
                  const label = matched?.label || decodeURIComponent(segment).replace(/-/g, ' ');
                  return (
                    <span className="inline-flex items-center gap-1" key={href}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                      {isLast ? (
                        <span className="font-medium text-foreground">{label}</span>
                      ) : (
                        <Link href={href} className="hover:text-foreground">{label}</Link>
                      )}
                    </span>
                  );
                })}
              </div>
              <h2 className="text-lg font-semibold text-foreground mt-1">{activeItem?.label ?? companyName}</h2>
            </div>
            <div className="hidden lg:flex items-center gap-1 rounded-xl bg-secondary/50 p-1">
              {navItems.slice(1, 5).map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
                      isActive ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <CommandPalette />
            <Link
              href="/reports"
              className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
            >
              <Sparkles className="h-3.5 w-3.5" />
              گزارش سریع
            </Link>
            <div className="flex items-center gap-4">
              <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full text-sm font-medium text-secondary-foreground">
                <div className="w-2 h-2 rounded-full bg-primary" />
                سیستم آنلاین است
              </div>
              <UserPanel />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground ml-1">اقدامات سریع:</span>
            {quickActions.map((action) => (
              <Link
                key={`${pathname}-${action.label}`}
                href={action.href}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary/70 transition-colors"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-background">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
