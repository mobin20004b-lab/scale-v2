import { PrismaClient } from '@prisma/client';
import { PrismaPostgresAdapter } from '@prisma/adapter-ppg';

declare global {
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
const adapter = new PrismaPostgresAdapter({
  connectionString: process.env.DATABASE_URL!,
});

  return new PrismaClient({ adapter });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
