import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const scale = await prisma.scale.findUnique({ where: { id: params.id }, include: { commands: true, printJobs: true } });
  if (!scale) return NextResponse.json({ error: "ترازو یافت نشد" }, { status: 404 });
  return NextResponse.json(scale);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const payload = await req.json();
  const scale = await prisma.scale.update({ where: { id: params.id }, data: payload });
  return NextResponse.json(scale);
}
