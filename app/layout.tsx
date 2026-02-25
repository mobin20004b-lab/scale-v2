import type {Metadata} from 'next';
import { Vazirmatn } from 'next/font/google';
import './globals.css'; // Global styles
import Sidebar from '@/components/Sidebar';

const vazirmatn = Vazirmatn({
  subsets: ['arabic'],
  variable: '--font-vazirmatn',
});

export const metadata: Metadata = {
  title: 'گرین‌استاک - مدیریت انبار',
  description: 'سیستم مدیریت انبار ساده و سریع با یکپارچه‌سازی ترازو و اسکن بارکد',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body suppressHydrationWarning className="antialiased font-sans">
        <Sidebar>{children}</Sidebar>
      </body>
    </html>
  );
}
