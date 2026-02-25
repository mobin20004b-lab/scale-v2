import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';


export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();
  
  try {
    const command = await prisma.scaleCommand.create({
      data: {
        scaleId: params.id,
        command: data.command, // JSON payload stringified
        status: 'PENDING',
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        action: 'SEND_COMMAND',
        entityType: 'SCALE',
        entityId: params.id,
        details: JSON.stringify({ commandId: command.id })
      }
    });

    return NextResponse.json(command, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to queue command' }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const commands = await prisma.scaleCommand.findMany({
    where: { scaleId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  
  return NextResponse.json(commands);
}
