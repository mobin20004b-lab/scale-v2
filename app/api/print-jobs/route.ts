import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();
  
  try {
    const printJob = await prisma.printJob.create({
      data: {
        scaleId: data.scaleId,
        payload: data.payload, // TSPL or ESC-POS commands
        status: 'QUEUED',
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        action: 'PRINT_JOB_CREATED',
        entityType: 'PRINT_JOB',
        entityId: printJob.id,
        details: JSON.stringify({ scaleId: data.scaleId })
      }
    });

    return NextResponse.json(printJob, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create print job' }, { status: 500 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const printJobs = await prisma.printJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  
  return NextResponse.json(printJobs);
}
