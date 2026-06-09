import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAnyRole, getActorId } from '@/lib/authz';
import { UserRole, UserStatus } from '@/generated/client/enums';

const allowedRoles = new Set<string>(Object.values(UserRole));
const allowedStatuses = new Set<string>(Object.values(UserStatus));


export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAnyRole(['ADMIN', 'CEO'], { route: '/api/users/[id]', action: 'UPDATE_USER' });
  if (!auth.authorized) return auth.response!;

  const { id } = await params;
  const data = await request.json();

  const name = String(data.name ?? '').trim();
  const email = String(data.email ?? '').trim().toLowerCase();
  const username = String(data.username ?? '').trim().toLowerCase();
  const role = String(data.role ?? 'WAREHOUSE_OPERATOR');
  const status = String(data.status ?? 'ACTIVE');

  if (!id || !name || !email || !username) {
    return NextResponse.json({ error: 'تمام فیلدهای ضروری را وارد کنید.' }, { status: 400 });
  }

  if (!allowedRoles.has(role)) {
    return NextResponse.json({ error: 'نقش کاربری معتبر نیست.' }, { status: 400 });
  }

  if (!allowedStatuses.has(status)) {
    return NextResponse.json({ error: 'وضعیت کاربری معتبر نیست.' }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        username,
        role: role as UserRole,
        status: status as UserStatus,
        isActive: status === 'ACTIVE',
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
        actorId: getActorId(auth.session),
        action: 'UPDATE_USER',
        entityType: 'USER',
        entityId: id,
        details: `Updated user ${user.username}`,
      },
    });

    return NextResponse.json(user);
  } catch (error: unknown) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
    const message =
      code === 'P2002'
        ? 'نام کاربری یا ایمیل تکراری است.'
        : code === 'P2025'
          ? 'کاربر موردنظر یافت نشد.'
          : 'بروزرسانی کاربر ناموفق بود.';

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
