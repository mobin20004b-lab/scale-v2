import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { id } = await req.json();
  const item = await prisma.product.update({
    where: { id },
    data: { deletedAt: null, deleteCommitAt: null }
  });
  return NextResponse.json(item);
}
