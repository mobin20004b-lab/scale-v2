import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type TransactionClient = Prisma.TransactionClient;

function isPrismaDuplicateError(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
  );
}

const SETTINGS_FILE_PATH = path.join(process.cwd(), 'data', 'system-settings.json');

async function ensureInitialSettingsFile(companyName: string) {
  await fs.mkdir(path.dirname(SETTINGS_FILE_PATH), { recursive: true });
  await fs.writeFile(
    SETTINGS_FILE_PATH,
    JSON.stringify(
      {
        companyName,
        allowUserRegistration: false,
        defaultRateLimit: 100,
        externalApiEnabled: true,
      },
      null,
      2,
    ),
  );
}

export async function GET() {
  const userCount = await prisma.user.count();
  return NextResponse.json({ requiresBootstrap: userCount === 0 });
}

export async function POST(request: Request) {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    return NextResponse.json({ error: 'System already initialized.' }, { status: 409 });
  }

  const data = await request.json();
  const name = String(data.name ?? '').trim();
  const username = String(data.username ?? '').trim();
  const email = String(data.email ?? '').trim().toLowerCase();
  const password = String(data.password ?? '');
  const warehouseName = String(data.warehouseName ?? '').trim();
  const companyName = String(data.companyName ?? 'گرین‌استاک').trim() || 'گرین‌استاک';

  if (!name || !username || !email || !password || password.length < 6 || !warehouseName) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await prisma.$transaction(async (tx: TransactionClient) => {
      await tx.user.create({
        data: {
          name,
          username,
          email,
          password: passwordHash,
          role: 'CEO',
          status: 'ACTIVE',
          isActive: true,
        },
      });

      await tx.warehouse.create({
        data: {
          name: warehouseName,
          managerName: name,
          status: 'ACTIVE',
        },
      });

      await tx.systemSetting.upsert({
        where: { key: 'company' },
        update: { value: { name: companyName } },
        create: { key: 'company', value: { name: companyName } },
      });

      await tx.systemSetting.upsert({
        where: { key: 'bootstrap' },
        update: { value: { initializedAt: new Date().toISOString() } },
        create: { key: 'bootstrap', value: { initializedAt: new Date().toISOString() } },
      });
    });
  } catch (error) {
    if (isPrismaDuplicateError(error) && error.code === 'P2002') {
      return NextResponse.json({ error: 'Duplicate user information.' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Bootstrap failed.' }, { status: 500 });
  }

  await ensureInitialSettingsFile(companyName);

  return NextResponse.json({ success: true });
}
