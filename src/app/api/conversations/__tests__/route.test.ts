import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockMessageService = vi.hoisted(() => ({
  getConversationsForUser: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }));
vi.mock('@/services/message.service', () => ({ messageService: mockMessageService }));

import { GET } from '../route';

const NOW = new Date('2026-06-01T12:00:00Z');

function makeSession() {
  return { userId: 'user-a', email: 'a@example.com', onboardingDoneAt: NOW };
}

function makeConversation(overrides = {}) {
  return {
    matchId: 'match-1',
    status: 'active',
    partner: {
      id: 'user-b',
      username: 'userb',
      name: 'User B',
      bio: null,
      avatarUrl: null,
      neighborhood: 'Centro',
      city: 'Montevideo',
      reputation: 4.5,
      tradesCompleted: 3,
    },
    lastMessage: {
      id: 'msg-1',
      body: 'Hola',
      createdAt: NOW.toISOString(),
      fromUserId: 'user-b',
      isMine: false,
    },
    unreadCount: 1,
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe('GET /api/conversations', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 200 with conversations list', async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockMessageService.getConversationsForUser.mockResolvedValue([makeConversation()]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.conversations).toHaveLength(1);
    expect(body.conversations[0].matchId).toBe('match-1');
    expect(body.conversations[0].unreadCount).toBe(1);
    expect(mockMessageService.getConversationsForUser).toHaveBeenCalledWith('user-a');
  });

  it('returns 200 with empty array when user has no conversations', async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockMessageService.getConversationsForUser.mockResolvedValue([]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.conversations).toEqual([]);
  });
});
