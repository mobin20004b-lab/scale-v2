'use server';

import { prisma } from '@/lib/prisma';
// Using any for now to bypass inconsistent Prisma type exports in this environment
type LedgerType = any;
type UserRole = any;

export async function getWarehouses() {
  return await prisma.warehouse.findMany();
}

export async function createWarehouse(data: { name: string; location: string; managerName: string }) {
  return await prisma.warehouse.create({
    data,
  });
}

export async function getScales() {
  return await prisma.scale.findMany();
}

export async function createScale(data: { name: string; model: string; warehouseId: string; apiKey: string }) {
  return await prisma.scale.create({
    data,
  });
}

export async function updateScaleApiKey(id: string, apiKey: string) {
  return await prisma.scale.update({
    where: { id },
    data: { apiKey },
  });
}

export async function getInventory() {
  return await prisma.inventoryLedger.findMany();
}

export async function createInventoryEntry(data: { type: LedgerType; weight: number; warehouseId: string; productId: string; scaleId?: string }) {
  return await prisma.inventoryLedger.create({
    data: {
      ...data,
      quantity: 1, // Default quantity for ledger entry if not specified
    },
  });
}

export async function getUsers() {
  return await prisma.user.findMany();
}

export async function createUser(data: { name: string; email: string; role: UserRole; username: string }) {
  // In a real app, you would probably also set a default password or handle it differently
  return await prisma.user.create({
    data: {
      ...data,
      password: 'change-me', // Placeholder password
      status: 'ACTIVE',
      isActive: true,
    },
  });
}
