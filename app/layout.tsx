import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'مدیریت انبار',
  description: 'سیستم مدیریت انبار ساده و سریع با یکپارچه‌سازی ترازو و اسکن بارکد',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body suppressHydrationWarning className="antialiased font-sans">
        <Sidebar>{children}</Sidebar>
      </body>
    </html>
  );
}
