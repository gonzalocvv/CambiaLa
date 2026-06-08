import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render-intl';

import { LoginForm } from '../login-form';

// Hoisted so the vi.mock factory can close over these fns.
const { mockSignInWithOtp, mockSignInWithOAuth } = vi.hoisted(() => ({
  mockSignInWithOtp: vi.fn(),
  mockSignInWithOAuth: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithOtp: mockSignInWithOtp,
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

// window.location.assign no es espeable en jsdom — reemplazamos el objeto completo.
const mockAssign = vi.fn();

function submitEmailForm() {
  const btn = screen.getByRole('button', { name: 'Mandarme el código' });
  fireEvent.submit(btn.closest('form')!);
}

function submitCodeForm() {
  const btn = screen.getByRole('button', { name: 'Entrar' });
  fireEvent.submit(btn.closest('form')!);
}

describe('LoginForm', () => {
  beforeEach(() => {
    mockSignInWithOtp.mockReset();
    mockSignInWithOAuth.mockReset();
    mockAssign.mockReset();
    vi.stubGlobal('location', {
      href: 'http://localhost/',
      origin: 'http://localhost',
      pathname: '/auth/login',
      assign: mockAssign,
      replace: vi.fn(),
      reload: vi.fn(),
    });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // ── Paso 1: email ────────────────────────────────────────────────

  it('muestra el paso de email por defecto (sin input de código)', () => {
    renderWithIntl(<LoginForm />);

    expect(screen.getByLabelText('Tu email')).toBeTruthy();
    expect(screen.queryByLabelText('Código')).toBeNull();
  });

  it('email válido → llama signInWithOtp y avanza al paso de código', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null });
    renderWithIntl(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Tu email'), {
      target: { value: 'test@example.com' },
    });
    submitEmailForm();

    await waitFor(() => {
      expect(screen.queryByLabelText('Código')).toBeTruthy();
    });
    expect(mockSignInWithOtp).toHaveBeenCalledOnce();
    expect(mockSignInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.com' }),
    );
  });

  it('email inválido (sin @) → muestra error y no avanza', async () => {
    renderWithIntl(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Tu email'), {
      target: { value: 'noesvalido' },
    });
    submitEmailForm();

    await waitFor(() => {
      expect(screen.queryByText('El email no parece válido.')).not.toBeNull();
    });
    expect(screen.queryByLabelText('Código')).toBeNull();
    expect(mockSignInWithOtp).not.toHaveBeenCalled();
  });

  it('error de supabase al enviar → muestra errorGeneric sin avanzar', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'fail', status: 500 } });
    renderWithIntl(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Tu email'), {
      target: { value: 'test@example.com' },
    });
    submitEmailForm();

    await waitFor(() => {
      expect(screen.queryByText('Algo salió mal. Intentá de nuevo.')).not.toBeNull();
    });
    expect(screen.queryByLabelText('Código')).toBeNull();
  });

  // ── Paso 2: código ───────────────────────────────────────────────

  async function advanceToCodeStep() {
    mockSignInWithOtp.mockResolvedValue({ error: null });
    renderWithIntl(<LoginForm />);
    fireEvent.change(screen.getByLabelText('Tu email'), {
      target: { value: 'test@example.com' },
    });
    submitEmailForm();
    await waitFor(() => screen.getByLabelText('Código'));
  }

  it('verifyCode exitoso → llama fetch y navega a la destination', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ destination: '/album' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await advanceToCodeStep();

    fireEvent.change(screen.getByLabelText('Código'), {
      target: { value: '123456' },
    });
    submitCodeForm();

    await waitFor(() => {
      expect(mockAssign).toHaveBeenCalledWith('/album');
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/verify-otp',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('verifyCode no-ok (400) → muestra errorInvalidCode sin redirigir', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    await advanceToCodeStep();

    fireEvent.change(screen.getByLabelText('Código'), {
      target: { value: '999999' },
    });
    submitCodeForm();

    await waitFor(() => {
      expect(
        screen.queryByText('El código no es correcto o venció. Pedí uno nuevo.'),
      ).not.toBeNull();
    });
    expect(mockAssign).not.toHaveBeenCalled();
  });

  it('verifyCode 429 → muestra errorRateLimited', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    await advanceToCodeStep();

    fireEvent.change(screen.getByLabelText('Código'), {
      target: { value: '123456' },
    });
    submitCodeForm();

    await waitFor(() => {
      expect(screen.queryByText(/Pediste muchos códigos/)).not.toBeNull();
    });
  });

  it('código de menos de 6 dígitos → muestra error sin llamar a fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await advanceToCodeStep();

    fireEvent.change(screen.getByLabelText('Código'), {
      target: { value: '123' },
    });
    submitCodeForm();

    await waitFor(() => {
      expect(
        screen.queryByText('El código no es correcto o venció. Pedí uno nuevo.'),
      ).not.toBeNull();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('← Usar otro mail → vuelve al paso de email', async () => {
    await advanceToCodeStep();

    fireEvent.click(screen.getByRole('button', { name: '← Usar otro mail' }));

    await act(async () => {});
    expect(screen.queryByLabelText('Tu email')).not.toBeNull();
    expect(screen.queryByLabelText('Código')).toBeNull();
  });
});
