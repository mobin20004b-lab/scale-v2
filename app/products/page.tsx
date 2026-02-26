'use client';

import { useState, useEffect, useMemo } from 'react';
import { Package, Plus, Search, Edit, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  barcode: string;
  category: string | null;
  unit: string;
}

interface InventoryRecord {
  id: string;
  type: 'STOCK_IN' | 'STOCK_OUT' | 'STOCK_IN_UNDO' | 'STOCK_OUT_UNDO';
  quantity: number;
  sourceTxId: string | null;
  createdAt: string;
  warehouse: { id: string; name: string };
  productId: string;
}

export default function ProductsManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('kg');

  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) setProducts(await res.json());
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/inventory');
      if (res.ok) setInventory(await res.json());
    } catch (err) {
      console.error('Failed to fetch inventory', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchInventory();
  }, []);

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
    } catch {
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
    } catch {
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

  const filteredProducts = products.filter((p) => p.name.includes(searchTerm) || p.barcode.includes(searchTerm) || (p.category && p.category.includes(searchTerm)));

  const inventoryByProduct = useMemo(() => {
    return inventory.reduce<Record<string, { quantity: number; latestAt: string | null; incoming: InventoryRecord[]; lots: Set<string> }>>((acc, row) => {
      if (!acc[row.productId]) {
        acc[row.productId] = { quantity: 0, latestAt: null, incoming: [], lots: new Set() };
      }
      const target = acc[row.productId];
      target.quantity += row.type === 'STOCK_IN' ? row.quantity : -row.quantity;
      if (!target.latestAt || new Date(row.createdAt) > new Date(target.latestAt)) {
        target.latestAt = row.createdAt;
      }
      if (row.type === 'STOCK_IN') target.incoming.push(row);
      if (row.sourceTxId) target.lots.add(row.sourceTxId);
      return acc;
    }, {});
  }, [inventory]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">مدیریت محصولات</h1>
          <p className="text-muted-foreground mt-1">نمایش موجودی لحظه‌ای، آخرین بروزرسانی و جزئیات لات‌ها.</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="bg-primary text-primary-foreground font-medium rounded-xl px-4 py-2 hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Plus className="w-5 h-5" />افزودن محصول
        </button>
      </div>

      {error && <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-xl flex items-center gap-2"><AlertCircle className="w-5 h-5" />{error}</div>}
      {success && <div className="bg-emerald-500/10 text-emerald-600 px-4 py-3 rounded-xl flex items-center gap-2"><CheckCircle2 className="w-5 h-5" />{success}</div>}

      {isAdding && (
        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-4">
          <h2 className="text-xl font-semibold mb-4">{editingProduct ? 'ویرایش محصول' : 'افزودن محصول جدید'}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <input className="w-full bg-background border border-border rounded-xl px-4 py-3" value={name} onChange={(e) => setName(e.target.value)} placeholder="نام" />
            <input className="w-full bg-background border border-border rounded-xl px-4 py-3" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="بارکد" />
            <input className="w-full bg-background border border-border rounded-xl px-4 py-3" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="دسته بندی" />
            <select className="w-full bg-background border border-border rounded-xl px-4 py-3" value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="kg">کیلوگرم (kg)</option><option value="g">گرم (g)</option><option value="pcs">عدد (pcs)</option><option value="box">جعبه (box)</option>
            </select>
            <input className="w-full bg-background border border-border rounded-xl px-4 py-3 md:col-span-2" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیحات" />
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button onClick={cancelEdit} className="px-4 py-2 rounded-xl font-medium text-muted-foreground hover:bg-secondary">لغو</button>
            <button onClick={handleSave} disabled={!name || !barcode} className="bg-primary text-primary-foreground font-medium rounded-xl px-4 py-2 disabled:opacity-50">{editingProduct ? 'بروزرسانی' : 'ذخیره محصول'}</button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input type="text" placeholder="جستجو در محصولات..." className="w-full bg-background border border-border rounded-xl pr-12 pl-4 py-2" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-border bg-secondary/20">
                <th className="px-6 py-4 text-sm font-medium text-muted-foreground">نام محصول</th>
                <th className="px-6 py-4 text-sm font-medium text-muted-foreground">موجودی فعلی</th>
                <th className="px-6 py-4 text-sm font-medium text-muted-foreground">آخرین بروزرسانی</th>
                <th className="px-6 py-4 text-sm font-medium text-muted-foreground">لات‌های مرتبط</th>
                <th className="px-6 py-4 text-sm font-medium text-muted-foreground text-left">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProducts.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">هیچ محصولی یافت نشد.</td></tr>
              ) : (
                filteredProducts.map((product) => {
                  const insight = inventoryByProduct[product.id];
                  const lotList = insight ? Array.from(insight.lots) : [];
                  return (
                    <tr key={product.id} className="hover:bg-secondary/10 transition-colors align-top">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Package className="w-5 h-5" /></div>
                          <div>
                            <div className="font-medium text-foreground">{product.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{product.barcode}</div>
                            <details className="mt-2">
                              <summary className="cursor-pointer text-xs text-primary">نمایش ورودی‌های کالا</summary>
                              <ul className="mt-2 text-xs space-y-1 text-muted-foreground">
                                {(insight?.incoming ?? []).slice(0, 6).map((record) => (
                                  <li key={record.id}>{new Date(record.createdAt).toLocaleString('fa-IR')} - {record.quantity.toFixed(2)} {product.unit} - {record.warehouse.name}</li>
                                ))}
                                {(insight?.incoming?.length ?? 0) === 0 && <li>بدون سابقه ورود</li>}
                              </ul>
                            </details>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{(insight?.quantity ?? 0).toFixed(2)} {product.unit}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{insight?.latestAt ? new Date(insight.latestAt).toLocaleString('fa-IR') : '-'}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        <div className="flex flex-wrap gap-1">{lotList.length ? lotList.map((lot) => <span key={lot} className="bg-secondary/40 rounded px-2 py-1 text-xs">{lot}</span>) : '-'}</div>
                      </td>
                      <td className="px-6 py-4 text-left">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => startEdit(product)} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg" title="ویرایش"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(product.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg" title="حذف"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
