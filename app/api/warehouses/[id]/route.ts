import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();
  
  try {
    const warehouse = await prisma.warehouse.update({
      where: { id: params.id },
      data: {
        name: data.name,
        location: data.location,
        managerName: data.managerName,
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        action: 'UPDATE',
        entityType: 'WAREHOUSE',
        entityId: warehouse.id,
        details: JSON.stringify({ name: warehouse.name })
      }
    });

    return NextResponse.json(warehouse);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update warehouse' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check for dependent scales or transactions
    const hasScales = await prisma.scale.count({ where: { warehouseId: params.id } });
    const hasLedgers = await prisma.inventoryLedger.count({ where: { warehouseId: params.id } });

    if (hasScales > 0 || hasLedgers > 0) {
      // Archive instead of delete
      const warehouse = await prisma.warehouse.update({
        where: { id: params.id },
        data: {
          status: 'ARCHIVED',
          isDeleted: true,
          deletedAt: new Date(),
        }
      });
      
      await prisma.activityLog.create({
        data: {
          actorId: session.user.id,
          action: 'ARCHIVE',
          entityType: 'WAREHOUSE',
          entityId: warehouse.id,
          details: JSON.stringify({ reason: 'Has dependent records' })
        }
      });

      return NextResponse.json({ success: true, message: 'Warehouse archived' });
    }

    // Hard delete if no dependencies
    await prisma.warehouse.delete({
      where: { id: params.id }
    });
    
    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        action: 'DELETE',
        entityType: 'WAREHOUSE',
        entityId: params.id,
      }
    });

    return NextResponse.json({ success: true, message: 'Warehouse deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete warehouse' }, { status: 500 });
  }
}
