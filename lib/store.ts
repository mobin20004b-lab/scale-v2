import { create } from 'zustand';

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  managerName: string;
  capacityKg: number;
  status: 'active' | 'inactive' | 'archived';
}

export interface Scale {
  id: string;
  name: string;
  apiKey: string;
  model: string;
  uptime: string;
  status: 'online' | 'offline';
  currentWeight: number;
  warehouseId: string;
  unit: 'kg' | 'g' | 'ton';
  precision: number;
  heartbeatSec: number;
  firmwareVersion: string;
  signal: 'fresh' | 'stale';
}

export interface InventoryItem {
  id: string;
  type: string;
  weight: number;
  date: string;
  status: 'in_stock' | 'removed';
  warehouseId: string;
}

interface AppState {
  warehouses: Warehouse[];
  scales: Scale[];
  inventory: InventoryItem[];
  addWarehouse: (warehouse: Omit<Warehouse, 'id' | 'status'>) => void;
  updateWarehouse: (id: string, updates: Partial<Pick<Warehouse, 'name' | 'location' | 'managerName' | 'capacityKg' | 'status'>>) => void;
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'date' | 'status'>) => InventoryItem;
  removeInventoryItem: (id: string) => void;
  updateScaleWeight: (id: string, weight: number) => void;
  addScale: (scale: Omit<Scale, 'id' | 'currentWeight' | 'status' | 'uptime' | 'signal'>) => void;
  regenerateApiKey: (id: string) => string | null;
  updateScaleConfig: (id: string, updates: Partial<Pick<Scale, 'unit' | 'precision' | 'heartbeatSec' | 'firmwareVersion'>>) => void;
}

const createApiToken = () => {
  const randomPart = `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  return `sk_live_${randomPart.slice(0, 24)}`;
};

export const useStore = create<AppState>((set) => ({
  warehouses: [
    {
      id: 'wh-1',
      name: 'انبار مرکزی تهران',
      location: 'تهران، جاده مخصوص',
      managerName: 'علی رضایی',
      capacityKg: 200000,
      status: 'active',
    },
    {
      id: 'wh-2',
      name: 'انبار توزیع کرج',
      location: 'کرج، شهرک صنعتی',
      managerName: 'محمد حسینی',
      capacityKg: 85000,
      status: 'active',
    }
  ],
  scales: [
    {
      id: 'scale-1',
      name: 'ترازوی سکوی اصلی',
      apiKey: createApiToken(),
      model: 'ESP32-WROOM-32',
      uptime: '۱۴ روز ۲ ساعت',
      status: 'online',
      currentWeight: 0,
      warehouseId: 'wh-1',
      unit: 'kg',
      precision: 2,
      heartbeatSec: 15,
      firmwareVersion: '1.3.4',
      signal: 'fresh',
    },
    {
      id: 'scale-2',
      name: 'ترازوی سکوی دوم',
      apiKey: createApiToken(),
      model: 'ESP32-S3',
      uptime: '۵ روز ۱۲ ساعت',
      status: 'online',
      currentWeight: 0,
      warehouseId: 'wh-1',
      unit: 'kg',
      precision: 1,
      heartbeatSec: 30,
      firmwareVersion: '2.0.1',
      signal: 'fresh',
    }
  ],
  inventory: [
    {
      id: 'INV-1001',
      type: 'سیب ارگانیک',
      weight: 1250.5,
      date: new Date().toISOString(),
      status: 'in_stock',
      warehouseId: 'wh-1',
    }
  ],
  addWarehouse: (warehouse) => {
    const newWarehouse: Warehouse = {
      ...warehouse,
      id: `wh-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'active',
    };
    set((state) => ({ warehouses: [...state.warehouses, newWarehouse] }));
  },
  updateWarehouse: (id, updates) => {
    set((state) => ({
      warehouses: state.warehouses.map((warehouse) => (warehouse.id === id ? { ...warehouse, ...updates } : warehouse)),
    }));
  },
  addInventoryItem: (item) => {
    const newItem: InventoryItem = {
      ...item,
      id: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      status: 'in_stock'
    };
    set((state) => ({ inventory: [newItem, ...state.inventory] }));
    return newItem;
  },
  removeInventoryItem: (id) => {
    set((state) => ({
      inventory: state.inventory.map(item =>
        item.id === id ? { ...item, status: 'removed' } : item
      )
    }));
  },
  updateScaleWeight: (id, weight) => {
    set((state) => ({
      scales: state.scales.map(scale =>
        scale.id === id ? { ...scale, currentWeight: weight, signal: 'fresh' } : scale
      )
    }));
  },
  addScale: (scale) => {
    const newScale: Scale = {
      ...scale,
      id: `scale-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'online',
      uptime: '۰ دقیقه',
      currentWeight: 0,
      signal: 'fresh',
    };
    set((state) => ({ scales: [...state.scales, newScale] }));
  },
  regenerateApiKey: (id) => {
    const token = createApiToken();
    set((state) => ({
      scales: state.scales.map(scale =>
        scale.id === id ? { ...scale, apiKey: token } : scale
      )
    }));
    return token;
  },
  updateScaleConfig: (id, updates) => {
    set((state) => ({
      scales: state.scales.map((scale) => (scale.id === id ? { ...scale, ...updates } : scale)),
    }));
  },
}));
