import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scales = await prisma.scale.findMany({
    include: {
      warehouse: true,
    }
  });
  return NextResponse.json(scales);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();
  
  try {
    const scale = await prisma.scale.create({
      data: {
        name: data.name,
        model: data.model,
        warehouseId: data.warehouseId,
        apiKey: data.apiKey,
        unit: data.unit,
        precision: data.precision,
        heartbeat: data.heartbeat,
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        action: 'CREATE',
        entityType: 'SCALE',
        entityId: scale.id,
        details: JSON.stringify({ name: scale.name })
      }
    });

    return NextResponse.json(scale, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create scale' }, { status: 500 });
  }
}
