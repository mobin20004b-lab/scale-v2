'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Building2, Plus, MapPin, User, CheckCircle2, XCircle } from 'lucide-react';

export default function WarehousesManagement() {
  const { warehouses, addWarehouse } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newWarehouseName, setNewWarehouseName] = useState('');
  const [newWarehouseLocation, setNewWarehouseLocation] = useState('');
  const [newWarehouseManager, setNewWarehouseManager] = useState('');

  const handleAddWarehouse = () => {
    if (!newWarehouseName || !newWarehouseLocation || !newWarehouseManager) return;
    
    addWarehouse({
      name: newWarehouseName,
      location: newWarehouseLocation,
      managerName: newWarehouseManager,
    });
    
    setNewWarehouseName('');
    setNewWarehouseLocation('');
    setNewWarehouseManager('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">مدیریت انبارها</h1>
          <p className="text-muted-foreground mt-1">مدیریت انبارهای مختلف و اطلاعات آن‌ها.</p>
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
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                نام انبار
              </label>
              <input 
                type="text"
                placeholder="مثال: انبار مرکزی"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                value={newWarehouseName}
                onChange={(e) => setNewWarehouseName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                موقعیت مکانی
              </label>
              <input 
                type="text"
                placeholder="مثال: تهران، جاده مخصوص"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                value={newWarehouseLocation}
                onChange={(e) => setNewWarehouseLocation(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                مدیر انبار
              </label>
              <input 
                type="text"
                placeholder="مثال: علی رضایی"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                value={newWarehouseManager}
                onChange={(e) => setNewWarehouseManager(e.target.value)}
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
              disabled={!newWarehouseName || !newWarehouseLocation || !newWarehouseManager}
              className="bg-primary text-primary-foreground font-medium rounded-xl px-4 py-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              ذخیره انبار
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {warehouses.map(warehouse => (
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
                    {warehouse.status === 'active' ? 'فعال' : 'غیرفعال'}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 flex-1 mt-4">
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground w-20">موقعیت:</span>
                <span className="font-medium">{warehouse.location}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground w-20">مدیر:</span>
                <span className="font-medium">{warehouse.managerName}</span>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
              <span className="text-xs text-muted-foreground font-mono" dir="ltr">{warehouse.id}</span>
              <button className="text-sm font-medium text-primary hover:underline">
                ویرایش
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
