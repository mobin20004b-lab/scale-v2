import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productPatchSchema } from "@/lib/validators/product";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const item = await prisma.product.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: "کالا پیدا نشد" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const payload = productPatchSchema.parse(await req.json());
  const item = await prisma.product.update({ where: { id: params.id }, data: payload });
  return NextResponse.json(item);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const now = new Date();
  const commitAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);
  const item = await prisma.product.update({
    where: { id: params.id },
    data: { deletedAt: now, deleteCommitAt: commitAt }
  });
  return NextResponse.json({ message: "حذف نرم انجام شد", recoveryUntil: item.deleteCommitAt });
}
