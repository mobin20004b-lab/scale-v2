import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';


export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();

  try {
    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: {
        name: data.name,
        location: data.location,
        managerName: data.managerName,
        capacityKg: Number(data.capacityKg || 0),
        updatedAt: new Date(),
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        action: 'UPDATE',
        entityType: 'WAREHOUSE',
        entityId: warehouse.id,
        details: JSON.stringify({ name: warehouse.name, ...data }) // Merging original and new data for details
      }
    });

    return NextResponse.json(warehouse);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update warehouse' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        scales: true,
        ledgerEntries: true,
      },
    });

    if (!warehouse) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    // Check if there are dependent records
    const hasDependents = warehouse.scales.length > 0 || warehouse.ledgerEntries.length > 0;

    if (hasDependents) {
      // Archive instead of delete
      await prisma.warehouse.update({
        where: { id },
        data: {
          status: 'ARCHIVED',
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      await prisma.activityLog.create({
        data: {
          actorId: session.user.id,
          action: 'DELETE', // Log as DELETE action even if it's a soft delete/archive
          entityType: 'WAREHOUSE',
          entityId: id,
          details: JSON.stringify({ softDelete: true, reason: 'Has dependent records' }),
        },
      });

      return NextResponse.json({ success: true, message: 'Warehouse archived due to dependencies' });
    }

    // Hard delete if no dependencies
    await prisma.warehouse.delete({
      where: { id },
    });

    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        action: 'DELETE',
        entityType: 'WAREHOUSE',
        entityId: id,
        details: JSON.stringify({ softDelete: false }),
      },
    });

    return NextResponse.json({ success: true, message: 'Warehouse deleted successfully' });
  } catch (error) {
    console.error('Failed to delete warehouse:', error);
    return NextResponse.json({ error: 'Failed to delete warehouse' }, { status: 500 });
  }
}
