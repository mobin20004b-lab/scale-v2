import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


// Middleware-like check for external API token
async function verifyExternalToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.split(' ')[1];
  return token === process.env.EXTERNAL_API_KEY || token === 'demo_external_token';
}

export async function POST(request: Request) {
  if (!(await verifyExternalToken(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();
  
  try {
    const ledger = await prisma.inventoryLedger.create({
      data: {
        type: 'STOCK_IN',
        quantity: data.quantity,
        weight: data.weight,
        productId: data.productId,
        warehouseId: data.warehouseId,
        scaleId: data.scaleId,
        createdBy: 'EXTERNAL_API',
      }
    });

    return NextResponse.json(ledger, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to record stock-in' }, { status: 500 });
  }
}
