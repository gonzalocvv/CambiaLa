import { PrismaClient } from '@prisma/client';

import { resolveDatasourceUrl } from '@/lib/database-url';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const datasourceUrl = resolveDatasourceUrl(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient(datasourceUrl ? { datasourceUrl } : undefined);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
