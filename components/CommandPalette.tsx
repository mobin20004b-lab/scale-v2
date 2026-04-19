'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command, Search } from 'lucide-react';
import { commandPaletteActions, navItems } from '@/lib/navigation';

type CommandItem = {
  label: string;
  href: string;
  section: 'صفحه' | 'اقدام' | 'موجودیت';
  keywords: string[];
};

const entityCommands: CommandItem[] = [
  { label: 'محصولات', href: '/products', section: 'موجودیت', keywords: ['product', 'کالا'] },
  { label: 'انبارها', href: '/warehouses', section: 'موجودیت', keywords: ['warehouse', 'storage'] },
  { label: 'ترازوها', href: '/scales', section: 'موجودیت', keywords: ['scale', 'device'] },
  { label: 'کاربران', href: '/users', section: 'موجودیت', keywords: ['user', 'team'] },
];

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const commands = useMemo<CommandItem[]>(
    () => [
      ...navItems.map((item) => ({
        label: item.label,
        href: item.href,
        section: 'صفحه' as const,
        keywords: [item.goal, ...(item.aliases ?? [])],
      })),
      ...commandPaletteActions.map((item) => ({
        label: item.label,
        href: item.href,
        section: 'اقدام' as const,
        keywords: item.keywords,
      })),
      ...entityCommands,
    ],
    [],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return commands;

    return commands.filter((item) =>
      [item.label, ...item.keywords].some((token) => token.toLowerCase().includes(normalized)),
    );
  }, [commands, query]);

  const goTo = (href: string) => {
    router.push(href);
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
      >
        <Search className="h-4 w-4" />
        جستجو یا فرمان...
        <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-foreground">⌘K</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] bg-black/50 p-4 sm:p-8" onClick={() => setOpen(false)}>
          <div
            className="mx-auto mt-10 max-w-2xl rounded-2xl border border-border bg-card shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Command className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full bg-transparent outline-none text-sm"
                placeholder="صفحه، اقدام یا موجودیت را جستجو کنید..."
              />
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">نتیجه‌ای پیدا نشد.</div>
              ) : (
                filtered.map((item) => (
                  <button
                    key={`${item.section}-${item.href}-${item.label}`}
                    onClick={() => goTo(item.href)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-right hover:bg-secondary/60"
                  >
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.section}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

