import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuth = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
}));
const mockCreateClient = vi.hoisted(() => vi.fn(async () => ({ auth: mockAuth })));
const mockResolveDestination = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/server', () => ({ createClient: mockCreateClient }));
vi.mock('@/lib/auth/resolve-destination', () => ({
  resolveDestinationForUser: mockResolveDestination,
}));

import { POST } from '../route';

const ORIGIN = 'https://cambia-la.vercel.app';

function makeRequest(body: unknown) {
  return new Request(`${ORIGIN}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe('POST /api/auth/verify-otp — validación', () => {
  it('400 si el body no es JSON', async () => {
    const res = await POST(makeRequest('no-json{'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'bad_request' });
  });

  it('400 si falta el email', async () => {
    const res = await POST(makeRequest({ token: '123456' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'missing_fields' });
  });

  it('400 si el código tiene menos de 6 dígitos', async () => {
    const res = await POST(makeRequest({ email: 'gonza@example.com', token: '123' }));
    expect(res.status).toBe(400);
    expect(mockAuth.verifyOtp).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/verify-otp — verificación', () => {
  it('401 cuando el código es inválido', async () => {
    mockAuth.verifyOtp.mockResolvedValue({ data: { user: null }, error: { message: 'bad' } });
    const res = await POST(makeRequest({ email: 'gonza@example.com', token: '000000' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'invalid_code' });
  });

  it('verifica con type email, normaliza y devuelve el destino', async () => {
    mockAuth.verifyOtp.mockResolvedValue({
      data: { user: { email: 'gonza@example.com', user_metadata: {} } },
      error: null,
    });
    mockResolveDestination.mockResolvedValue('/onboarding');

    const res = await POST(makeRequest({ email: '  Gonza@Example.com ', token: '12 34 56' }));

    expect(mockAuth.verifyOtp).toHaveBeenCalledWith({
      email: 'gonza@example.com',
      token: '123456',
      type: 'email',
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ destination: '/onboarding' });
  });
});
