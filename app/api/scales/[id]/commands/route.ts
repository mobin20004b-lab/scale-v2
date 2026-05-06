import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAnyRole } from '@/lib/authz';


export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAnyRole(['ADMIN', 'CEO', 'WAREHOUSE_OPERATOR'], { route: '/api/scales/[id]/commands', action: 'SEND_COMMAND' });
  if (!auth.authorized) return auth.response!;

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
        actorId: auth.session?.user?.id ?? null,
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
  const auth = await requireAnyRole(['ADMIN', 'CEO', 'WAREHOUSE_OPERATOR'], { route: '/api/scales/[id]/commands', action: 'LIST_COMMANDS' });
  if (!auth.authorized) return auth.response!;

  const commands = await prisma.scaleCommand.findMany({
    where: { scaleId: id },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return NextResponse.json(commands);
}
