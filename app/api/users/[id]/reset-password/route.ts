import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
      actorId: ((session.user as { id?: string })?.id ?? null) as string | null,
      action: 'RESET_PASSWORD',
      entityType: 'USER',
      entityId: id,
      details: `Password reset for ${updated.username}`,
    },
  });

  return NextResponse.json({ success: true });
}
