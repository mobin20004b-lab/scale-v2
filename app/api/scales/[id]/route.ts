import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';


export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();
  
  try {
    const scale = await prisma.scale.update({
      where: { id: params.id },
      data: {
        name: data.name,
        model: data.model,
        warehouseId: data.warehouseId,
        unit: data.unit,
        precision: data.precision,
        heartbeat: data.heartbeat,
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        action: 'UPDATE',
        entityType: 'SCALE',
        entityId: scale.id,
        details: JSON.stringify({ name: scale.name })
      }
    });

    return NextResponse.json(scale);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update scale' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check for dependent transactions or commands
    const hasCommands = await prisma.scaleCommand.count({ where: { scaleId: params.id } });
    const hasLedgers = await prisma.inventoryLedger.count({ where: { scaleId: params.id } });

    if (hasCommands > 0 || hasLedgers > 0) {
      // Archive instead of delete
      const scale = await prisma.scale.update({
        where: { id: params.id },
        data: {
          status: 'ARCHIVED'
        }
      });
      
      await prisma.activityLog.create({
        data: {
          actorId: session.user.id,
          action: 'ARCHIVE',
          entityType: 'SCALE',
          entityId: scale.id,
          details: JSON.stringify({ reason: 'Has dependent records' })
        }
      });

      return NextResponse.json({ success: true, message: 'Scale archived' });
    }

    // Hard delete if no dependencies
    await prisma.scale.delete({
      where: { id: params.id }
    });
    
    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        action: 'DELETE',
        entityType: 'SCALE',
        entityId: params.id,
      }
    });

    return NextResponse.json({ success: true, message: 'Scale deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete scale' }, { status: 500 });
  }
}
