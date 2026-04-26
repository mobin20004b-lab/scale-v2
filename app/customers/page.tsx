'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  totalOrders: number;
  lastOrderDate: string | null;
};

type CustomerOrderItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type CustomerOrder = {
  id: string;
  orderDate: string;
  status: string;
  paymentStatus: string;
  totalPrice: number;
  items: CustomerOrderItem[];
};

const initialForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [preferredCustomerId, setPreferredCustomerId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'with-orders' | 'without-orders'>('all');

  const [orderFrom, setOrderFrom] = useState('');
  const [orderTo, setOrderTo] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [productFilter, setProductFilter] = useState('');

  const [form, setForm] = useState(initialForm);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [isCustomersLoading, setIsCustomersLoading] = useState(true);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const showTemporaryMessage = (type: 'error' | 'success', message: string) => {
    if (type === 'error') {
      setError(message);
      setTimeout(() => setError(''), 3500);
      return;
    }

    setSuccess(message);
    setTimeout(() => setSuccess(''), 3500);
  };

  const fetchCustomers = async (searchValue?: string, targetCustomerId?: string | null) => {
    setIsCustomersLoading(true);
    try {
      const term = searchValue ?? search;
      const query = term.trim() ? `?search=${encodeURIComponent(term.trim())}` : '';
      const res = await fetch(`/api/customers${query}`);
      if (!res.ok) {
        throw new Error('Failed to load customers');
      }
      const data = await res.json();
      setCustomers(data);

      const queryCustomerId = targetCustomerId ?? preferredCustomerId;
      if (queryCustomerId) {
        const byQuery = data.find((item: Customer) => item.id === queryCustomerId) ?? null;
        setSelectedCustomer(byQuery);
      } else if (selectedCustomer) {
        const refreshed = data.find((item: Customer) => item.id === selectedCustomer.id) ?? null;
        setSelectedCustomer(refreshed);
      }
    } catch {
      showTemporaryMessage('error', 'دریافت لیست مشتریان ناموفق بود.');
    } finally {
      setIsCustomersLoading(false);
    }
  };

  const fetchCustomerOrders = async (customerId: string) => {
    setIsOrdersLoading(true);
    try {
      const params = new URLSearchParams();
      if (orderFrom) params.set('from', orderFrom);
      if (orderTo) params.set('to', orderTo);
      if (orderStatus) params.set('status', orderStatus);
      if (paymentStatus) params.set('paymentStatus', paymentStatus);
      if (productFilter.trim()) params.set('product', productFilter.trim());

      const queryString = params.toString();
      const res = await fetch(`/api/customers/${customerId}/orders${queryString ? `?${queryString}` : ''}`);
      if (!res.ok) {
        throw new Error('Failed to load orders');
      }
      setCustomerOrders(await res.json());
    } catch {
      showTemporaryMessage('error', 'دریافت تاریخچه سفارش‌ها ناموفق بود.');
    } finally {
      setIsOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const customerId = new URLSearchParams(window.location.search).get('customerId');
    setPreferredCustomerId(customerId);
    fetchCustomers(undefined, customerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedCustomer?.id) {
      fetchCustomerOrders(selectedCustomer.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer?.id, orderFrom, orderTo, orderStatus, paymentStatus, productFilter]);

  const filteredCustomers = useMemo(() => {
    if (customerFilter === 'all') return customers;
    if (customerFilter === 'with-orders') return customers.filter((customer) => customer.totalOrders > 0);
    return customers.filter((customer) => customer.totalOrders === 0);
  }, [customers, customerFilter]);

  const onSubmitCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      showTemporaryMessage('error', 'نام مشتری الزامی است.');
      return;
    }

    setIsSavingCustomer(true);
    try {
      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers';
      const method = editingCustomer ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to save customer');
      }

      setForm(initialForm);
      setEditingCustomer(null);
      await fetchCustomers();
      showTemporaryMessage('success', editingCustomer ? 'مشتری با موفقیت ویرایش شد.' : 'مشتری با موفقیت ایجاد شد.');
    } catch {
      showTemporaryMessage('error', 'ذخیره مشتری انجام نشد. لطفاً مجدداً تلاش کنید.');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const deleteCustomer = async (customer: Customer) => {
    if (!confirm(`آیا از حذف مشتری «${customer.name}» مطمئن هستید؟`)) return;

    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Failed to delete customer');
      }

      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer(null);
        setCustomerOrders([]);
      }

      await fetchCustomers();
      showTemporaryMessage('success', 'مشتری با موفقیت حذف شد.');
    } catch {
      showTemporaryMessage('error', 'حذف مشتری ناموفق بود.');
    }
  };

  const startEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
    });
  };

  const resetForm = () => {
    setEditingCustomer(null);
    setForm(initialForm);
  };

  const updateOrderStatus = async (
    orderId: string,
    nextValues: { status?: string; paymentStatus?: string },
  ) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`/api/customers/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextValues),
      });

      if (!res.ok) {
        throw new Error('Failed to update order');
      }

      setCustomerOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, ...nextValues } : order,
        ),
      );
      showTemporaryMessage('success', 'وضعیت سفارش با موفقیت بروزرسانی شد.');
    } catch {
      showTemporaryMessage('error', 'بروزرسانی وضعیت سفارش ناموفق بود.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h1 className="text-3xl font-bold text-foreground">مدیریت مشتریان</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          مدیریت کامل اطلاعات مشتریان، جستجو/فیلتر و مشاهده تاریخچه سفارش‌ها در یک گردش‌کار ساده برای اپراتور.
        </p>
      </div>

      {(error || success) && (
        <div className={`rounded-xl px-4 py-3 flex items-center gap-2 ${error ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600'}`}>
          {error ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          {error || success}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-foreground">لیست مشتریان</h2>
              <div className="inline-flex rounded-xl border border-border bg-background p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setCustomerFilter('all')}
                  className={`px-3 py-1.5 rounded-lg ${customerFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                >
                  همه
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerFilter('with-orders')}
                  className={`px-3 py-1.5 rounded-lg ${customerFilter === 'with-orders' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                >
                  دارای سفارش
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerFilter('without-orders')}
                  className={`px-3 py-1.5 rounded-lg ${customerFilter === 'without-orders' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                >
                  بدون سفارش
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="جستجو بر اساس نام، تلفن، ایمیل یا آدرس"
                  className="w-full border border-border rounded-xl pr-9 pl-3 py-2 bg-background"
                />
              </div>
              <button
                type="button"
                onClick={() => fetchCustomers()}
                className="px-4 py-2 rounded-xl border border-border bg-background hover:bg-secondary"
              >
                جستجو
              </button>
            </div>

            {isCustomersLoading ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                در حال دریافت اطلاعات مشتریان...
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                <Users className="h-6 w-6" />
                مشتری‌ای برای نمایش پیدا نشد.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60 text-muted-foreground">
                    <tr>
                      <th className="text-right px-4 py-3">نام</th>
                      <th className="text-right px-4 py-3">تلفن / ایمیل</th>
                      <th className="text-right px-4 py-3">تعداد سفارش</th>
                      <th className="text-right px-4 py-3">آخرین سفارش</th>
                      <th className="text-right px-4 py-3">عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="border-t border-border">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(customer)}
                            className="font-medium text-foreground hover:text-primary hover:underline"
                          >
                            {customer.name}
                          </button>
                          <div className="text-xs text-muted-foreground mt-1">{customer.address || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div>{customer.phone || '—'}</div>
                          <div className="text-xs">{customer.email || '—'}</div>
                        </td>
                        <td className="px-4 py-3">{customer.totalOrders}</td>
                        <td className="px-4 py-3 text-muted-foreground">{customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleString('fa-IR') : '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(customer)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 hover:bg-secondary"
                            >
                              <Pencil className="h-4 w-4" />
                              ویرایش
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteCustomer(customer)}
                              className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-2.5 py-1.5 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">{editingCustomer ? 'ویرایش مشتری' : 'ایجاد مشتری جدید'}</h2>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmitCustomer}>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-sm text-muted-foreground">نام مشتری *</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="مثلاً شرکت پارس"
                  className="w-full border border-border rounded-xl px-3 py-2 bg-background"
                  required
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-muted-foreground">تلفن</span>
                <input
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="0912..."
                  className="w-full border border-border rounded-xl px-3 py-2 bg-background"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-muted-foreground">ایمیل</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="customer@example.com"
                  dir="ltr"
                  className="w-full border border-border rounded-xl px-3 py-2 bg-background"
                />
              </label>

              <label className="space-y-1 sm:col-span-2">
                <span className="text-sm text-muted-foreground">آدرس</span>
                <textarea
                  value={form.address}
                  onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                  placeholder="آدرس کامل مشتری"
                  rows={3}
                  className="w-full border border-border rounded-xl px-3 py-2 bg-background"
                />
              </label>

              <div className="sm:col-span-2 flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSavingCustomer}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 disabled:opacity-60"
                >
                  {isSavingCustomer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {editingCustomer ? 'ذخیره تغییرات' : 'ثبت مشتری'}
                </button>
                {editingCustomer && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-border px-4 py-2 hover:bg-secondary"
                  >
                    انصراف
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>

        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">تاریخچه سفارش مشتری</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedCustomer ? `مشتری انتخاب‌شده: ${selectedCustomer.name}` : 'برای مشاهده جزئیات، یک مشتری را از لیست انتخاب کنید.'}
            </p>
          </div>

          {selectedCustomer && (
            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">از تاریخ</span>
                  <input type="date" value={orderFrom} onChange={(event) => setOrderFrom(event.target.value)} className="w-full border border-border rounded-xl px-3 py-2 bg-background" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">تا تاریخ</span>
                  <input type="date" value={orderTo} onChange={(event) => setOrderTo(event.target.value)} className="w-full border border-border rounded-xl px-3 py-2 bg-background" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">وضعیت سفارش</span>
                  <select value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)} className="w-full border border-border rounded-xl px-3 py-2 bg-background">
                    <option value="">همه</option>
                    <option value="PENDING">PENDING</option>
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="SHIPPED">SHIPPED</option>
                    <option value="DELIVERED">DELIVERED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">وضعیت پرداخت</span>
                  <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className="w-full border border-border rounded-xl px-3 py-2 bg-background">
                    <option value="">همه</option>
                    <option value="UNPAID">UNPAID</option>
                    <option value="PARTIAL">PARTIAL</option>
                    <option value="PAID">PAID</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                </label>
              </div>

              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">نام محصول</span>
                <input
                  value={productFilter}
                  onChange={(event) => setProductFilter(event.target.value)}
                  placeholder="فیلتر بر اساس نام محصول"
                  className="w-full border border-border rounded-xl px-3 py-2 bg-background"
                />
              </label>
            </div>
          )}

          {!selectedCustomer ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
              مشتری انتخاب نشده است.
            </div>
          ) : isOrdersLoading ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              در حال بارگذاری سفارش‌ها...
            </div>
          ) : customerOrders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
              هیچ سفارشی مطابق فیلترهای انتخابی پیدا نشد.
            </div>
          ) : (
            <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
              {customerOrders.map((order) => (
                <article key={order.id} className="rounded-xl border border-border p-4 space-y-3 bg-background">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">تاریخ سفارش</p>
                      <p className="font-medium">{new Date(order.orderDate).toLocaleString('fa-IR')}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <select
                        className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-blue-700"
                        value={order.status}
                        disabled={updatingOrderId === order.id}
                        onChange={(event) => updateOrderStatus(order.id, { status: event.target.value })}
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="SHIPPED">SHIPPED</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                      <select
                        className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-700"
                        value={order.paymentStatus}
                        disabled={updatingOrderId === order.id}
                        onChange={(event) => updateOrderStatus(order.id, { paymentStatus: event.target.value })}
                      >
                        <option value="UNPAID">UNPAID</option>
                        <option value="PARTIAL">PARTIAL</option>
                        <option value="PAID">PAID</option>
                        <option value="FAILED">FAILED</option>
                      </select>
                      {updatingOrderId === order.id && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    </div>
                  </div>

                  <div className="text-sm text-foreground">مبلغ کل سفارش: <span className="font-semibold">{order.totalPrice.toLocaleString('fa-IR')} ریال</span></div>

                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-secondary/60 text-muted-foreground">
                        <tr>
                          <th className="px-2 py-2 text-right">محصول</th>
                          <th className="px-2 py-2 text-right">تعداد</th>
                          <th className="px-2 py-2 text-right">قیمت واحد</th>
                          <th className="px-2 py-2 text-right">قیمت کل</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item) => (
                          <tr key={item.id} className="border-t border-border">
                            <td className="px-2 py-2">{item.productName}</td>
                            <td className="px-2 py-2">{item.quantity.toLocaleString('fa-IR')}</td>
                            <td className="px-2 py-2">{item.unitPrice.toLocaleString('fa-IR')}</td>
                            <td className="px-2 py-2">{item.totalPrice.toLocaleString('fa-IR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
