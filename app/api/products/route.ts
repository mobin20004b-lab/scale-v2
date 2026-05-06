import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';


export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    where: { isDeleted: false },
    include: {
      lots: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();

  try {
    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        barcode: data.barcode,
        category: data.category,
        unit: data.unit,
        qrCode: data.qrCode || `QR-${data.barcode}`,
        nameFa: data.nameFa || data.name,
        spoolsPerBag: Number(data.spoolsPerBag ?? 12),
        spoolWeight: Number(data.spoolWeight ?? 0),
        bagWeight: Number(data.bagWeight ?? 0),
        brandName: data.brandName || 'نساجی زمرد',
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        action: 'CREATE',
        entityType: 'PRODUCT',
        entityId: product.id,
        details: JSON.stringify({ name: product.name })
      }
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
