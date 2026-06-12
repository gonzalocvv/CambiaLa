import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockActivityPrisma = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
}));
const mockUserPrisma = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { activity: mockActivityPrisma, user: mockUserPrisma },
}));

import { activityRepository } from '../activity.repository';

const STARTS = new Date('2026-07-01T18:00:00Z');

function makeDbActivity(overrides: object = {}) {
  return {
    id: 'act-1',
    albumId: 'album-1',
    department: 'Tacuarembó',
    createdById: 'admin-1',
    title: 'Juntada',
    description: null,
    location: null,
    bannerUrl: null,
    startsAt: STARTS,
    endsAt: null,
    isPublished: true,
    createdAt: STARTS,
    updatedAt: STARTS,
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe('activityRepository.create', () => {
  it('creates an activity with the given data', async () => {
    const db = makeDbActivity();
    mockActivityPrisma.create.mockResolvedValue(db);

    const result = await activityRepository.create({
      albumId: 'album-1',
      department: 'Tacuarembó',
      createdById: 'admin-1',
      title: 'Juntada',
      startsAt: STARTS,
    });

    expect(mockActivityPrisma.create).toHaveBeenCalledWith({
      data: {
        albumId: 'album-1',
        department: 'Tacuarembó',
        createdById: 'admin-1',
        title: 'Juntada',
        startsAt: STARTS,
      },
    });
    expect(result).toEqual(db);
  });
});

describe('activityRepository.findById', () => {
  it('includes the author username and name', async () => {
    const db = makeDbActivity({ createdBy: { username: 'gonza', name: 'Gonza' } });
    mockActivityPrisma.findUnique.mockResolvedValue(db);

    const result = await activityRepository.findById('act-1');

    expect(mockActivityPrisma.findUnique).toHaveBeenCalledWith({
      where: { id: 'act-1' },
      include: { createdBy: { select: { username: true, name: true } } },
    });
    expect(result).toEqual(db);
  });
});

describe('activityRepository.findPublishedByDepartment', () => {
  it('filters by department + album + published, soonest first, with total', async () => {
    mockActivityPrisma.findMany.mockResolvedValue([makeDbActivity()]);
    mockActivityPrisma.count.mockResolvedValue(1);

    const result = await activityRepository.findPublishedByDepartment('Tacuarembó', 'album-1', {
      skip: 0,
      take: 20,
    });

    expect(mockActivityPrisma.findMany).toHaveBeenCalledWith({
      where: { department: 'Tacuarembó', albumId: 'album-1', isPublished: true },
      orderBy: { startsAt: 'asc' },
      skip: 0,
      take: 20,
    });
    expect(result).toEqual({ activities: [makeDbActivity()], total: 1 });
  });
});

describe('activityRepository.findAllForAdmin', () => {
  it('omits the department filter when not provided', async () => {
    mockActivityPrisma.findMany.mockResolvedValue([]);
    mockActivityPrisma.count.mockResolvedValue(0);

    await activityRepository.findAllForAdmin({ albumId: 'album-1', skip: 0, take: 20 });

    expect(mockActivityPrisma.findMany).toHaveBeenCalledWith({
      where: { albumId: 'album-1' },
      orderBy: { startsAt: 'desc' },
      skip: 0,
      take: 20,
    });
  });

  it('applies the department filter when provided', async () => {
    mockActivityPrisma.findMany.mockResolvedValue([]);
    mockActivityPrisma.count.mockResolvedValue(0);

    await activityRepository.findAllForAdmin({
      albumId: 'album-1',
      department: 'Rocha',
      skip: 0,
      take: 20,
    });

    expect(mockActivityPrisma.findMany).toHaveBeenCalledWith({
      where: { albumId: 'album-1', department: 'Rocha' },
      orderBy: { startsAt: 'desc' },
      skip: 0,
      take: 20,
    });
  });
});

describe('activityRepository.findUserIdsByDepartment', () => {
  it('returns ids of non-suspended users in the department', async () => {
    mockUserPrisma.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);

    const result = await activityRepository.findUserIdsByDepartment('Tacuarembó');

    expect(mockUserPrisma.findMany).toHaveBeenCalledWith({
      where: { city: 'Tacuarembó', isSuspended: false },
      select: { id: true },
    });
    expect(result).toEqual(['u1', 'u2']);
  });
});
