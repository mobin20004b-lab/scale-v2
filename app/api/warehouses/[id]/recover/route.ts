import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';


export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const warehouse = await prisma.warehouse.update({
      where: { id: id },
      data: {
        status: 'ACTIVE',
        isDeleted: false,
        deletedAt: null,
        updatedAt: new Date(), // Added updatedAt as per common practice for updates
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
    console.error('Failed to recover warehouse:', error); // Added console.error for better debugging
    return NextResponse.json({ error: 'Failed to recover warehouse' }, { status: 500 });
  }
}
