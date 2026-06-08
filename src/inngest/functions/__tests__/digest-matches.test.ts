import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockNotificationService = vi.hoisted(() => ({
  sendMatchDigest: vi.fn().mockResolvedValue({ sent: 0 }),
}));

vi.mock('@/services/notification.service', () => ({
  notificationService: mockNotificationService,
}));
vi.mock('@/inngest/client', () => ({ inngest: { createFunction: vi.fn() } }));

import { handleDigestMatches } from '../digest-matches';

const BASE_URL = 'https://cambiala.uy';
const ORIGINAL_BASE = process.env.NEXT_PUBLIC_BASE_URL;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_BASE_URL = BASE_URL;
});

afterEach(() => {
  process.env.NEXT_PUBLIC_BASE_URL = ORIGINAL_BASE;
});

describe('handleDigestMatches', () => {
  it('sends daily digest on any weekday', async () => {
    // Wednesday = day 3
    const wednesday = new Date('2026-06-10T09:00:00Z');
    const result = await handleDigestMatches(wednesday);

    expect(mockNotificationService.sendMatchDigest).toHaveBeenCalledWith('daily', BASE_URL);
    expect(result.frequencies).toContain('daily');
  });

  it('sends weekly digest only on Mondays (day 1)', async () => {
    const monday = new Date('2026-06-08T09:00:00Z'); // Monday
    await handleDigestMatches(monday);

    expect(mockNotificationService.sendMatchDigest).toHaveBeenCalledTimes(2);
    const calls = mockNotificationService.sendMatchDigest.mock.calls;
    const freqs = calls.map((c) => c[0] as string);
    expect(freqs).toContain('daily');
    expect(freqs).toContain('weekly');
  });

  it('does NOT send weekly digest on non-Mondays', async () => {
    const tuesday = new Date('2026-06-09T09:00:00Z');
    await handleDigestMatches(tuesday);

    const calls = mockNotificationService.sendMatchDigest.mock.calls;
    const freqs = calls.map((c) => c[0] as string);
    expect(freqs).not.toContain('weekly');
  });

  it('returns total sent count from both daily and weekly', async () => {
    const monday = new Date('2026-06-08T09:00:00Z');
    mockNotificationService.sendMatchDigest
      .mockResolvedValueOnce({ sent: 3 }) // daily
      .mockResolvedValueOnce({ sent: 2 }); // weekly
    const result = await handleDigestMatches(monday);
    expect(result.sent).toBe(5);
  });

  it('skips (no-op) when NEXT_PUBLIC_BASE_URL is not set', async () => {
    delete process.env.NEXT_PUBLIC_BASE_URL;
    const result = await handleDigestMatches(new Date());
    expect(mockNotificationService.sendMatchDigest).not.toHaveBeenCalled();
    expect(result.skipped).toBe(true);
  });
});
