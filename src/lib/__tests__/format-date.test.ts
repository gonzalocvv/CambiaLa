import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { formatRelativeDate } from '../format-date';

const NOW = new Date('2026-06-01T12:00:00.000Z');

describe('formatRelativeDate', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('formats seconds ago', () => {
    const date = new Date(NOW.getTime() - 30_000);
    expect(formatRelativeDate(date)).toMatch(/segundo/i);
  });

  it('formats minutes ago', () => {
    const date = new Date(NOW.getTime() - 5 * 60_000);
    expect(formatRelativeDate(date)).toMatch(/minuto/i);
  });

  it('formats hours ago', () => {
    const date = new Date(NOW.getTime() - 3 * 3_600_000);
    expect(formatRelativeDate(date)).toMatch(/hora/i);
  });

  it('formats days ago', () => {
    const date = new Date(NOW.getTime() - 5 * 86_400_000);
    expect(formatRelativeDate(date)).toMatch(/día/i);
  });

  it('formats months ago', () => {
    const date = new Date(NOW.getTime() - 45 * 86_400_000);
    expect(formatRelativeDate(date)).toMatch(/mes/i);
  });

  it('formats years ago', () => {
    const date = new Date(NOW.getTime() - 400 * 86_400_000);
    expect(formatRelativeDate(date)).toMatch(/año/i);
  });

  it('accepts an ISO string', () => {
    const iso = new Date(NOW.getTime() - 2 * 3_600_000).toISOString();
    expect(formatRelativeDate(iso)).toMatch(/hora/i);
  });
});
