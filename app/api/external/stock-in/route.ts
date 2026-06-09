import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  externalApiUnauthorizedResponse,
  isExternalApiRequestAuthorized,
} from '@/lib/external-api-auth';

export async function POST(request: Request) {
  if (!isExternalApiRequestAuthorized(request)) {
    return externalApiUnauthorizedResponse();
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
