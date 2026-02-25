import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const pending = await prisma.scaleCommand.findMany({
    where: { scaleId: params.id, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 30
  });
  return NextResponse.json(pending);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const item = await prisma.scaleCommand.create({
    data: {
      scaleId: params.id,
      command: body.command,
      payload: body.payload ?? {},
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null
    }
  });
  return NextResponse.json(item, { status: 201 });
}
