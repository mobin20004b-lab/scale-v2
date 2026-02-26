import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('productId');
  const warehouseId = searchParams.get('warehouseId');

  const entries = await prisma.inventoryLedger.findMany({
    where: {
      ...(productId ? { productId } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      sourceTxId: { not: null },
    },
    include: {
      product: true,
      warehouse: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const lotsMap = new Map<string, {
    lotNumber: string;
    productId: string;
    productName: string;
    warehouseId: string;
    warehouseName: string;
    availableQuantity: number;
    lastUpdatedAt: string;
  }>();

  for (const entry of entries) {
    if (!entry.sourceTxId) continue;
    const key = `${entry.productId}:${entry.warehouseId}:${entry.sourceTxId}`;

    if (!lotsMap.has(key)) {
      lotsMap.set(key, {
        lotNumber: entry.sourceTxId,
        productId: entry.productId,
        productName: entry.product.name,
        warehouseId: entry.warehouseId,
        warehouseName: entry.warehouse.name,
        availableQuantity: 0,
        lastUpdatedAt: entry.createdAt.toISOString(),
      });
    }

    const lot = lotsMap.get(key)!;
    lot.availableQuantity += entry.type === 'STOCK_IN' ? entry.quantity : -entry.quantity;

    if (new Date(entry.createdAt) > new Date(lot.lastUpdatedAt)) {
      lot.lastUpdatedAt = entry.createdAt.toISOString();
    }
  }

  const lots = Array.from(lotsMap.values())
    .filter((lot) => lot.availableQuantity > 0)
    .sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime());

  return NextResponse.json(lots);
}
