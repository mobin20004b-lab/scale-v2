'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit, Filter, KeyRound, Plus, RefreshCw, Search, UserRound } from 'lucide-react';
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/modal';

type User = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  status: string;
  createdAt: string;
  _count?: {
    activities: number;
    sessions: number;
  };
};

type UserMetrics = {
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  totals: {
    totalActivities: number;
    loginSessions: number;
    recentActivityCount: number;
  };
  recentActivities: Array<{
    id: string;
    action: string;
    entityType: string;
    details: string | null;
    createdAt: string;
  }>;
};

const initialForm = {
  name: '',
  email: '',
  username: '',
  password: '',
  role: 'WAREHOUSE_OPERATOR',
};

const initialEditForm = {
  name: '',
  email: '',
  username: '',
  role: 'WAREHOUSE_OPERATOR',
  status: 'ACTIVE',
};

const roleLabels: Record<string, string> = {
  CEO: 'مدیرعامل',
  WAREHOUSE_MANAGER: 'مدیر انبار',
  WAREHOUSE_OPERATOR: 'اپراتور',
  ADMIN: 'ادمین',
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'فعال',
  INACTIVE: 'غیرفعال',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [form, setForm] = useState(initialForm);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState(initialEditForm);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  const [isMetricsLoading, setIsMetricsLoading] = useState(false);

  const [isResettingId, setIsResettingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 3500);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (roleFilter !== 'ALL') params.set('role', roleFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const query = params.toString();
      const res = await fetch(`/api/users${query ? `?${query}` : ''}`);
      if (!res.ok) throw new Error('failed');
      setUsers(await res.json());
    } catch {
      showMessage('error', 'دریافت کاربران ناموفق بود.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, statusFilter]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'ایجاد کاربر ناموفق بود.');
      }

      setForm(initialForm);
      setIsAddDialogOpen(false);
      showMessage('success', 'کاربر با موفقیت ایجاد شد.');
      loadUsers();
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'ایجاد کاربر ناموفق بود.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPassword = async (user: User) => {
    const nextPassword = prompt(`رمز عبور جدید برای «${user.name}» را وارد کنید (حداقل ۸ کاراکتر):`);
    if (!nextPassword) return;

    setIsResettingId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: nextPassword }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'بروزرسانی رمز عبور ناموفق بود.');
      }
      showMessage('success', `رمز عبور «${user.name}» با موفقیت تغییر کرد.`);
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'تغییر رمز عبور ناموفق بود.');
    } finally {
      setIsResettingId(null);
    }
  };

  const openMetrics = async (user: User) => {
    setSelectedUser(user);
    setIsMetricsOpen(true);
    setIsMetricsLoading(true);
    setMetrics(null);

    try {
      const res = await fetch(`/api/users/${user.id}/metrics`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'دریافت شاخص‌ها ناموفق بود.');
      setMetrics(data);
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'دریافت شاخص‌ها ناموفق بود.');
    } finally {
      setIsMetricsLoading(false);
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
    });
    setIsEditDialogOpen(true);
  };

  const onEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingUser) return;

    setIsEditSubmitting(true);
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'بروزرسانی کاربر ناموفق بود.');
      }

      setIsEditDialogOpen(false);
      setEditingUser(null);
      showMessage('success', 'اطلاعات کاربر با موفقیت بروزرسانی شد.');
      loadUsers();
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'بروزرسانی کاربر ناموفق بود.');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const filteredCountLabel = useMemo(() => `${users.length} کاربر`, [users.length]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">مدیریت کاربران</h1>
            <p className="mt-2 text-sm text-muted-foreground">افزودن کاربر، فیلتر پیشرفته، بازنشانی رمز عبور و مشاهده شاخص‌های عملکرد.</p>
          </div>
          <button
            onClick={() => setIsAddDialogOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            افزودن کاربر
          </button>
        </div>
      </div>

      {notice && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700' : 'border-destructive/30 bg-destructive/10 text-destructive'}`}>
          {notice.text}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو بر اساس نام، نام کاربری یا ایمیل"
              className="w-full rounded-xl border border-border bg-background py-2 pl-3 pr-9"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2"
          >
            <option value="ALL">همه نقش‌ها</option>
            <option value="CEO">مدیرعامل</option>
            <option value="WAREHOUSE_MANAGER">مدیر انبار</option>
            <option value="WAREHOUSE_OPERATOR">اپراتور</option>
            <option value="ADMIN">ادمین</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2"
          >
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="ACTIVE">فعال</option>
            <option value="INACTIVE">غیرفعال</option>
          </select>
          <button
            onClick={loadUsers}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2"
          >
            <Filter className="h-4 w-4" />
            اعمال فیلتر
          </button>
          <span className="mr-auto text-sm text-muted-foreground">{filteredCountLabel}</span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-right">
            <thead className="bg-secondary/25">
              <tr>
                <th className="p-3">نام</th>
                <th>نام کاربری</th>
                <th>ایمیل</th>
                <th>نقش</th>
                <th>وضعیت</th>
                <th>فعالیت‌ها</th>
                <th className="p-3">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="p-4 text-center text-muted-foreground" colSpan={7}>در حال بارگذاری...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className="p-4 text-center text-muted-foreground" colSpan={7}>کاربری پیدا نشد.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="p-3 font-medium">{u.name}</td>
                    <td dir="ltr">{u.username}</td>
                    <td dir="ltr">{u.email}</td>
                    <td>{roleLabels[u.role] || u.role}</td>
                    <td>{statusLabels[u.status] || u.status}</td>
                    <td>{u._count?.activities ?? 0}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openEditDialog(u)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          ویرایش
                        </button>
                        <button
                          onClick={() => openMetrics(u)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs"
                        >
                          <UserRound className="h-3.5 w-3.5" />
                          شاخص‌ها
                        </button>
                        <button
                          onClick={() => resetPassword(u)}
                          disabled={isResettingId === u.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs"
                        >
                          {isResettingId === u.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                          بازنشانی رمز
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>افزودن کاربر جدید</ModalTitle>
            <ModalDescription>اطلاعات کاربر جدید را وارد کنید. رمز عبور باید حداقل ۸ کاراکتر باشد.</ModalDescription>
          </ModalHeader>

          <form onSubmit={onSubmit} className="space-y-3">
            <input required className="w-full rounded-xl border border-border bg-background p-2" placeholder="نام" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input required className="w-full rounded-xl border border-border bg-background p-2" placeholder="نام کاربری" dir="ltr" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <input required className="w-full rounded-xl border border-border bg-background p-2" placeholder="ایمیل" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input required minLength={8} className="w-full rounded-xl border border-border bg-background p-2" placeholder="رمز عبور" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <select className="w-full rounded-xl border border-border bg-background p-2" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="CEO">مدیرعامل</option>
              <option value="WAREHOUSE_MANAGER">مدیر انبار</option>
              <option value="WAREHOUSE_OPERATOR">اپراتور</option>
              <option value="ADMIN">ادمین</option>
            </select>
            <button disabled={isSubmitting} className="w-full rounded-xl bg-primary py-2 text-primary-foreground">
              {isSubmitting ? 'در حال ایجاد...' : 'ایجاد کاربر'}
            </button>
          </form>
        </ModalContent>
      </Modal>

      <Modal open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>ویرایش کاربر</ModalTitle>
            <ModalDescription>تمام اطلاعات کاربر انتخاب شده را ویرایش و ذخیره کنید.</ModalDescription>
          </ModalHeader>

          <form onSubmit={onEditSubmit} className="space-y-3">
            <input required className="w-full rounded-xl border border-border bg-background p-2" placeholder="نام" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <input required className="w-full rounded-xl border border-border bg-background p-2" placeholder="نام کاربری" dir="ltr" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} />
            <input required className="w-full rounded-xl border border-border bg-background p-2" placeholder="ایمیل" dir="ltr" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            <select className="w-full rounded-xl border border-border bg-background p-2" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
              <option value="CEO">مدیرعامل</option>
              <option value="WAREHOUSE_MANAGER">مدیر انبار</option>
              <option value="WAREHOUSE_OPERATOR">اپراتور</option>
              <option value="ADMIN">ادمین</option>
            </select>
            <select className="w-full rounded-xl border border-border bg-background p-2" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
              <option value="ACTIVE">فعال</option>
              <option value="INACTIVE">غیرفعال</option>
            </select>
            <button disabled={isEditSubmitting} className="w-full rounded-xl bg-primary py-2 text-primary-foreground">
              {isEditSubmitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </button>
          </form>
        </ModalContent>
      </Modal>

      <Modal open={isMetricsOpen} onOpenChange={setIsMetricsOpen}>
        <ModalContent className="max-w-2xl">
          <ModalHeader>
            <ModalTitle>شاخص‌های کاربر {selectedUser ? `(${selectedUser.name})` : ''}</ModalTitle>
            <ModalDescription>نمای کلی از اطلاعات و فعالیت‌های اخیر کاربر انتخاب شده.</ModalDescription>
          </ModalHeader>

          {isMetricsLoading ? (
            <p className="text-sm text-muted-foreground">در حال بارگذاری شاخص‌ها...</p>
          ) : !metrics ? (
            <p className="text-sm text-muted-foreground">اطلاعاتی برای نمایش وجود ندارد.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">کل فعالیت‌ها</p>
                  <p className="mt-1 text-2xl font-semibold">{metrics.totals.totalActivities}</p>
                </div>
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">تعداد نشست‌های فعال</p>
                  <p className="mt-1 text-2xl font-semibold">{metrics.totals.loginSessions}</p>
                </div>
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">فعالیت‌های اخیر</p>
                  <p className="mt-1 text-2xl font-semibold">{metrics.totals.recentActivityCount}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border">
                <table className="w-full text-right text-sm">
                  <thead className="bg-secondary/20">
                    <tr>
                      <th className="p-2">عملیات</th>
                      <th>نوع موجودیت</th>
                      <th>توضیحات</th>
                      <th className="p-2">زمان</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.recentActivities.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-muted-foreground">فعالیتی ثبت نشده است.</td>
                      </tr>
                    ) : (
                      metrics.recentActivities.map((activity) => (
                        <tr key={activity.id} className="border-t border-border">
                          <td className="p-2">{activity.action}</td>
                          <td>{activity.entityType}</td>
                          <td>{activity.details || '-'}</td>
                          <td className="p-2">{new Date(activity.createdAt).toLocaleString('fa-IR')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
