import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "سامانه انبار و باسکول",
  description: "سامانه فارسی مدیریت ورود/خروج کالا با پشتیبانی از ترازوهای ESP32"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
