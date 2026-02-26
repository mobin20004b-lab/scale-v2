'use client';

import { useEffect, useState } from 'react';

type Scale = {
  id: string;
  name: string;
  model: string;
  apiKey: string;
  unit: string;
  precision: number;
  heartbeat: number;
  warehouseId: string;
  warehouse?: { name: string };
};

type Warehouse = { id: string; name: string };

const makeToken = () => `sk_live_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;

export default function ScalesPage() {
  const [scales, setScales] = useState<Scale[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [name, setName] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [model, setModel] = useState('ESP32-WROOM-32');

  const load = async () => {
    const [s, w] = await Promise.all([fetch('/api/scales'), fetch('/api/warehouses')]);
    if (s.ok) setScales(await s.json());
    if (w.ok) {
      const data = await w.json();
      setWarehouses(data);
      if (!warehouseId) setWarehouseId(data[0]?.id ?? '');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addScale = async () => {
    const token = makeToken();
    await fetch('/api/scales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, model, warehouseId, apiKey: token, unit: 'kg', precision: 2, heartbeat: 30 }),
    });
    setName('');
    load();
  };

  const rotate = async (id: string) => {
    await fetch(`/api/scales/${id}/rotate-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: makeToken() }),
    });
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">مدیریت ترازوها</h1>
      <div className="bg-card border border-border rounded-2xl p-4 grid md:grid-cols-4 gap-3">
        <input className="border border-border rounded-xl p-2 bg-background" placeholder="نام ترازو" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="border border-border rounded-xl p-2 bg-background" placeholder="مدل" value={model} onChange={(e) => setModel(e.target.value)} />
        <select className="border border-border rounded-xl p-2 bg-background" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <button onClick={addScale} className="bg-primary text-primary-foreground rounded-xl">ایجاد + تولید توکن</button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {scales.map((scale) => (
          <div key={scale.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
            <p className="font-semibold">{scale.name}</p>
            <p className="text-sm text-muted-foreground">انبار: {scale.warehouse?.name ?? scale.warehouseId}</p>
            <p className="text-xs font-mono" dir="ltr">Token: {scale.apiKey}</p>
            <pre className="text-xs bg-secondary/30 p-2 rounded-xl overflow-auto" dir="ltr">{`curl -X POST $BASE/api/v1/scales/${scale.id}/weight \\
  -H "Authorization: Bearer ${scale.apiKey}" \\
  -H "Content-Type: text/plain" \\
  -d '1500'`}</pre>
            <button onClick={() => rotate(scale.id)} className="bg-secondary rounded-xl px-3 py-1 text-sm">تولید مجدد API Token</button>
          </div>
        ))}
      </div>
    </div>
  );
}
