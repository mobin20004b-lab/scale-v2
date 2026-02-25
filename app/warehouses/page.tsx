'use client';

import { useEffect, useState } from 'react';

type Warehouse = {
  id: string;
  name: string;
  location: string | null;
  managerName: string | null;
  capacityKg: number;
  status: string;
};

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [managerName, setManagerName] = useState('');
  const [capacityKg, setCapacityKg] = useState('0');

  const load = async () => {
    const res = await fetch('/api/warehouses');
    if (res.ok) setWarehouses(await res.json());
  };

  useEffect(() => { load(); }, []);

  const createWarehouse = async () => {
    await fetch('/api/warehouses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, location, managerName, capacityKg: Number(capacityKg) }),
    });
    setName('');
    setLocation('');
    setManagerName('');
    setCapacityKg('0');
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">مدیریت انبارها</h1>

      <div className="bg-card border border-border rounded-2xl p-4 grid md:grid-cols-4 gap-3">
        <input className="border border-border rounded-xl p-2 bg-background" placeholder="نام انبار" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="border border-border rounded-xl p-2 bg-background" placeholder="موقعیت" value={location} onChange={(e) => setLocation(e.target.value)} />
        <input className="border border-border rounded-xl p-2 bg-background" placeholder="مسئول" value={managerName} onChange={(e) => setManagerName(e.target.value)} />
        <input className="border border-border rounded-xl p-2 bg-background" placeholder="ظرفیت(کیلو)" value={capacityKg} onChange={(e) => setCapacityKg(e.target.value)} />
        <button onClick={createWarehouse} className="md:col-span-4 bg-primary text-primary-foreground rounded-xl py-2">افزودن انبار</button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {warehouses.map((warehouse) => (
          <div key={warehouse.id} className="bg-card border border-border rounded-2xl p-4">
            <p className="font-semibold">{warehouse.name}</p>
            <p className="text-sm text-muted-foreground">{warehouse.location}</p>
            <p className="text-sm">مسئول: {warehouse.managerName || '-'}</p>
            <p className="text-sm">ظرفیت: {warehouse.capacityKg} کیلوگرم</p>
            <p className="text-xs">وضعیت: {warehouse.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
