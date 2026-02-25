import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const payload = await req.json();
  const item = await prisma.warehouse.update({ where: { id: params.id }, data: payload });
  return NextResponse.json(item);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const [scaleCount, stockInCount, stockOutCount] = await Promise.all([
    prisma.scale.count({ where: { warehouseId: params.id } }),
    prisma.stockIn.count({ where: { warehouseId: params.id } }),
    prisma.stockOut.count({ where: { warehouseId: params.id } })
  ]);

  if (scaleCount + stockInCount + stockOutCount > 0) {
    const archived = await prisma.warehouse.update({ where: { id: params.id }, data: { archivedAt: new Date() } });
    return NextResponse.json({ mode: "ARCHIVED", item: archived, reason: "دارای وابستگی" });
  }

  await prisma.warehouse.delete({ where: { id: params.id } });
  return NextResponse.json({ mode: "DELETED" });
}
