import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

type RoleCheckResult = {
  authorized: boolean;
  response?: NextResponse;
  session: Awaited<ReturnType<typeof getServerSession>>;
};

function getActorId(session: Awaited<ReturnType<typeof getServerSession>>): string | null {
  if (!session?.user?.id || typeof session.user.id !== 'string') return null;
  return session.user.id;
}

async function logAuthorizationFailure(details: {
  session: Awaited<ReturnType<typeof getServerSession>>;
  route: string;
  requiredRoles: string[];
  action: string;
}) {
  await prisma.activityLog.create({
    data: {
      actorId: getActorId(details.session),
      action: 'AUTHORIZATION_FAILURE',
      entityType: 'AUTH',
      entityId: null,
      details: JSON.stringify({
        route: details.route,
        requiredRoles: details.requiredRoles,
        action: details.action,
        userRole: details.session?.user?.role ?? null,
      }),
    },
  });
}

export async function requireAnyRole(
  allowedRoles: string[],
  options: { route: string; action: string },
): Promise<RoleCheckResult> {
  const session = await getServerSession(authOptions);

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      session,
    };
  }

  const userRole = session.user?.role;
  if (!userRole || !allowedRoles.includes(userRole)) {
    await logAuthorizationFailure({
      session,
      route: options.route,
      requiredRoles: allowedRoles,
      action: options.action,
    });

    return {
      authorized: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      session,
    };
  }

  return { authorized: true, session };
}

export async function requireRole(
  role: string,
  options: { route: string; action: string },
): Promise<RoleCheckResult> {
  return requireAnyRole([role], options);
}

export { getActorId };
