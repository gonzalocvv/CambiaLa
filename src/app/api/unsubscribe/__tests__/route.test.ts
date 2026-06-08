import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockNotificationService = vi.hoisted(() => ({
  unsubscribeByToken: vi.fn(),
  resubscribeByToken: vi.fn(),
  buildResubscribeToken: vi.fn(),
}));
vi.mock('@/services/notification.service', () => ({
  notificationService: mockNotificationService,
}));

// verifyResubscribeToken and verifyUnsubscribeToken are used directly in the route —
// mock the whole module so we can control verification results.
const mockVerifyUnsub = vi.hoisted(() => vi.fn());
const mockVerifyResub = vi.hoisted(() => vi.fn());
vi.mock('@/lib/email/unsubscribe', () => ({
  verifyUnsubscribeToken: mockVerifyUnsub,
  verifyResubscribeToken: mockVerifyResub,
  signUnsubscribeToken: vi.fn(),
  signResubscribeToken: vi.fn(),
}));

import { GET, POST } from '../route';

beforeEach(() => {
  vi.clearAllMocks();
  process.env.UNSUBSCRIBE_SECRET = 'route-test-secret';
});

afterEach(() => {
  delete process.env.UNSUBSCRIBE_SECRET;
});

// ─── GET ────────────────────────────────────────────────────────────────────

describe('GET /api/unsubscribe', () => {
  it('renders a confirmation form (no mutation) for a valid token', async () => {
    mockVerifyUnsub.mockReturnValue('user-x');
    const res = await GET(new Request('http://localhost/api/unsubscribe?token=valid.token.sig'));

    expect(res.status).toBe(200);
    expect(res.headers.get('Referrer-Policy')).toBe('no-referrer');
    const html = await res.text();
    expect(html).toContain('<form method="post"');
    expect(html).toContain('Darme de baja');
    expect(mockNotificationService.unsubscribeByToken).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid/expired token', async () => {
    mockVerifyUnsub.mockReturnValue(null);
    const res = await GET(new Request('http://localhost/api/unsubscribe?token=bad.token'));
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain('inválido');
    expect(html).not.toContain('<form');
  });
});

// ─── POST — unsubscribe ──────────────────────────────────────────────────────

describe('POST /api/unsubscribe — unsubscribe', () => {
  it('unsubscribes and shows reactivation button when prevFreq is not "never"', async () => {
    mockNotificationService.unsubscribeByToken.mockResolvedValue({ ok: true, prevFreq: 'daily' });
    mockNotificationService.buildResubscribeToken.mockReturnValue('resub.daily.exp.sig');
    const res = await POST(
      new Request('http://localhost/api/unsubscribe', {
        method: 'POST',
        body: new URLSearchParams({ token: 'user-x.exp.sig' }),
      }),
    );

    expect(mockNotificationService.unsubscribeByToken).toHaveBeenCalledWith('user-x.exp.sig');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('te diste de baja');
    // Reactivation form present
    expect(html).toContain('value="resubscribe"');
    expect(html).toContain('Reactivar notificaciones');
    expect(html).toContain('resub.daily.exp.sig');
  });

  it('shows no reactivation form when prevFreq is "never"', async () => {
    mockNotificationService.unsubscribeByToken.mockResolvedValue({ ok: true, prevFreq: 'never' });
    mockNotificationService.buildResubscribeToken.mockReturnValue(null);
    const res = await POST(
      new Request('http://localhost/api/unsubscribe', {
        method: 'POST',
        body: new URLSearchParams({ token: 'user-x.exp.sig' }),
      }),
    );

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('te diste de baja');
    expect(html).not.toContain('Reactivar notificaciones');
  });

  it('returns 400 when the token is invalid', async () => {
    mockNotificationService.unsubscribeByToken.mockResolvedValue({ ok: false });
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

// ─── POST — resubscribe ──────────────────────────────────────────────────────

describe('POST /api/unsubscribe — resubscribe (action=resubscribe)', () => {
  it('resubscribes and confirms on a valid resubscribe token', async () => {
    mockVerifyResub.mockReturnValue({ userId: 'user-x', prevFreq: 'daily' });
    mockNotificationService.resubscribeByToken.mockResolvedValue(true);
    const res = await POST(
      new Request('http://localhost/api/unsubscribe', {
        method: 'POST',
        body: new URLSearchParams({ action: 'resubscribe', token: 'resub.daily.exp.sig' }),
      }),
    );

    expect(mockNotificationService.resubscribeByToken).toHaveBeenCalledWith('resub.daily.exp.sig');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('reactivaste tus notificaciones');
  });

  it('returns 400 for an invalid resubscribe token', async () => {
    mockVerifyResub.mockReturnValue(null);
    const res = await POST(
      new Request('http://localhost/api/unsubscribe', {
        method: 'POST',
        body: new URLSearchParams({ action: 'resubscribe', token: 'bad.token' }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.text()).toContain('inválido');
    expect(mockNotificationService.resubscribeByToken).not.toHaveBeenCalled();
  });

  it('returns 400 when resubscribeByToken fails (e.g. user deleted)', async () => {
    mockVerifyResub.mockReturnValue({ userId: 'user-x', prevFreq: 'weekly' });
    mockNotificationService.resubscribeByToken.mockResolvedValue(false);
    const res = await POST(
      new Request('http://localhost/api/unsubscribe', {
        method: 'POST',
        body: new URLSearchParams({ action: 'resubscribe', token: 'resub.weekly.exp.sig' }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.text()).toContain('No se pudo reactivar');
  });
});
