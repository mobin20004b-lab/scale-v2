import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pathScaleId } = await params;
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = authHeader.split(' ')[1];

    // Token is the source of truth, path id is informational only.
    const scale = await prisma.scale.findUnique({
      where: { apiKey },
    });

    if (!scale) {
      return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
    }

    let incomingWeight: number;
    let incomingUnit: string | undefined;
    let uptime: number | undefined;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      incomingWeight = Number(body.weight);
      incomingUnit = typeof body.unit === 'string' ? body.unit : undefined;
      uptime = body.uptime;
    } else {
      // For plain text payloads, default to the scale configured unit.
      // Example: if unit is kg and payload is 55.29, store 55.29 (not 0.05529).
      const text = await request.text();
      incomingWeight = Number(text.trim());
      incomingUnit = scale.unit;
    }

    if (isNaN(incomingWeight)) {
      return NextResponse.json({ error: 'Invalid weight value' }, { status: 400 });
    }

    const normalizedUnit = (incomingUnit || scale.unit || '').toLowerCase();

    // Store the weight in the scale's configured unit.
    let currentWeight = incomingWeight;

    if (scale.unit === 'kg' && normalizedUnit === 'g') {
      currentWeight = incomingWeight / 1000;
    } else if (scale.unit === 'g' && normalizedUnit === 'kg') {
      currentWeight = incomingWeight * 1000;
    }

    await prisma.scale.update({
      where: { id: scale.id },
      data: {
        currentWeight,
        status: 'ONLINE',
        signal: 'FRESH',
        lastSeen: new Date(),
        ...(uptime !== undefined && { uptimeSec: uptime }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Weight updated successfully',
      scaleId: scale.id,
      pathScaleId,
      idMatched: scale.id === pathScaleId,
    });
  } catch (error) {
    console.error('Error processing scale data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
