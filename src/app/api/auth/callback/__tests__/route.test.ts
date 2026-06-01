import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuth = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
}));
const mockCreateClient = vi.hoisted(() => vi.fn(async () => ({ auth: mockAuth })));
const mockUserService = vi.hoisted(() => ({ getOrCreate: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({ createClient: mockCreateClient }));
vi.mock('@/services/user.service', () => ({ userService: mockUserService }));

import { GET } from '../route';

const ORIGIN = 'https://cambia-la.vercel.app';

function makeRequest(query: string) {
  return new Request(`${ORIGIN}/api/auth/callback${query}`);
}

function location(res: Response) {
  return res.headers.get('location');
}

beforeEach(() => vi.clearAllMocks());

describe('GET /api/auth/callback — missing params', () => {
  it('redirects with missing_code when neither code nor token_hash is present', async () => {
    const res = await GET(makeRequest(''));
    expect(res.status).toBe(307);
    expect(location(res)).toBe(`${ORIGIN}/auth/login?error=missing_code`);
  });
});

describe('GET /api/auth/callback — PKCE code flow', () => {
  it('exchanges the code and redirects to /onboarding when onboarding not done', async () => {
    mockAuth.exchangeCodeForSession.mockResolvedValue({
      data: { user: { email: 'gonza@example.com', user_metadata: {} } },
      error: null,
    });
    mockUserService.getOrCreate.mockResolvedValue({ onboardingDoneAt: null });

    const res = await GET(makeRequest('?code=abc'));

    expect(mockAuth.exchangeCodeForSession).toHaveBeenCalledWith('abc');
    expect(location(res)).toBe(`${ORIGIN}/onboarding`);
  });

  it('redirects to next when onboarding is already done', async () => {
    mockAuth.exchangeCodeForSession.mockResolvedValue({
      data: { user: { email: 'gonza@example.com', user_metadata: {} } },
      error: null,
    });
    mockUserService.getOrCreate.mockResolvedValue({ onboardingDoneAt: new Date() });

    const res = await GET(makeRequest('?code=abc&next=/album'));

    expect(location(res)).toBe(`${ORIGIN}/album`);
  });

  it('redirects with exchange_failed when the exchange errors', async () => {
    mockAuth.exchangeCodeForSession.mockResolvedValue({
      data: { user: null },
      error: { message: 'bad code' },
    });

    const res = await GET(makeRequest('?code=bad'));

    expect(location(res)).toBe(`${ORIGIN}/auth/login?error=exchange_failed`);
    expect(mockUserService.getOrCreate).not.toHaveBeenCalled();
  });
});

describe('GET /api/auth/callback — token_hash flow', () => {
  it('verifies the OTP and redirects to /matches when onboarding done', async () => {
    mockAuth.verifyOtp.mockResolvedValue({
      data: { user: { email: 'gonza@example.com', user_metadata: {} } },
      error: null,
    });
    mockUserService.getOrCreate.mockResolvedValue({ onboardingDoneAt: new Date() });

    const res = await GET(makeRequest('?token_hash=xyz&type=magiclink'));

    expect(mockAuth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'xyz', type: 'magiclink' });
    expect(location(res)).toBe(`${ORIGIN}/matches`);
  });

  it('redirects with verify_failed when verifyOtp errors', async () => {
    mockAuth.verifyOtp.mockResolvedValue({
      data: { user: null },
      error: { message: 'expired' },
    });

    const res = await GET(makeRequest('?token_hash=xyz&type=magiclink'));

    expect(location(res)).toBe(`${ORIGIN}/auth/login?error=verify_failed`);
  });

  it('passes name and avatar from user_metadata to getOrCreate', async () => {
    mockAuth.verifyOtp.mockResolvedValue({
      data: {
        user: {
          email: 'gonza@example.com',
          user_metadata: { full_name: 'Gonza', avatar_url: 'https://x/y.png' },
        },
      },
      error: null,
    });
    mockUserService.getOrCreate.mockResolvedValue({ onboardingDoneAt: new Date() });

    await GET(makeRequest('?token_hash=xyz&type=email'));

    expect(mockUserService.getOrCreate).toHaveBeenCalledWith({
      email: 'gonza@example.com',
      name: 'Gonza',
      avatarUrl: 'https://x/y.png',
    });
  });
});

describe('GET /api/auth/callback — no email', () => {
  it('redirects with no_email when the verified user has no email', async () => {
    mockAuth.exchangeCodeForSession.mockResolvedValue({
      data: { user: { email: null, user_metadata: {} } },
      error: null,
    });

    const res = await GET(makeRequest('?code=abc'));

    expect(location(res)).toBe(`${ORIGIN}/auth/login?error=no_email`);
    expect(mockUserService.getOrCreate).not.toHaveBeenCalled();
  });
});
