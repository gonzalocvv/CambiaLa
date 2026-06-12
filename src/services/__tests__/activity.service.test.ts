import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAlbumRepo = vi.hoisted(() => ({
  findActiveAlbum: vi.fn(),
}));
const mockActivityRepo = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findById: vi.fn(),
  findPublishedByDepartment: vi.fn(),
  findAllForAdmin: vi.fn(),
  findUserIdsByDepartment: vi.fn(),
}));
const mockNotificationService = vi.hoisted(() => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));
const mockUpload = vi.hoisted(() => vi.fn());
const mockLogger = vi.hoisted(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }));

vi.mock('@/repositories/album.repository', () => ({ albumRepository: mockAlbumRepo }));
vi.mock('@/repositories/activity.repository', () => ({ activityRepository: mockActivityRepo }));
vi.mock('@/services/notification.service', () => ({
  notificationService: mockNotificationService,
}));
vi.mock('@/lib/storage/activity-banner', () => ({ uploadActivityBanner: mockUpload }));
vi.mock('@/lib/logger', () => ({ logger: mockLogger }));

import { activityService, NoActiveAlbumError } from '../activity.service';

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

const validInput = {
  title: 'Juntada',
  department: 'Tacuarembó' as const,
  startsAt: STARTS,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAlbumRepo.findActiveAlbum.mockResolvedValue({ id: 'album-1', isActive: true });
  mockActivityRepo.create.mockResolvedValue(makeDbActivity());
  mockActivityRepo.findUserIdsByDepartment.mockResolvedValue([]);
  mockNotificationService.createNotification.mockResolvedValue(undefined);
});

describe('activityService.createActivity', () => {
  it('resolves the active album and creates the activity with its id', async () => {
    const result = await activityService.createActivity(validInput, 'admin-1');

    expect(mockActivityRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ albumId: 'album-1', createdById: 'admin-1', bannerUrl: null }),
    );
    expect(result.id).toBe('act-1');
    expect(result.startsAt).toBe(STARTS.toISOString());
  });

  it('throws NoActiveAlbumError when there is no active album', async () => {
    mockAlbumRepo.findActiveAlbum.mockResolvedValue(null);
    await expect(activityService.createActivity(validInput, 'admin-1')).rejects.toBeInstanceOf(
      NoActiveAlbumError,
    );
  });

  it('fans out new_activity notifications to the department, excluding the author', async () => {
    mockActivityRepo.findUserIdsByDepartment.mockResolvedValue(['admin-1', 'u2', 'u3']);

    await activityService.createActivity(validInput, 'admin-1');

    expect(mockNotificationService.createNotification).toHaveBeenCalledTimes(2);
    const notified = mockNotificationService.createNotification.mock.calls.map((c) => c[0]);
    expect(notified).toEqual(['u2', 'u3']);
    expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
      'u2',
      'new_activity',
      expect.objectContaining({ activityId: 'act-1', department: 'Tacuarembó' }),
    );
  });

  it('does not fail the creation when a notification throws', async () => {
    mockActivityRepo.findUserIdsByDepartment.mockResolvedValue(['u2']);
    mockNotificationService.createNotification.mockRejectedValue(new Error('boom'));

    const result = await activityService.createActivity(validInput, 'admin-1');
    expect(result.id).toBe('act-1');
  });

  it('uploads the banner when a file is given and persists the returned url', async () => {
    mockUpload.mockResolvedValue('https://cdn/banner.png');
    mockActivityRepo.create.mockResolvedValue(
      makeDbActivity({ bannerUrl: 'https://cdn/banner.png' }),
    );

    const file = { type: 'image/png', size: 100 } as unknown as File;
    const result = await activityService.createActivity(validInput, 'admin-1', file);

    expect(mockUpload).toHaveBeenCalledWith(file);
    expect(mockActivityRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ bannerUrl: 'https://cdn/banner.png' }),
    );
    expect(result.bannerUrl).toBe('https://cdn/banner.png');
  });

  it('creates without banner when storage returns null', async () => {
    mockUpload.mockResolvedValue(null);
    const file = { type: 'image/png', size: 100 } as unknown as File;

    await activityService.createActivity(validInput, 'admin-1', file);
    expect(mockActivityRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ bannerUrl: null }),
    );
  });
});

describe('activityService.listForDepartment', () => {
  it('defaults the department to the user city when no filter is given', async () => {
    mockActivityRepo.findPublishedByDepartment.mockResolvedValue({ activities: [], total: 0 });

    const result = await activityService.listForDepartment('Rocha', { page: 1, pageSize: 20 });

    expect(mockActivityRepo.findPublishedByDepartment).toHaveBeenCalledWith('Rocha', 'album-1', {
      skip: 0,
      take: 20,
    });
    expect(result.department).toBe('Rocha');
  });

  it('returns an empty list with null department when user has no city and no filter', async () => {
    const result = await activityService.listForDepartment(null, { page: 1, pageSize: 20 });
    expect(result).toEqual({ activities: [], total: 0, department: null });
    expect(mockActivityRepo.findPublishedByDepartment).not.toHaveBeenCalled();
  });
});

describe('activityService.getActivityDetail', () => {
  it('returns null when the activity is missing', async () => {
    mockActivityRepo.findById.mockResolvedValue(null);
    expect(await activityService.getActivityDetail('nope')).toBeNull();
  });

  it('maps the author when present', async () => {
    mockActivityRepo.findById.mockResolvedValue(
      makeDbActivity({ createdBy: { username: 'gonza', name: 'Gonza' } }),
    );
    const detail = await activityService.getActivityDetail('act-1');
    expect(detail?.author).toEqual({ username: 'gonza', name: 'Gonza' });
  });
});
