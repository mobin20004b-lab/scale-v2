import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import fs from 'fs/promises';
import path from 'path';

const SETTINGS_FILE_PATH = path.join(process.cwd(), 'data', 'system-settings.json');

async function ensureSettingsFile() {
  try {
    await fs.mkdir(path.dirname(SETTINGS_FILE_PATH), { recursive: true });
    try {
      await fs.access(SETTINGS_FILE_PATH);
    } catch {
      await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify({
        companyName: 'گرین‌استاک',
        allowUserRegistration: false,
        defaultRateLimit: 100,
        externalApiEnabled: true,
      }, null, 2));
    }
  } catch (error) {
    console.error('Error ensuring settings file:', error);
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureSettingsFile();
  try {
    const data = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'CEO') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();
  
  await ensureSettingsFile();
  try {
    await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(data, null, 2));
    return NextResponse.json({ success: true, settings: data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
