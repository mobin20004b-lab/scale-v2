'use client';

import { useState } from 'react';
import { Users, Plus, Shield, User, Mail, CheckCircle2 } from 'lucide-react';

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'مدیرعامل' | 'مدیر انبار' | 'مسئول خروج';
  status: 'active' | 'inactive';
}

const initialUsers: AppUser[] = [
  { id: 'usr-1', name: 'علی رضایی', email: 'ali@greenstock.com', role: 'مدیرعامل', status: 'active' },
  { id: 'usr-2', name: 'محمد حسینی', email: 'mohammad@greenstock.com', role: 'مدیر انبار', status: 'active' },
  { id: 'usr-3', name: 'سارا احمدی', email: 'sara@greenstock.com', role: 'مسئول خروج', status: 'active' },
];

export default function UsersManagement() {
  const [users, setUsers] = useState<AppUser[]>(initialUsers);
  const [isAdding, setIsAdding] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'مدیرعامل' | 'مدیر انبار' | 'مسئول خروج'>('مدیر انبار');

  const handleAddUser = () => {
    if (!newUserName || !newUserEmail) return;
    
    const newUser: AppUser = {
      id: `usr-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      status: 'active',
    };
    
    setUsers([...users, newUser]);
    setNewUserName('');
    setNewUserEmail('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">مدیریت کاربران</h1>
          <p className="text-muted-foreground mt-1">مدیریت دسترسی‌ها و نقش‌های سیستم.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-primary text-primary-foreground font-medium rounded-xl px-4 py-2 hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          افزودن کاربر
        </button>
      </div>

      {isAdding && (
        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-4">
          <h2 className="text-xl font-semibold mb-4">افزودن کاربر جدید</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                نام و نام خانوادگی
              </label>
              <input 
                type="text"
                placeholder="مثال: علی رضایی"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                آدرس ایمیل
              </label>
              <input 
                type="email"
                placeholder="مثال: ali@greenstock.com"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow text-left"
                dir="ltr"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                نقش
              </label>
              <select 
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as any)}
              >
                <option value="مدیرعامل">مدیرعامل</option>
                <option value="مدیر انبار">مدیر انبار</option>
                <option value="مسئول خروج">مسئول خروج</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 rounded-xl font-medium text-muted-foreground hover:bg-secondary transition-colors"
            >
              لغو
            </button>
            <button
              onClick={handleAddUser}
              disabled={!newUserName || !newUserEmail}
              className="bg-primary text-primary-foreground font-medium rounded-xl px-4 py-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              ذخیره کاربر
            </button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-border bg-secondary/20">
                <th className="px-6 py-4 text-sm font-medium text-muted-foreground">کاربر</th>
                <th className="px-6 py-4 text-sm font-medium text-muted-foreground">نقش</th>
                <th className="px-6 py-4 text-sm font-medium text-muted-foreground">وضعیت</th>
                <th className="px-6 py-4 text-sm font-medium text-muted-foreground text-left">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-secondary/10 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{user.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1" dir="ltr">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{user.role}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full w-fit">
                      <CheckCircle2 className="w-3 h-3" />
                      فعال
                    </div>
                  </td>
                  <td className="px-6 py-4 text-left">
                    <button className="text-sm font-medium text-primary hover:underline">
                      ویرایش
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
