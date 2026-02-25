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

  const data = await request.json();

  try {
    const command = await prisma.scaleCommand.create({
      data: {
        ...data,
        scaleId: id,
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        action: 'SEND_COMMAND',
        entityType: 'SCALE_COMMAND',
        entityId: command.id,
        details: JSON.stringify(data)
      }
    });

    return NextResponse.json(command, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to queue command' }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const commands = await prisma.scaleCommand.findMany({
    where: { scaleId: id },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return NextResponse.json(commands);
}
