import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';


export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const unknownBarcodes = await prisma.unknownBarcode.findMany({
    where: { status: 'OPEN' },
    orderBy: { capturedAt: 'desc' }
  });
  
  return NextResponse.json(unknownBarcodes);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();
  
  try {
    const unknownBarcode = data.id
      ? await prisma.unknownBarcode.update({
          where: { id: data.id },
          data: {
            status: data.status || "MAPPED",
            resolvedAt: new Date(),
            resolvedTo: data.productId,
          },
        })
      : await prisma.unknownBarcode.create({
          data: {
            barcode: data.barcode,
            status: "OPEN",
          },
        });

    return NextResponse.json(unknownBarcode);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update unknown barcode' }, { status: 500 });
  }
}
