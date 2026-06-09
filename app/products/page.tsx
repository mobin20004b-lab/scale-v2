'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { openLabelPrintWindow } from '@/lib/label-print';
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  LogOut,
  Printer,
  FileText,
} from 'lucide-react';

interface Lot {
  id: string;
  lotNumber: string;
  quantity: number;
  barcode: string;
  qrCode: string;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  barcode: string;
  category: string | null;
  unit: string;
  spoolsPerBag?: number;
  spoolWeight?: number;
  bagWeight?: number;
  brandName?: string | null;
  lots?: Lot[];
}

export default function ProductsManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('kg');
  const [spoolsPerBag, setSpoolsPerBag] = useState('12');
  const [spoolWeight, setSpoolWeight] = useState('0');
  const [bagWeight, setBagWeight] = useState('0');
  const [brandName, setBrandName] = useState('نساجی زنبق');

  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editingLot, setEditingLot] = useState<(Lot & { productName: string; productUnit: string }) | null>(null);
  const [lotQuantity, setLotQuantity] = useState('0');
  const [lotCreatedAt, setLotCreatedAt] = useState('');
  const [isLotSaving, setIsLotSaving] = useState(false);

  const [receiptLot, setReceiptLot] = useState<(Lot & { productName: string; productUnit: string }) | null>(null);
  const [companyName, setCompanyName] = useState('نساجی زنبق');

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    (async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setCompanyName(String(data?.settings?.companyName ?? 'نساجی زنبق'));
        }
      } catch {}
    })();
  }, []);

  const showTemporaryMessage = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setTimeout(() => setter(''), 3000);
  };

  const handleSave = async () => {
    if (!name || !barcode) {
      showTemporaryMessage(setError, 'نام و بارکد الزامی است.');
      return;
    }

    const payload = { name, description, barcode, category, unit, spoolsPerBag: Number(spoolsPerBag || 12), spoolWeight: Number(spoolWeight || 0), bagWeight: Number(bagWeight || 0), brandName };

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showTemporaryMessage(setSuccess, editingProduct ? 'محصول با موفقیت ویرایش شد.' : 'محصول با موفقیت اضافه شد.');
        setName('');
        setDescription('');
        setBarcode('');
        setCategory('');
        setUnit('kg');
    setSpoolsPerBag('12');
    setSpoolWeight('0');
    setBagWeight('0');
    setBrandName('نساجی زنبق');
        setSpoolsPerBag('12');
        setSpoolWeight('0');
        setBagWeight('0');
        setBrandName('نساجی زنبق');
        setIsAdding(false);
        setEditingProduct(null);
        fetchProducts();
      } else {
        showTemporaryMessage(setError, 'خطا در ذخیره محصول.');
      }
    } catch (err) {
      showTemporaryMessage(setError, 'خطای شبکه.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این محصول اطمینان دارید؟')) return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showTemporaryMessage(setSuccess, 'محصول با موفقیت حذف شد.');
        fetchProducts();
      } else {
        showTemporaryMessage(setError, 'خطا در حذف محصول.');
      }
    } catch (err) {
      showTemporaryMessage(setError, 'خطای شبکه.');
    }
  };

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setDescription(product.description || '');
    setBarcode(product.barcode);
    setCategory(product.category || '');
    setUnit(product.unit);
    setSpoolsPerBag(String(product.spoolsPerBag ?? 12));
    setSpoolWeight(String(product.spoolWeight ?? 0));
    setBagWeight(String(product.bagWeight ?? 0));
    setBrandName(product.brandName || 'نساجی زنبق');
    setIsAdding(true);
  };

  const cancelEdit = () => {
    setIsAdding(false);
    setEditingProduct(null);
    setName('');
    setDescription('');
    setBarcode('');
    setCategory('');
    setUnit('kg');
    setSpoolsPerBag('12');
    setSpoolWeight('0');
    setBagWeight('0');
    setBrandName('نساجی زنبق');
  };

  const startEditLot = (lot: Lot, product: Product) => {
    setEditingLot({ ...lot, productName: product.name, productUnit: product.unit });
    setLotQuantity(String(lot.quantity));
    setLotCreatedAt(new Date(lot.createdAt).toISOString().slice(0, 16));
  };

  const handleLotUpdate = async () => {
    if (!editingLot) return;

    const quantityNumber = Number(lotQuantity);
    if (!Number.isFinite(quantityNumber) || quantityNumber < 0 || !lotCreatedAt) {
      showTemporaryMessage(setError, 'موجودی لات و تاریخ/زمان ایجاد باید معتبر باشند.');
      return;
    }

    setIsLotSaving(true);
    try {
      const res = await fetch(`/api/lots/${editingLot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: quantityNumber,
          createdAt: new Date(lotCreatedAt).toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        showTemporaryMessage(setError, data.error || 'خطا در بروزرسانی لات.');
        return;
      }

      setEditingLot(null);
      showTemporaryMessage(setSuccess, 'لات با موفقیت بروزرسانی شد.');
      fetchProducts();
    } catch (err) {
      showTemporaryMessage(setError, 'خطای شبکه در بروزرسانی لات.');
    } finally {
      setIsLotSaving(false);
    }
  };

  const handleLotDelete = async () => {
    if (!editingLot) return;
    if (!confirm('آیا از حذف این لات اطمینان دارید؟')) return;

    setIsLotSaving(true);
    try {
      const res = await fetch(`/api/lots/${editingLot.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        showTemporaryMessage(setError, data.error || 'خطا در حذف لات.');
        return;
      }

      setEditingLot(null);
      showTemporaryMessage(setSuccess, 'لات با موفقیت حذف شد.');
      fetchProducts();
    } catch (err) {
      showTemporaryMessage(setError, 'خطای شبکه در حذف لات.');
    } finally {
      setIsLotSaving(false);
    }
  };

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (p) => p.name.includes(searchTerm) || p.barcode.includes(searchTerm) || (p.category && p.category.includes(searchTerm)),
      ),
    [products, searchTerm],
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">محصولات</h1>
          <p className="text-muted-foreground mt-1">مدیریت کاتالوگ محصولات، لات‌ها و رسید چاپ.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-primary text-primary-foreground font-medium rounded-xl px-4 py-2 hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          افزودن محصول
        </button>
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

      {isAdding && (
        <div id="new-product" className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-4">
          <h2 className="text-xl font-semibold mb-4">{editingProduct ? 'ویرایش محصول' : 'افزودن محصول جدید'}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">نام محصول</label>
              <input
                type="text"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">بارکد</label>
              <input
                type="text"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow text-left"
                dir="ltr"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">دسته‌بندی</label>
              <input
                type="text"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">واحد اندازه‌گیری</label>
              <select
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                <option value="kg">کیلوگرم (kg)</option>
                <option value="g">گرم (g)</option>
                <option value="pcs">عدد (pcs)</option>
                <option value="box">جعبه (box)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-2">توضیحات</label>
              <input
                type="text"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">نام تجاری روی فاکتور</label>
              <input
                type="text"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="مثال: نساجی زنبق"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">تعداد دوک در بسته</label>
              <input
                type="number"
                min="1"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                value={spoolsPerBag}
                onChange={(e) => setSpoolsPerBag(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">وزن هر دوک</label>
              <input
                type="number"
                step="0.001"
                min="0"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                value={spoolWeight}
                onChange={(e) => setSpoolWeight(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">وزن کیسه/گونی خالی</label>
              <input
                type="number"
                step="0.001"
                min="0"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                value={bagWeight}
                onChange={(e) => setBagWeight(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button onClick={cancelEdit} className="px-4 py-2 rounded-xl font-medium text-muted-foreground hover:bg-secondary transition-colors">
              لغو
            </button>
            <button
              onClick={handleSave}
              disabled={!name || !barcode}
              className="bg-primary text-primary-foreground font-medium rounded-xl px-4 py-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {editingProduct ? 'بروزرسانی' : 'ذخیره محصول'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="جستجو در محصولات..."
              className="w-full bg-background border border-border rounded-xl pr-12 pl-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-border bg-secondary/20">
                <th className="px-6 py-4 text-sm font-medium text-muted-foreground">نام محصول</th>
                <th className="px-6 py-4 text-sm font-medium text-muted-foreground">بارکد</th>
                <th className="px-6 py-4 text-sm font-medium text-muted-foreground">دسته‌بندی</th>
                <th className="px-6 py-4 text-sm font-medium text-muted-foreground text-center">موجودی کل</th>
                <th className="px-6 py-4 text-sm font-medium text-muted-foreground">واحد</th>
                <th className="px-6 py-4 text-sm font-medium text-muted-foreground text-left">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    هیچ محصولی یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <React.Fragment key={product.id}>
                    <tr className="hover:bg-secondary/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                            className="p-1 text-muted-foreground hover:bg-secondary rounded-md transition-colors"
                          >
                            {expandedProduct === product.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{product.name}</div>
                            {product.description && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{product.description}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm bg-secondary/50 px-2 py-1 rounded-md" dir="ltr">
                          {product.barcode}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{product.category || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-medium inline-block min-w-16 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                          {product.lots?.reduce((sum, lot) => sum + lot.quantity, 0) || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{product.unit}</td>
                      <td className="px-6 py-4 text-left">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/outgoing?barcode=${encodeURIComponent(product.barcode)}`}
                            className="p-2 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 rounded-lg transition-colors"
                            title="خروج سریع"
                          >
                            <LogOut className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => startEdit(product)}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="ویرایش"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedProduct === product.id && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-secondary/5 border-b border-border">
                          <div className="text-sm font-medium mb-3 mr-4 text-muted-foreground">لیست لات‌های موجود:</div>
                          {!product.lots || product.lots.filter((l) => l.quantity > 0).length === 0 ? (
                            <div className="text-sm text-muted-foreground mr-4">هیچ لات فعالی یافت نشد.</div>
                          ) : (
                            <table className="w-full text-right mb-2 bg-background rounded-xl overflow-hidden border border-border">
                              <thead className="bg-secondary/20 text-muted-foreground text-xs">
                                <tr>
                                  <th className="px-4 py-2 font-medium">شماره لات</th>
                                  <th className="px-4 py-2 font-medium">بارکد لات</th>
                                  <th className="px-4 py-2 font-medium">موجودی</th>
                                  <th className="px-4 py-2 font-medium text-left">تاریخ ایجاد</th>
                                  <th className="px-4 py-2 font-medium text-left">عملیات</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border text-sm">
                                {product.lots
                                  .filter((l) => l.quantity > 0)
                                  .map((lot) => (
                                    <tr key={lot.id} className="hover:bg-secondary/10">
                                      <td className="px-4 py-2 font-mono">{lot.lotNumber}</td>
                                      <td className="px-4 py-2 font-mono">{lot.barcode}</td>
                                      <td className="px-4 py-2 font-medium text-primary">
                                        {lot.quantity} {product.unit}
                                      </td>
                                      <td className="px-4 py-2 text-left text-muted-foreground" dir="ltr">
                                        {new Date(lot.createdAt).toLocaleString('fa-IR')}
                                      </td>
                                      <td className="px-4 py-2">
                                        <div className="flex items-center justify-end gap-1">
                                          <button
                                            onClick={() => startEditLot(lot, product)}
                                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                            title="ویرایش لات"
                                          >
                                            <Edit className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() => setReceiptLot({ ...lot, productName: product.name, productUnit: product.unit })}
                                            className="p-2 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                            title="نمایش رسید چاپ"
                                          >
                                            <FileText className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingLot && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl p-6 space-y-4">
            <h3 className="text-xl font-bold">ویرایش لات {editingLot.lotNumber}</h3>
            <p className="text-sm text-muted-foreground">محصول: {editingLot.productName}</p>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">موجودی / وزن</label>
              <input
                type="number"
                min="0"
                step="0.001"
                className="w-full bg-background border border-border rounded-xl px-4 py-3"
                value={lotQuantity}
                onChange={(e) => setLotQuantity(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">زمان ایجاد (Index time)</label>
              <input
                type="datetime-local"
                className="w-full bg-background border border-border rounded-xl px-4 py-3"
                value={lotCreatedAt}
                onChange={(e) => setLotCreatedAt(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap justify-between gap-2 pt-2">
              <button
                onClick={handleLotDelete}
                disabled={isLotSaving}
                className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-50"
              >
                حذف لات
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingLot(null)}
                  className="px-4 py-2 rounded-xl font-medium text-muted-foreground hover:bg-secondary"
                  disabled={isLotSaving}
                >
                  بستن
                </button>
                <button
                  onClick={handleLotUpdate}
                  disabled={isLotSaving}
                  className="bg-primary text-primary-foreground font-medium rounded-xl px-4 py-2 hover:bg-primary/90 disabled:opacity-50"
                >
                  ذخیره تغییرات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {receiptLot && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 print:static print:bg-transparent print:p-0">
          <div className="w-full max-w-3xl bg-card border border-border rounded-2xl p-6 print:max-w-none print:border-none print:p-0 print:bg-transparent">
            <div className="flex justify-between items-center mb-6 print:hidden">
              <h3 className="text-xl font-bold">پیش‌نمایش رسید لات</h3>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    openLabelPrintWindow({
                      companyName,
                      productName: receiptLot.productName,
                      quantity: receiptLot.quantity,
                      grossWeight: receiptLot.quantity,
                      netWeight: receiptLot.quantity,
                      unit: receiptLot.productUnit,
                      lotNumber: receiptLot.lotNumber,
                      createdAt: receiptLot.createdAt,
                      barcode: receiptLot.barcode,
                      qrCode: receiptLot.qrCode,
                    })
                  }
                  className="bg-primary text-primary-foreground rounded-xl px-4 py-2 flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  چاپ
                </button>
                <button onClick={() => setReceiptLot(null)} className="px-4 py-2 rounded-xl hover:bg-secondary">
                  بستن
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center space-y-4 bg-white p-6 rounded-2xl border border-border sm:w-[10cm] sm:h-[15cm] mx-auto text-black print:w-[10cm] print:h-[15cm] print:border-none print:bg-white print:m-0 print:p-0">
              <h1 className="text-4xl font-extrabold text-center">{companyName}</h1>
              <h1 className="text-2xl font-bold text-center">{receiptLot.productName}</h1>
              <p className="text-2xl font-semibold">
                وزن ناخالص: {receiptLot.quantity} {receiptLot.productUnit}
              </p>
              <p className="text-2xl font-semibold">
                وزن خالص: {receiptLot.quantity} {receiptLot.productUnit}
              </p>
              <p className="text-base text-gray-700" dir="ltr">
                {new Date(receiptLot.createdAt).toLocaleString('fa-IR')}
              </p>
              <div className="py-2 scale-125">
                <Barcode value={receiptLot.barcode} width={2.5} height={80} fontSize={18} displayValue />
              </div>
              <div className="pt-2">
                <QRCodeSVG value={receiptLot.qrCode} size={160} level="M" includeMargin />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
