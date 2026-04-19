import { PrismaClient } from '../generated/client/client';
import { PrismaPg } from '@prisma/adapter-pg';

const parseSslMode = (connectionString: string) => {
  try {
    const url = new URL(connectionString);
    return url.searchParams.get('sslmode')?.toLowerCase() ?? null;
  } catch {
    return null;
  }
};

const shouldUseSsl = () => {
  const explicit = process.env.PRISMA_PG_SSL?.toLowerCase();
  if (explicit === 'require' || explicit === 'true') {
    return true;
  }

  if (explicit === 'disable' || explicit === 'false') {
    return false;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return false;
  }

  const sslMode = parseSslMode(connectionString);
  if (sslMode === 'require' || sslMode === 'verify-ca' || sslMode === 'verify-full') {
    return true;
  }

  if (sslMode === 'disable' || sslMode === 'allow' || sslMode === 'prefer') {
    return false;
  }

  return process.env.NODE_ENV === 'production';
};

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const adapter = new PrismaPg({
    connectionString,
    // Force-disable TLS when SSL is not requested.
    // Passing `undefined` allows pg to infer SSL from connection string params
    // (for example `sslmode=require`), which can break local non-TLS Postgres.
    ssl: shouldUseSsl() ? { rejectUnauthorized: false } : false,
  });

  return new PrismaClient({ adapter });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export { prisma };

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
