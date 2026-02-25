import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productBatchSchema } from "@/lib/validators/product";

export async function POST(req: Request) {
  const payload = productBatchSchema.parse(await req.json());
  const result = await prisma.product.createMany({ data: payload.items, skipDuplicates: true });
  return NextResponse.json({ inserted: result.count });
}
