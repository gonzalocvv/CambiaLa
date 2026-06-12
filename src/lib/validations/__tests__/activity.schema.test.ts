import { describe, expect, it } from 'vitest';

import {
  BANNER_ALLOWED_MIME,
  BANNER_MAX_BYTES,
  CreateActivitySchema,
  ListActivitiesQuerySchema,
  UpdateActivitySchema,
} from '../activity.schema';

const baseInput = {
  title: 'Juntada en Tacuarembó',
  department: 'Tacuarembó',
  startsAt: '2026-07-01T18:00:00.000Z',
};

describe('CreateActivitySchema', () => {
  it('accepts a minimal valid activity', () => {
    const parsed = CreateActivitySchema.safeParse(baseInput);
    expect(parsed.success).toBe(true);
  });

  it('coerces startsAt/endsAt to Date', () => {
    const parsed = CreateActivitySchema.parse({
      ...baseInput,
      endsAt: '2026-07-01T21:00:00.000Z',
    });
    expect(parsed.startsAt).toBeInstanceOf(Date);
    expect(parsed.endsAt).toBeInstanceOf(Date);
  });

  it('rejects a department outside Uruguay', () => {
    const parsed = CreateActivitySchema.safeParse({ ...baseInput, department: 'Buenos Aires' });
    expect(parsed.success).toBe(false);
  });

  it('rejects endsAt before startsAt', () => {
    const parsed = CreateActivitySchema.safeParse({
      ...baseInput,
      endsAt: '2026-07-01T17:00:00.000Z',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a title shorter than 3 chars', () => {
    const parsed = CreateActivitySchema.safeParse({ ...baseInput, title: 'ab' });
    expect(parsed.success).toBe(false);
  });

  it('rejects a title longer than 80 chars', () => {
    const parsed = CreateActivitySchema.safeParse({ ...baseInput, title: 'a'.repeat(81) });
    expect(parsed.success).toBe(false);
  });

  it('rejects a description longer than 1000 chars', () => {
    const parsed = CreateActivitySchema.safeParse({ ...baseInput, description: 'a'.repeat(1001) });
    expect(parsed.success).toBe(false);
  });
});

describe('UpdateActivitySchema', () => {
  it('allows partial updates', () => {
    const parsed = UpdateActivitySchema.safeParse({ title: 'Nuevo título' });
    expect(parsed.success).toBe(true);
  });

  it('still enforces endsAt > startsAt when both are present', () => {
    const parsed = UpdateActivitySchema.safeParse({
      startsAt: '2026-07-01T18:00:00.000Z',
      endsAt: '2026-07-01T17:00:00.000Z',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('ListActivitiesQuerySchema', () => {
  it('defaults page and pageSize', () => {
    const parsed = ListActivitiesQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(20);
  });

  it('coerces page/pageSize from strings', () => {
    const parsed = ListActivitiesQuerySchema.parse({ page: '2', pageSize: '10' });
    expect(parsed.page).toBe(2);
    expect(parsed.pageSize).toBe(10);
  });

  it('rejects an invalid department filter', () => {
    expect(ListActivitiesQuerySchema.safeParse({ department: 'Nárnia' }).success).toBe(false);
  });
});

describe('banner constants', () => {
  it('caps the banner at ~2MB', () => {
    expect(BANNER_MAX_BYTES).toBe(2 * 1024 * 1024);
  });

  it('allows only jpeg/png/webp', () => {
    expect([...BANNER_ALLOWED_MIME]).toEqual(['image/jpeg', 'image/png', 'image/webp']);
  });
});
