import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const barcode = searchParams.get("barcode");
  if (!barcode) return NextResponse.json({ error: "barcode لازم است" }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { barcode } });
  if (!product) {
    await prisma.unknownBarcodeEvent.create({ data: { barcode, status: "OPEN" } });
    return NextResponse.json({ resolved: false, status: "OPEN" }, { status: 404 });
  }

  return NextResponse.json({ resolved: true, product });
}
