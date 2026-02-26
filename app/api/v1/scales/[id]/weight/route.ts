import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = authHeader.split(' ')[1];

    // Verify the scale ID and API key
    const scale = await prisma.scale.findUnique({
      where: { id }
    });

    if (!scale || scale.apiKey !== apiKey) {
      return NextResponse.json({ error: 'Invalid API Key or Scale ID' }, { status: 401 });
    }

    let weightInGrams: number;
    let uptime: number | undefined;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      weightInGrams = Number(body.weight);
      uptime = body.uptime;
    } else {
      // Assume raw text containing just a number (grams)
      const text = await request.text();
      weightInGrams = Number(text.trim());
    }

    if (isNaN(weightInGrams)) {
      return NextResponse.json({ error: 'Invalid weight value' }, { status: 400 });
    }

    // Convert grams to the scale's configured unit (assuming mostly kg)
    let currentWeight = weightInGrams;
    if (scale.unit === 'kg') {
      currentWeight = weightInGrams / 1000;
    }

    await prisma.scale.update({
      where: { id },
      data: {
        currentWeight,
        status: 'ONLINE',
        signal: 'FRESH',
        lastSeen: new Date(),
        ...(uptime !== undefined && { uptimeSec: uptime })
      }
    });

    return NextResponse.json({ success: true, message: 'Weight updated successfully' });
  } catch (error) {
    console.error('Error processing scale data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
