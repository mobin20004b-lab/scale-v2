import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const token = `sc_${randomUUID().replaceAll("-", "")}`;
  const updated = await prisma.scale.update({ where: { id: params.id }, data: { apiToken: token } });

  return NextResponse.json({
    scaleId: updated.id,
    token,
    curlExample: `curl -X POST https://example.com/api/external/stock-in -H \"Authorization: Bearer ${token}\" -H \"Content-Type: application/json\" -d '{\"barcode\":\"626...\",\"weight\":12.34}'`
  });
}
