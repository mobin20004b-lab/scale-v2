import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const ledger = await prisma.inventoryLedger.findMany({ orderBy: { createdAt: "desc" }, take: 300 });
  return NextResponse.json(ledger);
}
