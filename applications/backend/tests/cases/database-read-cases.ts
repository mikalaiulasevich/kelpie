import { Prisma } from '../../generated/prisma/client.js';

export const DatabaseReadInvalidStatements = [
  { name: 'write statement', statements: [Prisma.sql`DELETE FROM "Session"`] },
  {
    name: 'too many statements',
    statements: Array.from({ length: 65 }, () => Prisma.sql`SELECT 1`),
  },
  {
    name: 'too many bindings',
    statements: [Prisma.sql`SELECT ${Prisma.join(Array.from({ length: 2049 }, () => 'bound'))}`],
  },
  { name: 'oversized body', statements: [Prisma.sql`SELECT ${'x'.repeat(1_000_000)}`] },
  { name: 'unsupported object', statements: [Prisma.sql`SELECT ${{ nested: 'value' }}`] },
  { name: 'nonfinite value', statements: [Prisma.sql`SELECT ${Number.POSITIVE_INFINITY}`] },
] as const;
