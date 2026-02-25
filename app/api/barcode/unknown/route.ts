import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const prisma = new PrismaClient();

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
    const unknownBarcode = await prisma.unknownBarcode.update({
      where: { id: data.id },
      data: {
        status: data.status, // TEMP_RECEIVING, MAPPED
        resolvedAt: new Date(),
        resolvedTo: data.productId,
      }
    });

    return NextResponse.json(unknownBarcode);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update unknown barcode' }, { status: 500 });
  }
}
