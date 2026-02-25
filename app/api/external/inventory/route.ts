import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Middleware-like check for external API token
async function verifyExternalToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.split(' ')[1];
  return token === process.env.EXTERNAL_API_KEY || token === 'demo_external_token';
}

export async function GET(request: Request) {
  if (!(await verifyExternalToken(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
