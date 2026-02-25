import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';


export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const product = await prisma.product.findUnique({
    where: { id: params.id, isDeleted: false }
  });

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();
  
  try {
    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        name: data.name,
        description: data.description,
        barcode: data.barcode,
        category: data.category,
        unit: data.unit,
      }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        action: 'UPDATE',
        entityType: 'PRODUCT',
        entityId: product.id,
        details: JSON.stringify({ name: product.name })
      }
    });

    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      }
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        action: 'SOFT_DELETE',
        entityType: 'PRODUCT',
        entityId: product.id,
        details: JSON.stringify({ name: product.name })
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
