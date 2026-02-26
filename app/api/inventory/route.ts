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
      createdAt: 'desc'
    }
  });
  return NextResponse.json(ledgers);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();

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
          quantity: data.quantity,
        }
      });
      lotId = lot.id;
    } else if (data.type === 'STOCK_OUT') {
      if (!lotId) {
        return NextResponse.json({ error: 'Lot ID is required for STOCK_OUT' }, { status: 400 });
      }

      lot = await prisma.lot.update({
        where: { id: lotId },
        data: { quantity: { decrement: data.quantity } }
      });
    }

    const ledger = await prisma.inventoryLedger.create({
      data: {
        type: data.type, // STOCK_IN, STOCK_OUT
        quantity: data.quantity,
        weight: data.weight,
        productId: data.productId,
        warehouseId: data.warehouseId,
        scaleId: data.scaleId,
        lotId: lotId,
        createdBy: session.user.id,
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        action: data.type,
        entityType: 'INVENTORY_LEDGER',
        entityId: ledger.id,
        details: JSON.stringify({ quantity: data.quantity, weight: data.weight, lotId })
      }
    });

    return NextResponse.json({ ledger, lot }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create ledger entry' }, { status: 500 });
  }
}
