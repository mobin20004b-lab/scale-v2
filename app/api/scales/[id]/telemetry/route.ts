import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { telemetrySchema } from "@/lib/validators/scale";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = req.headers.get("authorization") || "";
  const scale = await prisma.scale.findUnique({ where: { id: params.id } });
  if (!scale || auth !== `Bearer ${scale.apiToken}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const data = telemetrySchema.parse(await req.json());
  const updated = await prisma.scale.update({
    where: { id: params.id },
    data: {
      lastWeight: data.weight,
      isStable: data.isStable,
      uptimeSec: data.uptimeSec,
      model: data.model ?? scale.model,
      lastSeenAt: new Date()
    }
  });

  return NextResponse.json({ ok: true, scaleId: updated.id, state: { weight: updated.lastWeight, stable: updated.isStable } });
}
