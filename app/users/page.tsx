'use client';

import { useEffect, useState } from 'react';

type User = { id: string; name: string; email: string; username: string; role: string; status: string };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ name: '', email: '', username: '', password: '', role: 'WAREHOUSE_OPERATOR' });

  const load = async () => {
    const res = await fetch('/api/users');
    if (res.ok) setUsers(await res.json());
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ name: '', email: '', username: '', password: '', role: 'WAREHOUSE_OPERATOR' });
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">کاربران و نقش‌ها</h1>

      <div className="bg-card border border-border rounded-2xl p-4 grid md:grid-cols-5 gap-3">
        <input className="border border-border rounded-xl p-2 bg-background" placeholder="نام" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="border border-border rounded-xl p-2 bg-background" placeholder="نام کاربری" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} dir="ltr" />
        <input className="border border-border rounded-xl p-2 bg-background" placeholder="ایمیل" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" />
        <input className="border border-border rounded-xl p-2 bg-background" placeholder="رمز عبور" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" />
        <select className="border border-border rounded-xl p-2 bg-background" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="CEO">مدیرعامل</option>
          <option value="WAREHOUSE_MANAGER">مدیر انبار</option>
          <option value="WAREHOUSE_OPERATOR">مسئول خروج/عملیات</option>
          <option value="ADMIN">ادمین</option>
        </select>
        <button onClick={submit} className="md:col-span-5 bg-primary text-primary-foreground rounded-xl py-2">ایجاد کاربر</button>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-secondary/20">
            <tr>
              <th className="p-3">نام</th><th>نام کاربری</th><th>ایمیل</th><th>نقش</th><th>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3">{u.name}</td>
                <td dir="ltr">{u.username}</td>
                <td dir="ltr">{u.email}</td>
                <td>{u.role}</td>
                <td>{u.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
