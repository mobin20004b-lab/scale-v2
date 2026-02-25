import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';


export async function GET(request: Request, { params }: { params: Promise<{ barcode: string }> }) {
  const { barcode } = await params;
  const session = (await getServerSession(authOptions)) as any;
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const product = await prisma.product.findFirst({
    where: { barcode: barcode, isDeleted: false }
  });

  if (!product) {
    // Log unknown barcode
    await prisma.unknownBarcode.create({
      data: {
        barcode: barcode,
      }
    });
    return NextResponse.json({ error: 'Product not found', status: 'UNKNOWN_BARCODE_LOGGED' }, { status: 404 });
  }

  return NextResponse.json(product);
}
