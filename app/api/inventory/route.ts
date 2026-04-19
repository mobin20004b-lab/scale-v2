import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ledgers = await prisma.inventoryLedger.findMany({
    include: {
      product: true,
      warehouse: true,
      scale: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  return NextResponse.json(ledgers);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();

  const quantity = Number(data.quantity);
  const weight = Number(data.weight);

  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(weight) || weight <= 0) {
    return NextResponse.json({ error: 'Quantity and weight must be positive numbers' }, { status: 400 });
  }

  try {
    let lotId = data.lotId || null;
    let lot = null;

    if (data.type === 'STOCK_IN') {
      const timestamp = Date.now();
      const lotNumber = `LT-${timestamp}`;
      const barcode = `B-${timestamp}`;
      const qrCode = `QR-${timestamp}`;

      lot = await prisma.lot.create({
        data: {
          lotNumber,
          barcode,
          qrCode,
          productId: data.productId,
          quantity,
        },
      });
      lotId = lot.id;
    } else if (data.type === 'STOCK_OUT') {
      if (!lotId) {
        return NextResponse.json({ error: 'Lot ID is required for STOCK_OUT' }, { status: 400 });
      }

      const targetLot = await prisma.lot.findUnique({
        where: { id: lotId },
        select: { id: true, productId: true, quantity: true },
      });

      if (!targetLot) {
        return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
      }

      if (targetLot.productId !== data.productId) {
        return NextResponse.json({ error: 'Selected lot does not belong to this product' }, { status: 400 });
      }

      if (targetLot.quantity < quantity) {
        return NextResponse.json(
          { error: `Insufficient stock in lot. Available: ${targetLot.quantity}` },
          { status: 400 },
        );
      }

      lot = await prisma.lot.update({
        where: { id: lotId },
        data: { quantity: { decrement: quantity } },
      });
    } else {
      return NextResponse.json({ error: 'Unsupported inventory type' }, { status: 400 });
    }

    const ledger = await prisma.inventoryLedger.create({
      data: {
        type: data.type,
        quantity,
        weight,
        productId: data.productId,
        warehouseId: data.warehouseId,
        scaleId: data.scaleId,
        lotId,
        createdBy: session.user.id,
      },
    });

    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        action: data.type,
        entityType: 'INVENTORY_LEDGER',
        entityId: ledger.id,
        details: JSON.stringify({ quantity, weight, lotId }),
      },
    });

    return NextResponse.json({ ledger, lot }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create ledger entry' }, { status: 500 });
  }
}
