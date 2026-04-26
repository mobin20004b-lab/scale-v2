import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const allowedOrderStatuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const allowedPaymentStatuses = ['UNPAID', 'PARTIAL', 'PAID', 'FAILED'];

export async function PATCH(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orderId } = await params;
  const body = await request.json();

  const nextStatus = typeof body?.status === 'string' ? body.status : undefined;
  const nextPaymentStatus = typeof body?.paymentStatus === 'string' ? body.paymentStatus : undefined;

  if (!nextStatus && !nextPaymentStatus) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  if (nextStatus && !allowedOrderStatuses.includes(nextStatus)) {
    return NextResponse.json({ error: 'Invalid order status' }, { status: 400 });
  }

  if (nextPaymentStatus && !allowedPaymentStatuses.includes(nextPaymentStatus)) {
    return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 });
  }

  try {
    const updatedOrder = await prisma.customerOrder.update({
      where: { id: orderId },
      data: {
        ...(nextStatus ? { status: nextStatus } : {}),
        ...(nextPaymentStatus ? { paymentStatus: nextPaymentStatus } : {}),
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
