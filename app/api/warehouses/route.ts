import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.warehouse.findMany({ include: { scales: true } });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const payload = await req.json();
  const warehouse = await prisma.warehouse.create({ data: payload });
  return NextResponse.json(warehouse, { status: 201 });
}
