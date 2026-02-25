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
    const scale = await prisma.scale.update({
      where: { id: params.id },
      data: {
        apiKey: data.apiKey,
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        action: 'ROTATE_API_KEY',
        entityType: 'SCALE',
        entityId: scale.id,
        details: JSON.stringify({ name: scale.name })
      }
    });

    return NextResponse.json(scale);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to rotate API key' }, { status: 500 });
  }
}
