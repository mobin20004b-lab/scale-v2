'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  PackagePlus, 
  PackageMinus, 
  Scale, 
  Users, 
  Menu,
  X,
  Building2,
  Package,
  ScanBarcode,
  FileText,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  if (pathname === '/login') {
    return <>{children}</>;
  }

  const navigation = [
    { name: 'داشبورد', href: '/', icon: LayoutDashboard },
    { name: 'محصولات', href: '/products', icon: Package },
    { name: 'بارکدهای ناشناخته', href: '/barcodes', icon: ScanBarcode },
    { name: 'مدیریت انبارها', href: '/warehouses', icon: Building2 },
    { name: 'ورود کالا', href: '/incoming', icon: PackagePlus },
    { name: 'خروج کالا', href: '/outgoing', icon: PackageMinus },
    { name: 'مدیریت ترازوها', href: '/scales', icon: Scale },
    { name: 'کاربران', href: '/users', icon: Users },
    { name: 'گزارش‌ها', href: '/reports', icon: FileText },
    { name: 'تنظیمات', href: '/settings', icon: Settings },
  ];

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
        className={`fixed inset-y-0 right-0 z-50 w-72 bg-surface border-l border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-border bg-primary/5">
          <span className="text-xl font-bold text-primary tracking-tight">گرین‌استاک</span>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-foreground">
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive 
                    ? 'bg-primary text-primary-foreground font-medium shadow-sm' 
                    : 'text-foreground hover:bg-secondary hover:text-secondary-foreground'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </motion.div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center h-16 px-4 border-b border-border bg-surface lg:px-8">
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 ml-4 text-foreground rounded-lg hover:bg-secondary lg:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full text-sm font-medium text-secondary-foreground">
              <div className="w-2 h-2 rounded-full bg-primary" />
              سیستم آنلاین است
            </div>
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
