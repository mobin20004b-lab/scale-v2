import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  externalApiUnauthorizedResponse,
  isExternalApiRequestAuthorized,
} from '@/lib/external-api-auth';

export async function GET(request: Request) {
  if (!isExternalApiRequestAuthorized(request)) {
    return externalApiUnauthorizedResponse();
  }

  // Aggregate inventory by product and warehouse
  const inventory = await prisma.inventoryLedger.groupBy({
    by: ['productId', 'warehouseId'],
    _sum: {
      quantity: true,
      weight: true,
    },
    where: {
      type: {
        in: ['STOCK_IN', 'STOCK_IN_UNDO', 'STOCK_OUT', 'STOCK_OUT_UNDO']
      }
    }
  });
  
  // Note: A real implementation would calculate the net balance (IN - OUT)
  // This is a simplified representation.
  
  return NextResponse.json(inventory);
}
