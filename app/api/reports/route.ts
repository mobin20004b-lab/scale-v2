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
  const transactionType = searchParams.get('transactionType');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const customerId = searchParams.get('customerId');
  const warehouseId = searchParams.get('warehouseId');
  const productId = searchParams.get('productId');
  const operatorId = searchParams.get('operatorId');
  const search = searchParams.get('search')?.trim();
  const isExport = searchParams.get('export') === 'true';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)));

  try {
    if (type !== 'inventory') {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    // Build dynamic where clause
    const where: Record<string, unknown> = {};

    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {};
      if (startDate) createdAt.gte = new Date(startDate);
      if (endDate) createdAt.lte = new Date(endDate);
      where.createdAt = createdAt;
    }

    if (transactionType && transactionType !== 'ALL') {
      where.type = transactionType;
    }

    if (customerId) where.customerId = customerId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;
    if (operatorId) where.createdBy = operatorId;

    if (search) {
      where.OR = [
        { product: { name: { contains: search, mode: 'insensitive' } } },
        { warehouse: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Get total count for pagination
    const total = await prisma.inventoryLedger.count({ where: where as any });

    // Fetch paginated data (all rows for export)
    const ledgers = await prisma.inventoryLedger.findMany({
      where: where as any,
      include: {
        product: { select: { name: true } },
        warehouse: { select: { name: true } },
        customer: { select: { id: true, name: true } },
        customerOrder: { select: { id: true, status: true, paymentStatus: true } },
      },
      orderBy: { createdAt: 'desc' },
      ...(isExport ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
    });

    // Resolve creator names
    const creatorIds = Array.from(
      new Set(
        ledgers
          .map((l) => l.createdBy)
          .filter((v): v is string => Boolean(v) && v !== 'EXTERNAL_API'),
      ),
    );

    const creators = creatorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, name: true, username: true },
        })
      : [];

    const creatorsById = new Map(
      creators.map((c) => [c.id, c.name || c.username]),
    );

    const rows = ledgers.map((ledger) => ({
      ...ledger,
      operatorName: ledger.createdBy
        ? creatorsById.get(ledger.createdBy) || ledger.createdBy
        : '—',
    }));

    if (isExport) {
      return NextResponse.json({ rows, total });
    }

    // Compute filtered totals (separate aggregation query)
    const aggregation = await prisma.inventoryLedger.aggregate({
      where: where as any,
      _sum: { weight: true, quantity: true },
      _count: true,
    });

    const totals = {
      incoming: 0,
      outgoing: 0,
      transactions: aggregation._count || 0,
    };

    // For accurate incoming/outgoing, sum separately by type
    const byType = await prisma.inventoryLedger.groupBy({
      by: ['type'],
      where: { ...where as any, type: { in: ['STOCK_IN', 'STOCK_OUT'] } },
      _sum: { weight: true },
    });

    for (const entry of byType) {
      const val = entry._sum.weight ?? 0;
      if (entry.type === 'STOCK_IN') totals.incoming += val;
      if (entry.type === 'STOCK_OUT') totals.outgoing += val;
    }

    return NextResponse.json({
      rows,
      totals,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Report API error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}