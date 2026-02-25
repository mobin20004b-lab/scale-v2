import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';


export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const warehouse = await prisma.warehouse.update({
      where: { id: params.id },
      data: {
        status: 'ACTIVE',
        isDeleted: false,
        deletedAt: null,
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        action: 'RECOVER',
        entityType: 'WAREHOUSE',
        entityId: warehouse.id,
        details: JSON.stringify({ name: warehouse.name })
      }
    });

    return NextResponse.json(warehouse);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to recover warehouse' }, { status: 500 });
  }
}
