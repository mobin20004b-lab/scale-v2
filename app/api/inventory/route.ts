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
    const ledger = await prisma.inventoryLedger.create({
      data: {
        type: data.type, // STOCK_IN, STOCK_OUT
        quantity: data.quantity,
        weight: data.weight,
        productId: data.productId,
        warehouseId: data.warehouseId,
        scaleId: data.scaleId,
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
        details: JSON.stringify({ quantity: data.quantity, weight: data.weight })
      }
    });

    return NextResponse.json(ledger, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create ledger entry' }, { status: 500 });
  }
}
