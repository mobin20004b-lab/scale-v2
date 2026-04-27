import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { UserRole, UserStatus } from '@/generated/client/enums';

const allowedRoles = new Set<string>(Object.values(UserRole));
const allowedStatuses = new Set<string>(Object.values(UserStatus));

function getActorId(session: Awaited<ReturnType<typeof getServerSession>>) {
  const user = session?.user as { id?: string } | undefined;
  return user?.id ?? null;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get('search')?.trim();
  const role = searchParams.get('role')?.trim();
  const status = searchParams.get('status')?.trim();

  const users = await prisma.user.findMany({
    where: {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { username: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(role && allowedRoles.has(role) ? { role: role as UserRole } : {}),
      ...(status && allowedStatuses.has(status) ? { status: status as UserStatus } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      status: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          activities: true,
          sessions: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const data = await request.json();
  const name = String(data.name ?? '').trim();
  const email = String(data.email ?? '').trim().toLowerCase();
  const username = String(data.username ?? '').trim().toLowerCase();
  const password = String(data.password ?? '');
  const role = String(data.role ?? 'WAREHOUSE_OPERATOR');

  if (!name || !email || !username || !password) {
    return NextResponse.json({ error: 'تمام فیلدهای ضروری را وارد کنید.' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'رمز عبور باید حداقل ۸ کاراکتر باشد.' }, { status: 400 });
  }

  if (!allowedRoles.has(role)) {
    return NextResponse.json({ error: 'نقش کاربری معتبر نیست.' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        username,
        role: role as UserRole,
        password: passwordHash,
        status: 'ACTIVE',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        status: true,
        isActive: true,
        createdAt: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        actorId: getActorId(session),
        action: 'CREATE_USER',
        entityType: 'USER',
        entityId: user.id,
        details: `Created user ${user.username}`,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error: unknown) {
    const message =
      typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
        ? 'نام کاربری یا ایمیل تکراری است.'
        : 'ایجاد کاربر ناموفق بود.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
