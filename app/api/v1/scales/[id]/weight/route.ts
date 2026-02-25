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

    // In a real app, you'd verify the API key matches the scale ID in the database
    // For this demo, we'll just accept it if it's provided

    const body = await request.json();
    const { weight, unit, uptime } = body;

    if (typeof weight !== 'number') {
      return NextResponse.json({ error: 'Invalid weight' }, { status: 400 });
    }

    // Here you would typically update the scale's current weight in the database
    // and potentially log the weight history.
    // Since we are using Zustand for the frontend state in this demo, 
    // real-time updates would require WebSockets or polling.
    // For now, we just acknowledge the receipt.

    return NextResponse.json({ success: true, message: 'Weight updated successfully' });
  } catch (error) {
    console.error('Error processing scale data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
