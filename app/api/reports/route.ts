import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        }
      };
    }

    if (type === 'inventory') {
      const ledgers = await prisma.inventoryLedger.findMany({
        where: dateFilter,
        include: {
          product: true,
          warehouse: true,
        },
        orderBy: { createdAt: 'desc' }
      });
      return NextResponse.json(ledgers);
    } else if (type === 'low-stock') {
      // Basic low stock report
      const inventory = await prisma.inventoryLedger.groupBy({
        by: ['productId', 'warehouseId'],
        _sum: {
          quantity: true,
          weight: true,
        },
        where: {
          type: {
            in: ['STOCK_IN', 'STOCK_IN_UNDO', 'STOCK_OUT', 'STOCK_OUT_UNDO']
          }
        }
      });
      // Filter out those with low stock (e.g., < 10)
      const lowStock = inventory.filter(i => (i._sum.quantity || 0) < 10);
      return NextResponse.json(lowStock);
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
