import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockGetMessages = vi.hoisted(() => vi.fn());
const mockSendMessage = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn(() => ({ allowed: true, remaining: 59 })));

vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }));
vi.mock('@/services/message.service', () => ({
  messageService: { getMessages: mockGetMessages, sendMessage: mockSendMessage },
  MatchNotFoundError: class MatchNotFoundError extends Error {},
  MessageAccessError: class MessageAccessError extends Error {},
}));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mockCheckRateLimit,
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

import { GET, POST } from '../route';

const NOW_ISO = '2026-06-01T12:00:00.000Z';

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeMessage(overrides = {}) {
  return {
    id: 'msg-1',
    matchId: 'match-1',
    fromUserId: 'user-a',
    body: 'Hola',
    createdAt: NOW_ISO,
    readAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockReturnValue({ allowed: true, remaining: 59 });
});

describe('GET /api/matches/[id]/messages', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET(
      new Request('http://localhost/api/matches/match-1/messages'),
      makeParams('match-1'),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 200 with messages', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-a', onboardingDoneAt: new Date() });
    mockGetMessages.mockResolvedValue([makeMessage()]);

    const res = await GET(
      new Request('http://localhost/api/matches/match-1/messages'),
      makeParams('match-1'),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].body).toBe('Hola');
  });

  it('returns 200 with empty array when no messages', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-a', onboardingDoneAt: new Date() });
    mockGetMessages.mockResolvedValue([]);

    const res = await GET(
      new Request('http://localhost/api/matches/match-1/messages'),
      makeParams('match-1'),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toHaveLength(0);
  });

  it('returns 404 when match not found or user is not a participant', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-x', onboardingDoneAt: new Date() });
    const { MatchNotFoundError } = await import('@/services/message.service');
    mockGetMessages.mockRejectedValue(new MatchNotFoundError());

    const res = await GET(
      new Request('http://localhost/api/matches/bad/messages'),
      makeParams('bad'),
    );

    expect(res.status).toBe(404);
  });
});

describe('POST /api/matches/[id]/messages — rate limit', () => {
  it('429 cuando se excede el rate limit', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-a', onboardingDoneAt: new Date() });
    mockCheckRateLimit.mockReturnValueOnce({ allowed: false, remaining: 0 });

    const res = await POST(
      new Request('http://localhost/api/matches/match-1/messages', {
        method: 'POST',
        body: JSON.stringify({ body: 'Hola' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('match-1'),
    );

    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe('rate_limited');
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});

describe('POST /api/matches/[id]/messages', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await POST(
      new Request('http://localhost/api/matches/match-1/messages', {
        method: 'POST',
        body: JSON.stringify({ body: 'Hola' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('match-1'),
    );

    expect(res.status).toBe(401);
  });

  it('returns 400 when body is missing', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-a', onboardingDoneAt: new Date() });

    const res = await POST(
      new Request('http://localhost/api/matches/match-1/messages', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('match-1'),
    );

    expect(res.status).toBe(400);
  });

  it('returns 400 when body exceeds 1000 chars', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-a', onboardingDoneAt: new Date() });

    const res = await POST(
      new Request('http://localhost/api/matches/match-1/messages', {
        method: 'POST',
        body: JSON.stringify({ body: 'x'.repeat(1001) }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('match-1'),
    );

    expect(res.status).toBe(400);
  });

  it('returns 201 with the new message', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-a', onboardingDoneAt: new Date() });
    mockSendMessage.mockResolvedValue(makeMessage({ body: '¡Dale!' }));

    const res = await POST(
      new Request('http://localhost/api/matches/match-1/messages', {
        method: 'POST',
        body: JSON.stringify({ body: '¡Dale!' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('match-1'),
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.message.body).toBe('¡Dale!');
    expect(mockSendMessage).toHaveBeenCalledWith('match-1', 'user-a', '¡Dale!');
  });

  it('returns 404 when user is not a participant', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-x', onboardingDoneAt: new Date() });
    const { MessageAccessError } = await import('@/services/message.service');
    mockSendMessage.mockRejectedValue(new MessageAccessError());

    const res = await POST(
      new Request('http://localhost/api/matches/match-1/messages', {
        method: 'POST',
        body: JSON.stringify({ body: 'hola' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('match-1'),
    );

    expect(res.status).toBe(404);
  });

  it('rethrows unknown errors', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-a', onboardingDoneAt: new Date() });
    mockSendMessage.mockRejectedValue(new Error('DB crash'));

    await expect(
      POST(
        new Request('http://localhost/api/matches/match-1/messages', {
          method: 'POST',
          body: JSON.stringify({ body: 'hola' }),
          headers: { 'Content-Type': 'application/json' },
        }),
        makeParams('match-1'),
      ),
    ).rejects.toThrow('DB crash');
  });
});

describe('GET /api/matches/[id]/messages — rethrow', () => {
  it('rethrows unknown errors', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-a', onboardingDoneAt: new Date() });
    mockGetMessages.mockRejectedValue(new Error('DB crash'));

    await expect(
      GET(new Request('http://localhost/api/matches/match-1/messages'), makeParams('match-1')),
    ).rejects.toThrow('DB crash');
  });
});
