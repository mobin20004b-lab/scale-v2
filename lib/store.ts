import { create } from 'zustand';

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  managerName: string;
  status: 'active' | 'inactive';
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
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'date' | 'status'>) => InventoryItem;
  removeInventoryItem: (id: string) => void;
  updateScaleWeight: (id: string, weight: number) => void;
  addScale: (scale: Omit<Scale, 'id' | 'currentWeight' | 'status' | 'uptime'>) => void;
  regenerateApiKey: (id: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  warehouses: [
    {
      id: 'wh-1',
      name: 'انبار مرکزی تهران',
      location: 'تهران، جاده مخصوص',
      managerName: 'علی رضایی',
      status: 'active',
    },
    {
      id: 'wh-2',
      name: 'انبار توزیع کرج',
      location: 'کرج، شهرک صنعتی',
      managerName: 'محمد حسینی',
      status: 'active',
    }
  ],
  scales: [
    {
      id: 'scale-1',
      name: 'ترازوی سکوی اصلی',
      apiKey: 'sk_test_123',
      model: 'ESP32-WROOM-32',
      uptime: '۱۴ روز ۲ ساعت',
      status: 'online',
      currentWeight: 0,
      warehouseId: 'wh-1',
    },
    {
      id: 'scale-2',
      name: 'ترازوی سکوی دوم',
      apiKey: 'sk_test_456',
      model: 'ESP32-S3',
      uptime: '۵ روز ۱۲ ساعت',
      status: 'online',
      currentWeight: 0,
      warehouseId: 'wh-1',
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
        scale.id === id ? { ...scale, currentWeight: weight } : scale
      )
    }));
  },
  addScale: (scale) => {
    const newScale: Scale = {
      ...scale,
      id: `scale-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'online',
      uptime: '۰ دقیقه',
      currentWeight: 0
    };
    set((state) => ({ scales: [...state.scales, newScale] }));
  },
  regenerateApiKey: (id) => {
    set((state) => ({
      scales: state.scales.map(scale => 
        scale.id === id ? { ...scale, apiKey: `sk_live_${Math.random().toString(36).substring(2, 15)}` } : scale
      )
    }));
  }
}));
