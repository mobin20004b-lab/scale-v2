import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scaleCreateSchema } from "@/lib/validators/scale";

export async function GET() {
  const scales = await prisma.scale.findMany({ include: { warehouse: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(
    scales.map((s) => ({
      ...s,
      health: s.lastSeenAt && Date.now() - new Date(s.lastSeenAt).getTime() < s.heartbeatSec * 3000 ? "FRESH" : "STALE"
    }))
  );
}

export async function POST(req: Request) {
  const data = scaleCreateSchema.parse(await req.json());
  const scale = await prisma.scale.create({ data: { ...data, apiToken: `sc_${randomUUID().replaceAll("-", "")}` } });
  return NextResponse.json(scale, { status: 201 });
}
