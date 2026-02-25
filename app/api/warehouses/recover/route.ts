import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { id } = await req.json();
  const item = await prisma.warehouse.update({ where: { id }, data: { archivedAt: null } });
  return NextResponse.json(item);
}
