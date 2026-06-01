import { describe, expect, it } from 'vitest';

import { resolveDatasourceUrl } from '../database-url';

const POOLER = 'postgresql://postgres.ref:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
const DIRECT = 'postgresql://postgres.ref:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres';

describe('resolveDatasourceUrl', () => {
  it('appends pgbouncer=true to a transaction-pooler URL without query string', () => {
    expect(resolveDatasourceUrl(POOLER)).toBe(`${POOLER}?pgbouncer=true`);
  });

  it('appends pgbouncer=true with & when the URL already has a query string', () => {
    const url = `${POOLER}?sslmode=require`;
    expect(resolveDatasourceUrl(url)).toBe(`${url}&pgbouncer=true`);
  });

  it('leaves a URL that already declares pgbouncer untouched', () => {
    const url = `${POOLER}?pgbouncer=true`;
    expect(resolveDatasourceUrl(url)).toBe(url);
  });

  it('respects an explicit pgbouncer=false opt-out', () => {
    const url = `${POOLER}?pgbouncer=false`;
    expect(resolveDatasourceUrl(url)).toBe(url);
  });

  it('does not touch a direct (session) connection on port 5432', () => {
    expect(resolveDatasourceUrl(DIRECT)).toBe(DIRECT);
  });

  it('does not touch a local non-pooled URL', () => {
    const url = 'postgresql://mock:mock@localhost:5432/mock';
    expect(resolveDatasourceUrl(url)).toBe(url);
  });

  it('returns undefined when no URL is set', () => {
    expect(resolveDatasourceUrl(undefined)).toBeUndefined();
  });
});
