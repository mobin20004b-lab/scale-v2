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

  const customer = await prisma.customer.findFirst({
    where: { id, isDeleted: false },
    include: {
      orders: {
        include: {
          items: true,
        },
        orderBy: { orderDate: 'desc' },
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  return NextResponse.json(customer);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();

  if (!data.name || typeof data.name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  try {
    const customer = await prisma.customer.update({
      where: { id },
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
        action: 'UPDATE',
        entityType: 'CUSTOMER',
        entityId: customer.id,
        details: JSON.stringify({ name: customer.name }),
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        action: 'SOFT_DELETE',
        entityType: 'CUSTOMER',
        entityId: customer.id,
        details: JSON.stringify({ name: customer.name }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}
