import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireAnyRole, getActorId } from '@/lib/authz';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAnyRole(['ADMIN', 'CEO'], { route: '/api/users/[id]/reset-password', action: 'RESET_PASSWORD' });
  if (!auth.authorized) return auth.response!;

  const { id } = await context.params;
  const data = await request.json();
  const newPassword = String(data.password ?? '');

  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'رمز عبور جدید باید حداقل ۸ کاراکتر باشد.' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  const updated = await prisma.user.update({
    where: { id },
    data: { password: passwordHash },
    select: { id: true, username: true, name: true },
  });

  await prisma.activityLog.create({
    data: {
      actorId: getActorId(auth.session),
      action: 'RESET_PASSWORD',
      entityType: 'USER',
      entityId: id,
      details: `Password reset for ${updated.username}`,
    },
  });

  return NextResponse.json({ success: true });
}
