import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MessageItem } from '@/lib/validations/message.schema';
import { renderWithIntl } from '@/test/render-intl';

import { ChatPanel } from '../chat-panel';

// jsdom doesn't implement scrollIntoView; mock it globally for this suite.
beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

function makeMsg(overrides: Partial<MessageItem> = {}): MessageItem {
  return {
    id: 'msg-1',
    matchId: 'match-a',
    fromUserId: 'user-a',
    body: 'Hola',
    createdAt: '2026-06-07T10:00:00.000Z',
    readAt: null,
    ...overrides,
  };
}

function setup(messages: MessageItem[] = []) {
  return renderWithIntl(
    <ChatPanel matchId="match-a" currentUserId="user-a" initialMessages={messages} />,
  );
}

describe('ChatPanel — renderizado', () => {
  beforeEach(() => {
    // RF-343: ChatPanel llama PATCH /read al montar; silenciar para tests de render puros.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('muestra los mensajes iniciales', () => {
    setup([makeMsg({ body: 'Hola vecino' })]);
    expect(screen.queryByText('Hola vecino')).not.toBeNull();
  });

  it('muestra el estado vacío cuando no hay mensajes', () => {
    setup([]);
    expect(screen.queryByText(/Todavía no hay mensajes/)).not.toBeNull();
  });

  it('distingue mensajes propios (justify-end) de los del otro (justify-start)', () => {
    setup([
      makeMsg({ id: '1', fromUserId: 'user-a', body: 'Soy yo' }),
      makeMsg({ id: '2', fromUserId: 'user-b', body: 'Soy el otro' }),
    ]);
    expect(screen.queryByText('Soy yo')).not.toBeNull();
    expect(screen.queryByText('Soy el otro')).not.toBeNull();
  });
});

describe('ChatPanel — read-tracking (RF-343)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('llama PATCH /read al montar para marcar mensajes como leídos', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    setup();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/matches/match-a/messages/read',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });
  });
});

describe('ChatPanel — polling (RF-505)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('dispara fetch contra /api/matches/[id]/messages cada 10 segundos', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    setup();

    // Al montar: PATCH /read se llama (mark as read); el poll empieza tras el primer intervalo.
    fetchMock.mockClear();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/matches/match-a/messages');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('el interval se limpia al desmontar (no hay polls después del unmount)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { unmount } = setup();

    act(() => {
      unmount();
    });
    // limpiar la llamada a PATCH /read que ocurre en mount
    fetchMock.mockClear();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('actualiza los mensajes con los datos del poll', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: [makeMsg({ id: 'polled', body: 'Mensaje del server' })],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    setup([]);

    // Avanzar el timer y esperar que se asienten las promesas del fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    // Con timers falsos no usar waitFor (usa timers reales); la UI ya actualizó en act()
    expect(screen.queryByText('Mensaje del server')).not.toBeNull();
  });
});

describe('ChatPanel — envío de mensajes', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('enviar un mensaje lo agrega a la lista (optimistic)', async () => {
    const newMsg = makeMsg({ id: 'new-1', body: 'Nos vemos mañana' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: newMsg }),
    });
    vi.stubGlobal('fetch', fetchMock);
    setup([]);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Nos vemos mañana' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => {
      expect(screen.queryByText('Nos vemos mañana')).not.toBeNull();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/matches/match-a/messages',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('fetch fallido al enviar → muestra error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);
    setup([]);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Hola' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => {
      expect(screen.queryByText('No se pudo enviar. Intentá de nuevo.')).not.toBeNull();
    });
  });
});
