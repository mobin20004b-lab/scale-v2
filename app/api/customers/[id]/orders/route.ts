import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const status = searchParams.get('status');
  const paymentStatus = searchParams.get('paymentStatus');
  const product = searchParams.get('product')?.trim();

  const orders = await prisma.customerOrder.findMany({
    where: {
      customerId: id,
      ...(status ? { status } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(from || to
        ? {
            orderDate: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
      ...(product
        ? {
            items: {
              some: {
                productName: { contains: product, mode: 'insensitive' },
              },
            },
          }
        : {}),
    },
    include: {
      items: true,
    },
    orderBy: { orderDate: 'desc' },
  });

  return NextResponse.json(orders);
}
