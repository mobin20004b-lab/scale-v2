import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';


export async function GET(request: Request, { params }: { params: { barcode: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const product = await prisma.product.findFirst({
    where: { barcode: params.barcode, isDeleted: false }
  });

  if (!product) {
    // Log unknown barcode
    await prisma.unknownBarcode.create({
      data: {
        barcode: params.barcode,
      }
    });
    return NextResponse.json({ error: 'Product not found', status: 'UNKNOWN_BARCODE_LOGGED' }, { status: 404 });
  }

  return NextResponse.json(product);
}
