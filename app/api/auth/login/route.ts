import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { username, password } = await req.json();
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.active) return NextResponse.json({ error: "نام کاربری یا رمز عبور نامعتبر است" }, { status: 401 });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "نام کاربری یا رمز عبور نامعتبر است" }, { status: 401 });

  const token = signSession({ sub: user.id, username: user.username, role: user.role, locale: "fa", rtl: true });
  return NextResponse.json({ token, user: { id: user.id, name: user.name, role: user.role } });
}
