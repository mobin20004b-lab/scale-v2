import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();

  const quantity = Number(body.quantity);
  const createdAt = body.createdAt ? new Date(body.createdAt) : null;

  if (!Number.isFinite(quantity) || quantity < 0) {
    return NextResponse.json({ error: 'Quantity must be a non-negative number' }, { status: 400 });
  }

  if (!createdAt || Number.isNaN(createdAt.getTime())) {
    return NextResponse.json({ error: 'createdAt is required and must be a valid datetime' }, { status: 400 });
  }

  try {
    const lot = await prisma.lot.update({
      where: { id },
      data: {
        quantity,
        createdAt,
      },
      include: {
        product: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        action: 'LOT_UPDATE',
        entityType: 'LOT',
        entityId: lot.id,
        details: JSON.stringify({ quantity, createdAt }),
      },
    });

    return NextResponse.json(lot);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update lot' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const relatedLedgers = await prisma.inventoryLedger.count({
      where: { lotId: id },
    });

    if (relatedLedgers > 0) {
      return NextResponse.json(
        { error: 'Cannot delete lot with inventory history. Set quantity to zero instead.' },
        { status: 400 },
      );
    }

    const lot = await prisma.lot.delete({
      where: { id },
    });

    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        action: 'LOT_DELETE',
        entityType: 'LOT',
        entityId: lot.id,
        details: JSON.stringify({ lotNumber: lot.lotNumber }),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete lot' }, { status: 500 });
  }
}
