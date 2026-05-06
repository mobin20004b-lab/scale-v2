import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

const MIN_KEY_LENGTH = 24;

type ExternalApiKeyConfig = {
  primary: string;
  secondary?: string;
};

function isStrongKey(key: string | undefined): key is string {
  return Boolean(key && key.trim().length >= MIN_KEY_LENGTH);
}

function getExternalApiKeyConfig(): ExternalApiKeyConfig | null {
  const primary = process.env.EXTERNAL_API_KEY_PRIMARY ?? process.env.EXTERNAL_API_KEY;
  const secondary = process.env.EXTERNAL_API_KEY_SECONDARY;

  if (!isStrongKey(primary)) {
    return null;
  }

  return {
    primary,
    secondary: isStrongKey(secondary) ? secondary : undefined,
  };
}

function safeTokenEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

function readBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7).trim() || null;
}

export function isExternalApiRequestAuthorized(request: Request): boolean {
  const token = readBearerToken(request);
  const keys = getExternalApiKeyConfig();

  if (!token || !keys) {
    return false;
  }

  if (safeTokenEqual(token, keys.primary)) {
    return true;
  }

  if (keys.secondary && safeTokenEqual(token, keys.secondary)) {
    return true;
  }

  return false;
}

export function externalApiUnauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function assertExternalApiKeyConfigForStartup() {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  if (!getExternalApiKeyConfig()) {
    throw new Error(
      `Invalid external API key configuration: set EXTERNAL_API_KEY_PRIMARY (or EXTERNAL_API_KEY) to at least ${MIN_KEY_LENGTH} characters.`,
    );
  }
}
