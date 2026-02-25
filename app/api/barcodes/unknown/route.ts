import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.unknownBarcodeEvent.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json(items);
}

export async function PATCH(req: Request) {
  const { id, status, note } = await req.json();
  const updated = await prisma.unknownBarcodeEvent.update({ where: { id }, data: { status, note } });
  return NextResponse.json(updated);
}
