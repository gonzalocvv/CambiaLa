import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuth = vi.hoisted(() => ({
  signOut: vi.fn(async () => ({})),
}));
const mockCreateClient = vi.hoisted(() => vi.fn(async () => ({ auth: mockAuth })));

vi.mock('@/lib/supabase/server', () => ({ createClient: mockCreateClient }));

import { POST } from '../route';

const ORIGIN = 'https://cambiala.uy';

function makeRequest() {
  return new Request(`${ORIGIN}/api/auth/logout`, { method: 'POST' });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/auth/logout', () => {
  it('llama auth.signOut()', async () => {
    await POST(makeRequest());
    expect(mockAuth.signOut).toHaveBeenCalledOnce();
  });

  it('redirige a ${origin}/ con status 303', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe(`${ORIGIN}/`);
  });
});
