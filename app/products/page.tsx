'use client';

import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Edit, Trash2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface Lot {
  id: string;
  lotNumber: string;
  quantity: number;
  barcode: string;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  barcode: string;
  category: string | null;
  unit: string;
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

  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
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
    fetchProducts();
  }, []);

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

  const handleSave = async () => {
    if (!name || !barcode) {
      setError('نام و بارکد الزامی است.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const payload = { name, description, barcode, category, unit };

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccess(editingProduct ? 'محصول با موفقیت ویرایش شد.' : 'محصول با موفقیت اضافه شد.');
        setTimeout(() => setSuccess(''), 3000);

        setName('');
        setDescription('');
        setBarcode('');
        setCategory('');
        setUnit('kg');
        setIsAdding(false);
        setEditingProduct(null);

        fetchProducts();
      } else {
        setError('خطا در ذخیره محصول.');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      setError('خطای شبکه.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این محصول اطمینان دارید؟')) return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('محصول با موفقیت حذف شد.');
        setTimeout(() => setSuccess(''), 3000);
        fetchProducts();
      } else {
        setError('خطا در حذف محصول.');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      setError('خطای شبکه.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setDescription(product.description || '');
    setBarcode(product.barcode);
    setCategory(product.category || '');
    setUnit(product.unit);
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
  };

  const filteredProducts = products.filter(p =>
    p.name.includes(searchTerm) || p.barcode.includes(searchTerm) || (p.category && p.category.includes(searchTerm))
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">مدیریت محصولات</h1>
          <p className="text-muted-foreground mt-1">مدیریت کاتالوگ محصولات و بارکدها.</p>
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
        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-4">
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
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button
              onClick={cancelEdit}
              className="px-4 py-2 rounded-xl font-medium text-muted-foreground hover:bg-secondary transition-colors"
            >
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
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
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
                            {product.description && (
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {product.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm bg-secondary/50 px-2 py-1 rounded-md" dir="ltr">
                          {product.barcode}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {product.category || '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-medium inline-block min-w-16 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                          {product.lots?.reduce((sum, lot) => sum + lot.quantity, 0) || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {product.unit}
                      </td>
                      <td className="px-6 py-4 text-left">
                        <div className="flex items-center justify-end gap-2">
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
                          {(!product.lots || product.lots.filter(l => l.quantity > 0).length === 0) ? (
                            <div className="text-sm text-muted-foreground mr-4">هیچ لات فعالی یافت نشد.</div>
                          ) : (
                            <table className="w-full text-right mb-2 bg-background rounded-xl overflow-hidden border border-border">
                              <thead className="bg-secondary/20 text-muted-foreground text-xs">
                                <tr>
                                  <th className="px-4 py-2 font-medium">شماره لات</th>
                                  <th className="px-4 py-2 font-medium">بارکد لات</th>
                                  <th className="px-4 py-2 font-medium">موجودی</th>
                                  <th className="px-4 py-2 font-medium text-left">تاریخ ایجاد</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border text-sm">
                                {product.lots.filter(l => l.quantity > 0).map(lot => (
                                  <tr key={lot.id} className="hover:bg-secondary/10">
                                    <td className="px-4 py-2 font-mono">{lot.lotNumber}</td>
                                    <td className="px-4 py-2 font-mono">{lot.barcode}</td>
                                    <td className="px-4 py-2 font-medium text-primary">{lot.quantity} {product.unit}</td>
                                    <td className="px-4 py-2 text-left text-muted-foreground" dir="ltr">
                                      {new Date(lot.createdAt).toLocaleString('fa-IR')}
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
    </div>
  );
}
