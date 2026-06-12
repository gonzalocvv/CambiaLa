import type { Activity } from '@prisma/client';

import { logger } from '@/lib/logger';
import { uploadActivityBanner } from '@/lib/storage/activity-banner';
import type {
  ActivityDetail,
  ActivityItem,
  CreateActivityInput,
  ListActivitiesQuery,
  ListActivitiesResponse,
  UpdateActivityInput,
} from '@/lib/validations/activity.schema';
import { albumRepository } from '@/repositories/album.repository';
import {
  activityRepository,
  type ActivityWithAuthor,
  type UpdateActivityData,
} from '@/repositories/activity.repository';
import { notificationService } from '@/services/notification.service';

export class NoActiveAlbumError extends Error {
  constructor() {
    super('no_active_album');
    this.name = 'NoActiveAlbumError';
  }
}

export class ActivityNotFoundError extends Error {
  constructor() {
    super('activity_not_found');
    this.name = 'ActivityNotFoundError';
  }
}

function toItem(a: Activity): ActivityItem {
  return {
    id: a.id,
    albumId: a.albumId,
    department: a.department,
    title: a.title,
    description: a.description ?? null,
    location: a.location ?? null,
    bannerUrl: a.bannerUrl ?? null,
    startsAt: a.startsAt.toISOString(),
    endsAt: a.endsAt ? a.endsAt.toISOString() : null,
    isPublished: a.isPublished,
    createdById: a.createdById,
    createdAt: a.createdAt.toISOString(),
  };
}

function toDetail(a: ActivityWithAuthor): ActivityDetail {
  return {
    ...toItem(a),
    author: a.createdBy
      ? { username: a.createdBy.username ?? null, name: a.createdBy.name ?? null }
      : null,
  };
}

// Notifica in-app a los usuarios del depto (excluye al autor). Tolerante a fallos:
// un error de notificación NO debe romper la creación de la actividad
// (patrón de match.service). Cada notificación se aísla con su propio catch.
async function fanOutNewActivity(activity: Activity, authorId: string): Promise<void> {
  try {
    const userIds = await activityRepository.findUserIdsByDepartment(activity.department);
    const recipients = userIds.filter((id) => id !== authorId);
    await Promise.all(
      recipients.map((id) =>
        notificationService
          .createNotification(id, 'new_activity', {
            activityId: activity.id,
            title: activity.title,
            department: activity.department,
          })
          .catch((error: unknown) =>
            logger.error('new_activity notification failed', {
              userId: id,
              error: error instanceof Error ? error.message : String(error),
            }),
          ),
      ),
    );
  } catch (error) {
    logger.error('new_activity fan-out failed', {
      activityId: activity.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export const activityService = {
  async createActivity(
    input: CreateActivityInput,
    authorId: string,
    bannerFile?: File | null,
  ): Promise<ActivityItem> {
    const album = await albumRepository.findActiveAlbum();
    if (!album) throw new NoActiveAlbumError();

    // BannerValidationError (MIME/size) se propaga → la route responde 400.
    const bannerUrl = bannerFile ? await uploadActivityBanner(bannerFile) : null;

    const activity = await activityRepository.create({
      albumId: album.id,
      department: input.department,
      createdById: authorId,
      title: input.title,
      description: input.description ?? null,
      location: input.location ?? null,
      bannerUrl,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      isPublished: true,
    });

    await fanOutNewActivity(activity, authorId);
    return toItem(activity);
  },

  async updateActivity(
    id: string,
    input: UpdateActivityInput,
    bannerFile?: File | null,
  ): Promise<ActivityItem> {
    const existing = await activityRepository.findById(id);
    if (!existing) throw new ActivityNotFoundError();

    const data: UpdateActivityData = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description ?? null } : {}),
      ...(input.location !== undefined ? { location: input.location ?? null } : {}),
      ...(input.department !== undefined ? { department: input.department } : {}),
      ...(input.startsAt !== undefined ? { startsAt: input.startsAt } : {}),
      ...(input.endsAt !== undefined ? { endsAt: input.endsAt ?? null } : {}),
    };

    if (bannerFile) {
      const bannerUrl = await uploadActivityBanner(bannerFile);
      if (bannerUrl) data.bannerUrl = bannerUrl;
    }

    const updated = await activityRepository.update(id, data);
    return toItem(updated);
  },

  async deleteActivity(id: string): Promise<void> {
    const existing = await activityRepository.findById(id);
    if (!existing) throw new ActivityNotFoundError();
    await activityRepository.delete(id);
  },

  // Lista para usuarios: default department = ciudad del usuario; null si no hay depto.
  async listForDepartment(
    userCity: string | null,
    query: ListActivitiesQuery,
  ): Promise<ListActivitiesResponse> {
    const department = query.department ?? userCity ?? null;
    const album = await albumRepository.findActiveAlbum();
    if (!album || !department) {
      return { activities: [], total: 0, department };
    }
    const skip = (query.page - 1) * query.pageSize;
    const { activities, total } = await activityRepository.findPublishedByDepartment(
      department,
      album.id,
      { skip, take: query.pageSize },
    );
    return { activities: activities.map(toItem), total, department };
  },

  async listForAdmin(query: ListActivitiesQuery): Promise<ListActivitiesResponse> {
    const album = await albumRepository.findActiveAlbum();
    if (!album) return { activities: [], total: 0, department: query.department ?? null };
    const skip = (query.page - 1) * query.pageSize;
    const { activities, total } = await activityRepository.findAllForAdmin({
      albumId: album.id,
      department: query.department,
      skip,
      take: query.pageSize,
    });
    return { activities: activities.map(toItem), total, department: query.department ?? null };
  },

  async getActivityDetail(id: string): Promise<ActivityDetail | null> {
    const activity = await activityRepository.findById(id);
    return activity ? toDetail(activity) : null;
  },
};
