import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetUser = vi.hoisted(() => vi.fn());

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

import { NextRequest } from 'next/server';
import { middleware } from '../../middleware';

const BASE = 'http://localhost:3000';

function makeReq(path: string): NextRequest {
  return new NextRequest(`${BASE}${path}`);
}

beforeEach(() => vi.clearAllMocks());

describe('middleware — protección de rutas (RF-323)', () => {
  describe('ruta protegida sin sesión → redirige a /auth/login', () => {
    it.each(['/album', '/matches', '/conversations', '/settings', '/onboarding', '/admin'])(
      'redirige %s',
      async (path) => {
        mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
        const res = await middleware(makeReq(path));
        expect(res.status).toBe(307);
        const location = res.headers.get('location') ?? '';
        expect(location).toContain('/auth/login');
        expect(location).toContain(`next=${encodeURIComponent(path)}`);
      },
    );

    it('redirige subruta /matches/abc123 con next correcto', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const res = await middleware(makeReq('/matches/abc123'));
      expect(res.status).toBe(307);
      const location = res.headers.get('location') ?? '';
      expect(location).toContain('/auth/login');
      expect(location).toContain('next=%2Fmatches%2Fabc123');
    });
  });

  describe('ruta protegida con sesión → pasa', () => {
    it('no redirige /album si hay usuario autenticado', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      const res = await middleware(makeReq('/album'));
      expect(res.headers.get('location')).toBeNull();
    });

    it('no redirige /settings si hay usuario autenticado', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      const res = await middleware(makeReq('/settings'));
      expect(res.headers.get('location')).toBeNull();
    });
  });

  describe('ruta pública sin sesión → pasa', () => {
    it.each(['/', '/como-funciona', '/precios', '/privacidad', '/terminos', '/contacto'])(
      'no redirige %s',
      async (path) => {
        mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
        const res = await middleware(makeReq(path));
        expect(res.headers.get('location')).toBeNull();
      },
    );

    it('no redirige /auth/login (ruta de auth)', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const res = await middleware(makeReq('/auth/login'));
      expect(res.headers.get('location')).toBeNull();
    });

    it('no redirige /u/gonzalo (perfil público)', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const res = await middleware(makeReq('/u/gonzalo'));
      expect(res.headers.get('location')).toBeNull();
    });

    it('no redirige /api/auth/callback (API route)', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const res = await middleware(makeReq('/api/auth/callback'));
      expect(res.headers.get('location')).toBeNull();
    });
  });
});
