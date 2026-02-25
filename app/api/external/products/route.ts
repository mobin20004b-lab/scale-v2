import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


// Middleware-like check for external API token
async function verifyExternalToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.split(' ')[1];
  // In a real app, verify this token against a stored external API key
  // For now, we'll accept a dummy token for demonstration
  return token === process.env.EXTERNAL_API_KEY || token === 'demo_external_token';
}

export async function GET(request: Request) {
  if (!(await verifyExternalToken(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      name: true,
      barcode: true,
      category: true,
      unit: true,
    }
  });
  
  return NextResponse.json(products);
}
