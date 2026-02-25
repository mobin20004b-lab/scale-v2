import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';


export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logs = await prisma.activityLog.findMany({
    include: {
      actor: {
        select: {
          name: true,
          email: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 50 // Limit to recent 50 for dashboard
  });
  return NextResponse.json(logs);
}
