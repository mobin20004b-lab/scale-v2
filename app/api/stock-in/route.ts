import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stockInSchema } from "@/lib/validators/stock";

export async function POST(req: Request) {
  const data = stockInSchema.parse(await req.json());
  const tx = await prisma.$transaction(async (db) => {
    const record = await db.stockIn.create({ data });
    await db.inventoryLedger.create({
      data: { type: "STOCK_IN", productId: data.productId, warehouseId: data.warehouseId, refId: record.id, qty: data.qty }
    });
    return record;
  });
  return NextResponse.json(tx, { status: 201 });
}
