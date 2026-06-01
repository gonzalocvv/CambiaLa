import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockMatchRepo = vi.hoisted(() => ({
  findById: vi.fn(),
  findWithLastMessageByUser: vi.fn(),
}));

const mockMessageRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findByMatch: vi.fn(),
  countUnread: vi.fn(),
}));

vi.mock('@/repositories/match.repository', () => ({ matchRepository: mockMatchRepo }));
vi.mock('@/repositories/message.repository', () => ({ messageRepository: mockMessageRepo }));

import { MessageAccessError, MatchNotFoundError, messageService } from '../message.service';

const NOW = new Date('2026-06-01T12:00:00Z');

function makeMatch(overrides = {}) {
  return {
    id: 'match-1',
    userAId: 'user-a',
    userBId: 'user-b',
    score: 3,
    aToB: ['URU1'],
    bToA: ['ARG2'],
    status: 'active',
    lastUpdated: NOW,
    createdAt: NOW,
    ...overrides,
  };
}

function makeDbMessage(overrides = {}) {
  return {
    id: 'msg-1',
    matchId: 'match-1',
    fromUserId: 'user-a',
    body: 'Hola',
    createdAt: NOW,
    readAt: null,
    ...overrides,
  };
}

function makePartner(overrides = {}) {
  return {
    id: 'user-b',
    email: 'b@example.com',
    username: 'userb',
    name: 'User B',
    avatarUrl: null,
    bio: null,
    city: 'Montevideo',
    neighborhood: 'Centro',
    whatsapp: null,
    lat: null,
    lng: null,
    geoGranularity: 'none',
    role: 'user',
    publicProfile: false,
    isSuspended: false,
    notifyOnMatch: true,
    emailFrequency: 'instant',
    pushEnabled: false,
    pushSubscription: null,
    participatesInMatchmaking: true,
    matchRadius: 'department',
    offerUniques: false,
    acceptUnbalanced: true,
    isPro: false,
    proExpiresAt: null,
    reputation: 4.5,
    tradesCompleted: 3,
    createdAt: NOW,
    lastSeenAt: NOW,
    onboardingDoneAt: null,
    ...overrides,
  };
}

function makeMatchWithLastMessage(overrides = {}) {
  return {
    id: 'match-1',
    userAId: 'user-a',
    userBId: 'user-b',
    score: 3,
    aToB: ['URU1'],
    bToA: ['ARG2'],
    status: 'active',
    lastUpdated: NOW,
    createdAt: NOW,
    userA: makePartner({ id: 'user-a', email: 'a@example.com', username: 'usera' }),
    userB: makePartner(),
    messages: [makeDbMessage()],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('messageService.getMessages', () => {
  it('returns messages for a participant (user A)', async () => {
    mockMatchRepo.findById.mockResolvedValue(makeMatch());
    mockMessageRepo.findByMatch.mockResolvedValue([makeDbMessage()]);

    const result = await messageService.getMessages('match-1', 'user-a');

    expect(result).toHaveLength(1);
    expect(result[0].body).toBe('Hola');
    expect(result[0].fromUserId).toBe('user-a');
  });

  it('returns messages for a participant (user B)', async () => {
    mockMatchRepo.findById.mockResolvedValue(makeMatch());
    mockMessageRepo.findByMatch.mockResolvedValue([makeDbMessage({ fromUserId: 'user-b' })]);

    const result = await messageService.getMessages('match-1', 'user-b');

    expect(result).toHaveLength(1);
    expect(result[0].fromUserId).toBe('user-b');
  });

  it('throws MatchNotFoundError when match does not exist', async () => {
    mockMatchRepo.findById.mockResolvedValue(null);

    await expect(messageService.getMessages('nonexistent', 'user-a')).rejects.toThrow(
      MatchNotFoundError,
    );
  });

  it('throws MessageAccessError when user is not a participant', async () => {
    mockMatchRepo.findById.mockResolvedValue(makeMatch());

    await expect(messageService.getMessages('match-1', 'user-c')).rejects.toThrow(
      MessageAccessError,
    );
  });
});

describe('messageService.sendMessage', () => {
  it('creates and returns a new message', async () => {
    mockMatchRepo.findById.mockResolvedValue(makeMatch());
    mockMessageRepo.create.mockResolvedValue(makeDbMessage({ body: '¡Dale!' }));

    const result = await messageService.sendMessage('match-1', 'user-a', '¡Dale!');

    expect(mockMessageRepo.create).toHaveBeenCalledWith('match-1', 'user-a', '¡Dale!');
    expect(result.body).toBe('¡Dale!');
    expect(result.createdAt).toBe(NOW.toISOString());
    expect(result.readAt).toBeNull();
  });

  it('throws MessageAccessError when sender is not a participant', async () => {
    mockMatchRepo.findById.mockResolvedValue(makeMatch());

    await expect(messageService.sendMessage('match-1', 'user-x', 'hola')).rejects.toThrow(
      MessageAccessError,
    );
  });

  it('throws MatchNotFoundError when match does not exist', async () => {
    mockMatchRepo.findById.mockResolvedValue(null);

    await expect(messageService.sendMessage('nonexistent', 'user-a', 'hola')).rejects.toThrow(
      MatchNotFoundError,
    );
  });
});

describe('messageService.getConversationsForUser', () => {
  it('returns conversations with correct partner and last message for user A', async () => {
    const matchWithMsg = makeMatchWithLastMessage();
    mockMatchRepo.findWithLastMessageByUser.mockResolvedValue([matchWithMsg]);
    mockMessageRepo.countUnread.mockResolvedValue(2);

    const result = await messageService.getConversationsForUser('user-a');

    expect(result).toHaveLength(1);
    const conv = result[0];
    expect(conv.matchId).toBe('match-1');
    expect(conv.status).toBe('active');
    expect(conv.partner.id).toBe('user-b');
    expect(conv.partner.username).toBe('userb');
    expect(conv.lastMessage.body).toBe('Hola');
    expect(conv.lastMessage.isMine).toBe(true);
    expect(conv.lastMessage.fromUserId).toBe('user-a');
    expect(conv.unreadCount).toBe(2);
  });

  it('marks lastMessage.isMine=false when partner sent the last message', async () => {
    const matchWithMsg = makeMatchWithLastMessage({
      messages: [makeDbMessage({ fromUserId: 'user-b' })],
    });
    mockMatchRepo.findWithLastMessageByUser.mockResolvedValue([matchWithMsg]);
    mockMessageRepo.countUnread.mockResolvedValue(1);

    const result = await messageService.getConversationsForUser('user-a');

    expect(result[0].lastMessage.isMine).toBe(false);
  });

  it('returns partner from user B perspective', async () => {
    const matchWithMsg = makeMatchWithLastMessage();
    mockMatchRepo.findWithLastMessageByUser.mockResolvedValue([matchWithMsg]);
    mockMessageRepo.countUnread.mockResolvedValue(0);

    const result = await messageService.getConversationsForUser('user-b');

    expect(result[0].partner.id).toBe('user-a');
    expect(result[0].partner.username).toBe('usera');
  });

  it('returns empty array when no conversations exist', async () => {
    mockMatchRepo.findWithLastMessageByUser.mockResolvedValue([]);

    const result = await messageService.getConversationsForUser('user-a');

    expect(result).toEqual([]);
  });

  it('fetches unread counts in parallel for all conversations', async () => {
    const older = makeMatchWithLastMessage({
      id: 'match-2',
      messages: [makeDbMessage({ id: 'msg-2', createdAt: new Date('2026-06-01T10:00:00Z') })],
    });
    const newer = makeMatchWithLastMessage({
      messages: [makeDbMessage({ id: 'msg-1', createdAt: new Date('2026-06-01T12:00:00Z') })],
    });
    mockMatchRepo.findWithLastMessageByUser.mockResolvedValue([newer, older]);
    mockMessageRepo.countUnread.mockResolvedValueOnce(0).mockResolvedValueOnce(3);

    const result = await messageService.getConversationsForUser('user-a');

    expect(result).toHaveLength(2);
    expect(result[0].unreadCount).toBe(0);
    expect(result[1].unreadCount).toBe(3);
  });
});
