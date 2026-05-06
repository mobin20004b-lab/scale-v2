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
