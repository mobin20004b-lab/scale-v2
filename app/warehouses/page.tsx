'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { Building2, Plus, MapPin, User, CheckCircle2, XCircle, ArchiveRestore, Warehouse, Scale } from 'lucide-react';

export default function WarehousesManagement() {
  const { warehouses, scales, addWarehouse, updateWarehouse, inventory } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newWarehouseName, setNewWarehouseName] = useState('');
  const [newWarehouseLocation, setNewWarehouseLocation] = useState('');
  const [newWarehouseManager, setNewWarehouseManager] = useState('');
  const [newWarehouseCapacity, setNewWarehouseCapacity] = useState(50000);

  const handleAddWarehouse = () => {
    if (!newWarehouseName || !newWarehouseLocation || !newWarehouseManager || !newWarehouseCapacity) return;

    addWarehouse({
      name: newWarehouseName,
      location: newWarehouseLocation,
      managerName: newWarehouseManager,
      capacityKg: newWarehouseCapacity,
    });

    setNewWarehouseName('');
    setNewWarehouseLocation('');
    setNewWarehouseManager('');
    setNewWarehouseCapacity(50000);
    setIsAdding(false);
  };

  const perWarehouse = useMemo(
    () =>
      warehouses.map((warehouse) => {
        const usedCapacity = inventory
          .filter((item) => item.warehouseId === warehouse.id && item.status === 'in_stock')
          .reduce((sum, item) => sum + item.weight, 0);

        return {
          ...warehouse,
          usedCapacity,
          scalesCount: scales.filter((scale) => scale.warehouseId === warehouse.id).length,
          canArchive: scales.every((scale) => scale.warehouseId !== warehouse.id),
        };
      }),
    [warehouses, inventory, scales],
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">مدیریت انبارها</h1>
          <p className="text-muted-foreground mt-1">ساخت، آرشیو و بازیابی انبارها با مشاهده ظرفیت و وابستگی‌ها.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-primary text-primary-foreground font-medium rounded-xl px-4 py-2 hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          افزودن انبار
        </button>
      </div>

      {isAdding && (
        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-4">
          <h2 className="text-xl font-semibold mb-4">افزودن انبار جدید</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">نام انبار</label>
              <input
                type="text"
                placeholder="مثال: انبار مرکزی"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                value={newWarehouseName}
                onChange={(e) => setNewWarehouseName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">موقعیت مکانی</label>
              <input
                type="text"
                placeholder="مثال: تهران، جاده مخصوص"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                value={newWarehouseLocation}
                onChange={(e) => setNewWarehouseLocation(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">مدیر انبار</label>
              <input
                type="text"
                placeholder="مثال: علی رضایی"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                value={newWarehouseManager}
                onChange={(e) => setNewWarehouseManager(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">ظرفیت (کیلوگرم)</label>
              <input
                type="number"
                min={1}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                value={newWarehouseCapacity}
                onChange={(e) => setNewWarehouseCapacity(Number(e.target.value) || 0)}
              />
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
              onClick={handleAddWarehouse}
              disabled={!newWarehouseName || !newWarehouseLocation || !newWarehouseManager || !newWarehouseCapacity}
              className="bg-primary text-primary-foreground font-medium rounded-xl px-4 py-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              ذخیره انبار
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {perWarehouse.map((warehouse) => (
          <div key={warehouse.id} className="bg-card p-6 rounded-3xl border border-border shadow-sm flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${warehouse.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'}`}>
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{warehouse.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    {warehouse.status === 'active' ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <XCircle className="w-3 h-3 text-destructive" />
                    )}
                    {warehouse.status === 'active' ? 'فعال' : warehouse.status === 'archived' ? 'آرشیوشده' : 'غیرفعال'}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 flex-1 mt-4 text-sm">
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground w-20">موقعیت:</span>
                <span className="font-medium">{warehouse.location}</span>
              </div>
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground w-20">مدیر:</span>
                <span className="font-medium">{warehouse.managerName}</span>
              </div>
              <div className="flex items-center gap-3">
                <Warehouse className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground w-20">ظرفیت:</span>
                <span className="font-medium">{warehouse.usedCapacity.toFixed(0)} / {warehouse.capacityKg.toLocaleString('fa-IR')} کیلوگرم</span>
              </div>
              <div className="flex items-center gap-3">
                <Scale className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground w-20">ترازوها:</span>
                <span className="font-medium">{warehouse.scalesCount} دستگاه</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex justify-between items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono" dir="ltr">{warehouse.id}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => updateWarehouse(warehouse.id, { status: warehouse.status === 'active' ? 'inactive' : 'active' })}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {warehouse.status === 'active' ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                </button>
                <button
                  onClick={() => updateWarehouse(warehouse.id, { status: 'active' })}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  بازیابی
                </button>
                <button
                  onClick={() => warehouse.canArchive && updateWarehouse(warehouse.id, { status: 'archived' })}
                  disabled={!warehouse.canArchive}
                  className="text-sm font-medium text-destructive disabled:opacity-40 flex items-center gap-1"
                  title={warehouse.canArchive ? 'آرشیو انبار' : 'ابتدا ترازوهای وابسته را منتقل کنید'}
                >
                  <ArchiveRestore className="w-4 h-4" /> آرشیو
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
