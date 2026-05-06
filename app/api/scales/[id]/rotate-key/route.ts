import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAnyRole } from '@/lib/authz';


export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAnyRole(['ADMIN', 'CEO'], { route: '/api/scales/[id]/rotate-key', action: 'ROTATE_KEY' });
  if (!auth.authorized) return auth.response!;

  try {
    const result = await prisma.scale.update({
      where: { id },
      data: { apiKey: crypto.randomUUID() },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        actorId: auth.session?.user?.id ?? null,
        action: 'ROTATE_KEY',
        entityType: 'SCALE',
        entityId: id,
        details: JSON.stringify({ scaleId: id }),
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to rotate API key' }, { status: 500 });
  }
}
