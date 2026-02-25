'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, AlertCircle, Server, Shield, Globe } from 'lucide-react';

interface SystemSettings {
  companyName: string;
  allowUserRegistration: boolean;
  defaultRateLimit: number;
  externalApiEnabled: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    companyName: 'گرین‌استاک',
    allowUserRegistration: false,
    defaultRateLimit: 100,
    externalApiEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to fetch settings', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSuccess('تنظیمات با موفقیت ذخیره شد.');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('خطا در ذخیره تنظیمات.');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      setError('خطای شبکه.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64 text-muted-foreground">در حال بارگذاری...</div>;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">تنظیمات سیستم</h1>
        <p className="text-muted-foreground mt-1">پیکربندی و مدیریت تنظیمات کلی پلتفرم.</p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 text-emerald-600 px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          {success}
        </div>
      )}

      <div className="grid gap-8">
        {/* General Settings */}
        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold">تنظیمات عمومی</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">نام شرکت / سازمان</label>
              <input 
                type="text"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold">امنیت و دسترسی</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-2xl">
              <div>
                <h3 className="font-medium text-foreground">ثبت‌نام کاربران جدید</h3>
                <p className="text-sm text-muted-foreground mt-1">اجازه ثبت‌نام به کاربران جدید بدون دعوت‌نامه</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={settings.allowUserRegistration}
                  onChange={(e) => setSettings({ ...settings, allowUserRegistration: e.target.checked })}
                />
                <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:-translate-x-full rtl:peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

        {/* API Settings */}
        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl">
              <Globe className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold">یکپارچه‌سازی و API</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-2xl mb-4">
              <div>
                <h3 className="font-medium text-foreground">فعال‌سازی API خارجی</h3>
                <p className="text-sm text-muted-foreground mt-1">امکان اتصال سیستم‌های شخص ثالث به پلتفرم</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={settings.externalApiEnabled}
                  onChange={(e) => setSettings({ ...settings, externalApiEnabled: e.target.checked })}
                />
                <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:-translate-x-full rtl:peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">محدودیت درخواست API (در دقیقه)</label>
              <input 
                type="number"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                value={settings.defaultRateLimit}
                onChange={(e) => setSettings({ ...settings, defaultRateLimit: parseInt(e.target.value) || 100 })}
                disabled={!settings.externalApiEnabled}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-primary text-primary-foreground font-medium rounded-xl px-8 py-3 hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="w-5 h-5" />
          {isSaving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
        </button>
      </div>
    </div>
  );
}
