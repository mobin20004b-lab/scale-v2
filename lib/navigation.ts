import type { LucideIcon } from 'lucide-react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Barcode,
  Building2,
  FileText,
  LayoutDashboard,
  Package,
  Scale,
  Settings,
  UserRoundCog,
  Users,
} from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  goal: string;
  aliases?: string[];
};

export const navItems: NavItem[] = [
  { label: 'داشبورد', href: '/', icon: LayoutDashboard, goal: 'نمای کلی' },
  { label: 'ورود کالا', href: '/incoming', icon: ArrowDownToLine, goal: 'عملیات روزانه' },
  { label: 'خروج کالا', href: '/outgoing', icon: ArrowUpFromLine, goal: 'عملیات روزانه' },
  { label: 'بارکدهای ناشناخته', href: '/barcodes', icon: Barcode, goal: 'عملیات روزانه' },
  { label: 'محصولات', href: '/products', icon: Package, goal: 'مدیریت دارایی', aliases: ['مدیریت محصولات'] },
  { label: 'مشتریان', href: '/customers', icon: UserRoundCog, goal: 'مدیریت دارایی', aliases: ['مدیریت مشتریان'] },
  { label: 'انبارها', href: '/warehouses', icon: Building2, goal: 'مدیریت دارایی', aliases: ['مدیریت انبارها'] },
  { label: 'ترازوها', href: '/scales', icon: Scale, goal: 'مدیریت دارایی', aliases: ['مدیریت ترازوها'] },
  { label: 'کاربران', href: '/users', icon: Users, goal: 'نظارت و پیکربندی' },
  { label: 'گزارش‌ها', href: '/reports', icon: FileText, goal: 'نظارت و پیکربندی' },
  { label: 'تنظیمات', href: '/settings', icon: Settings, goal: 'نظارت و پیکربندی' },
];

export const quickActionsByPath: Record<string, Array<{ label: string; href: string }>> = {
  '/': [
    { label: 'ثبت ورود کالا', href: '/incoming' },
    { label: 'ثبت خروج کالا', href: '/outgoing' },
  ],
  '/products': [
    { label: 'افزودن محصول جدید', href: '/products#new-product' },
    { label: 'ثبت ورود کالا', href: '/incoming' },
  ],
  '/customers': [
    { label: 'ثبت خروج کالا', href: '/outgoing' },
    { label: 'افزودن مشتری', href: '/customers' },
  ],
  '/incoming': [
    { label: 'ثبت خروج کالا', href: '/outgoing' },
    { label: 'مشاهده گزارش‌ها', href: '/reports' },
  ],
  '/outgoing': [
    { label: 'ثبت ورود کالا', href: '/incoming' },
    { label: 'بررسی بارکدهای ناشناخته', href: '/barcodes' },
  ],
  '/reports': [
    { label: 'مشاهده موجودی', href: '/' },
    { label: 'ثبت ورود کالا', href: '/incoming' },
  ],
  '/scales': [
    { label: 'مدیریت انبارها', href: '/warehouses' },
    { label: 'تنظیمات سیستم', href: '/settings' },
  ],
};

export const commandPaletteActions = [
  { label: 'ثبت سریع ورود کالا', href: '/incoming', keywords: ['quick in', 'ورود سریع'] },
  { label: 'ثبت سریع خروج کالا', href: '/outgoing', keywords: ['quick out', 'خروج سریع'] },
  { label: 'افزودن محصول', href: '/products#new-product', keywords: ['new product', 'ایجاد محصول'] },
  { label: 'مدیریت مشتریان', href: '/customers', keywords: ['customers', 'مشتری'] },
  { label: 'مشاهده گزارش ۷ روز اخیر', href: '/reports', keywords: ['report week', 'گزارش هفتگی'] },
];
