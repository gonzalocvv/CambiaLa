import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockMarkRead = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }));
vi.mock('@/services/message.service', () => ({
  messageService: { markRead: mockMarkRead },
  MatchNotFoundError: class MatchNotFoundError extends Error {},
  MessageAccessError: class MessageAccessError extends Error {},
}));

import { PATCH } from '../route';
import { MatchNotFoundError, MessageAccessError } from '@/services/message.service';

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => vi.clearAllMocks());

describe('PATCH /api/matches/[id]/messages/read', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await PATCH(
      new Request('http://localhost/api/matches/match-1/messages/read', { method: 'PATCH' }),
      makeParams('match-1'),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 200 ok when messages are marked as read', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-a', onboardingDoneAt: new Date() });
    mockMarkRead.mockResolvedValue(undefined);

    const res = await PATCH(
      new Request('http://localhost/api/matches/match-1/messages/read', { method: 'PATCH' }),
      makeParams('match-1'),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockMarkRead).toHaveBeenCalledWith('match-1', 'user-a');
  });

  it('returns 404 when match not found', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-a', onboardingDoneAt: new Date() });
    mockMarkRead.mockRejectedValue(new MatchNotFoundError());

    const res = await PATCH(
      new Request('http://localhost/api/matches/match-1/messages/read', { method: 'PATCH' }),
      makeParams('match-1'),
    );

    expect(res.status).toBe(404);
  });

  it('returns 404 when user is not a participant', async () => {
    mockGetSession.mockResolvedValue({ userId: 'user-x', onboardingDoneAt: new Date() });
    mockMarkRead.mockRejectedValue(new MessageAccessError());

    const res = await PATCH(
      new Request('http://localhost/api/matches/match-1/messages/read', { method: 'PATCH' }),
      makeParams('match-1'),
    );

    expect(res.status).toBe(404);
  });
});
