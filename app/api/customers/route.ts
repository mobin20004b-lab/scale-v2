import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim();

  const customers = await prisma.customer.findMany({
    where: {
      isDeleted: false,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { address: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      orders: {
        orderBy: { orderDate: 'desc' },
        select: {
          id: true,
          orderDate: true,
          totalPrice: true,
          status: true,
          paymentStatus: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const transformed = customers.map((customer) => {
    const totalOrders = customer.orders.length;
    const lastOrderDate = customer.orders[0]?.orderDate ?? null;
    return {
      ...customer,
      totalOrders,
      lastOrderDate,
    };
  });

  return NextResponse.json(transformed);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();

  if (!data.name || typeof data.name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
      },
    });

    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        action: 'CREATE',
        entityType: 'CUSTOMER',
        entityId: customer.id,
        details: JSON.stringify({ name: customer.name }),
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
