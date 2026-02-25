import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productCreateSchema } from "@/lib/validators/product";

export async function GET() {
  const items = await prisma.product.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const payload = productCreateSchema.parse(await req.json());
  const item = await prisma.product.create({ data: payload });
  return NextResponse.json(item, { status: 201 });
}
