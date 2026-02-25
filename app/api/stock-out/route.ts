import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stockOutSchema } from "@/lib/validators/stock";
import { getWarehouseProductBalance } from "@/lib/inventory";

export async function POST(req: Request) {
  const data = stockOutSchema.parse(await req.json());
  const available = await getWarehouseProductBalance(data.productId, data.warehouseId);

  if (available < data.qty) {
    return NextResponse.json({ error: "موجودی کافی نیست", available }, { status: 409 });
  }

  const tx = await prisma.$transaction(async (db) => {
    const record = await db.stockOut.create({ data });
    await db.inventoryLedger.create({
      data: { type: "STOCK_OUT", productId: data.productId, warehouseId: data.warehouseId, refId: record.id, qty: data.qty }
    });
    return record;
  });

  return NextResponse.json(tx, { status: 201 });
}
