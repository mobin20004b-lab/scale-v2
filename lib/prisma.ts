import { PrismaClient } from '@prisma/client';
import { PrismaPostgresAdapter } from '@prisma/adapter-ppg';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  const connectionString = process.env.PRISMA_DIRECT_TCP_URL ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('Missing database connection string. Set PRISMA_DIRECT_TCP_URL or DATABASE_URL.');
  }

  const adapter = new PrismaPostgresAdapter({
    connectionString,
  });

  return new PrismaClient({ adapter });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
