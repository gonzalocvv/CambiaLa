// El pooler de transacción de Supabase (Supavisor/PgBouncer, puerto 6543) no
// mantiene los prepared statements entre conexiones: si no se le avisa a Prisma,
// los queries fallan de forma intermitente con
// `prepared statement "sN" does not exist` (PostgreSQL 26000).
// El flag pgbouncer=true le dice a Prisma que no dependa de ellos.
const TRANSACTION_POOLER = ':6543/';

export function resolveDatasourceUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return rawUrl;
  if (rawUrl.includes('pgbouncer=')) return rawUrl;
  if (!rawUrl.includes(TRANSACTION_POOLER)) return rawUrl;

  const separator = rawUrl.includes('?') ? '&' : '?';
  return `${rawUrl}${separator}pgbouncer=true`;
}
