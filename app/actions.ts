'use server';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
  return await prisma.inventoryItem.findMany();
}

export async function createInventoryItem(data: { type: string; weight: number; warehouseId: string; scaleId: string }) {
  return await prisma.inventoryItem.create({
    data,
  });
}

export async function updateInventoryItemStatus(id: string, status: string) {
  return await prisma.inventoryItem.update({
    where: { id },
    data: { status },
  });
}

export async function getUsers() {
  return await prisma.user.findMany();
}

export async function createUser(data: { name: string; email: string; role: string }) {
  return await prisma.user.create({
    data,
  });
}
