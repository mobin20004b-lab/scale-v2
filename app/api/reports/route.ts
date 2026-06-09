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
          product: { select: { name: true } },
          warehouse: { select: { name: true } },
          customer: { select: { id: true, name: true } },
          customerOrder: { select: { id: true, status: true, paymentStatus: true } },
        },
        orderBy: { createdAt: 'desc' }
      });

      const creatorIds = Array.from(
        new Set(
          ledgers
            .map((ledger) => ledger.createdBy)
            .filter((value): value is string => Boolean(value) && value !== 'EXTERNAL_API'),
        ),
      );

      const creators = creatorIds.length
        ? await prisma.user.findMany({
            where: { id: { in: creatorIds } },
            select: { id: true, name: true, username: true },
          })
        : [];

      const creatorsById = new Map(
        creators.map((creator) => [creator.id, creator.name || creator.username]),
      );

      const reportRows = ledgers.map((ledger) => ({
        ...ledger,
        operatorName: ledger.createdBy ? creatorsById.get(ledger.createdBy) || ledger.createdBy : '—',
      }));

      return NextResponse.json(reportRows);
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
      const lowStock = inventory.filter((i: (typeof inventory)[number]) => (i._sum.quantity || 0) < 10);
      return NextResponse.json(lowStock);
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
