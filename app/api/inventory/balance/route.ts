import { NextResponse } from "next/server";
import { getWarehouseProductBalance } from "@/lib/inventory";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  const warehouseId = searchParams.get("warehouseId");
  if (!productId || !warehouseId) {
    return NextResponse.json({ error: "productId و warehouseId الزامی است" }, { status: 400 });
  }

  const balance = await getWarehouseProductBalance(productId, warehouseId);
  return NextResponse.json({ productId, warehouseId, balance });
}
