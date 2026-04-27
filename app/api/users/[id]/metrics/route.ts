import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;

  const [user, totalActivities, loginSessions, recentActivities] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.activityLog.count({ where: { actorId: id } }),
    prisma.session.count({ where: { userId: id } }),
    prisma.activityLog.findMany({
      where: { actorId: id },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        action: true,
        entityType: true,
        details: true,
        createdAt: true,
      },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: 'کاربر پیدا نشد.' }, { status: 404 });
  }

  const metrics = {
    user,
    totals: {
      totalActivities,
      loginSessions,
      recentActivityCount: recentActivities.length,
    },
    recentActivities,
  };

  return NextResponse.json(metrics);
}
