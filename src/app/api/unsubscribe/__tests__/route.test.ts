import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockNotificationService = vi.hoisted(() => ({ unsubscribeByToken: vi.fn() }));
vi.mock('@/services/notification.service', () => ({
  notificationService: mockNotificationService,
}));

import { signUnsubscribeToken } from '@/lib/email/unsubscribe';

import { GET, POST } from '../route';

const ORIGINAL_SECRET = process.env.UNSUBSCRIBE_SECRET;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.UNSUBSCRIBE_SECRET = 'route-test-secret';
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.UNSUBSCRIBE_SECRET;
  else process.env.UNSUBSCRIBE_SECRET = ORIGINAL_SECRET;
});

describe('GET /api/unsubscribe', () => {
  it('renders a confirmation form (no mutation) for a valid token', async () => {
    const token = signUnsubscribeToken('user-x');
    const res = await GET(
      new Request(`http://localhost/api/unsubscribe?token=${encodeURIComponent(token)}`),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('Referrer-Policy')).toBe('no-referrer');
    const html = await res.text();
    expect(html).toContain('<form method="post"');
    expect(html).toContain('Darme de baja');
    // GET never mutates
    expect(mockNotificationService.unsubscribeByToken).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid token', async () => {
    const res = await GET(new Request('http://localhost/api/unsubscribe?token=bad.token'));
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain('inválido');
    expect(html).not.toContain('<form');
  });
});

describe('POST /api/unsubscribe', () => {
  it('unsubscribes and confirms on a valid token', async () => {
    mockNotificationService.unsubscribeByToken.mockResolvedValue(true);
    const res = await POST(
      new Request('http://localhost/api/unsubscribe', {
        method: 'POST',
        body: new URLSearchParams({ token: 'user-x.sig' }),
      }),
    );

    expect(mockNotificationService.unsubscribeByToken).toHaveBeenCalledWith('user-x.sig');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('te diste de baja');
  });

  it('returns 400 when the token is invalid', async () => {
    mockNotificationService.unsubscribeByToken.mockResolvedValue(false);
    const res = await POST(
      new Request('http://localhost/api/unsubscribe', {
        method: 'POST',
        body: new URLSearchParams({ token: 'nope' }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.text()).toContain('inválido');
  });
});
