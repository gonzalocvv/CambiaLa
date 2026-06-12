import type { Activity } from '@prisma/client';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

export type CreateActivityData = {
  albumId: string;
  department: string;
  createdById: string;
  title: string;
  description?: string | null;
  location?: string | null;
  bannerUrl?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
  isPublished?: boolean;
};

export type UpdateActivityData = {
  department?: string;
  title?: string;
  description?: string | null;
  location?: string | null;
  bannerUrl?: string | null;
  startsAt?: Date;
  endsAt?: Date | null;
  isPublished?: boolean;
};

export type ActivityWithAuthor = Prisma.ActivityGetPayload<{
  include: { createdBy: { select: { username: true; name: true } } };
}>;

type Page = { skip: number; take: number };

const AUTHOR_SELECT = { createdBy: { select: { username: true, name: true } } } as const;

export const activityRepository = {
  async create(data: CreateActivityData): Promise<Activity> {
    return prisma.activity.create({ data });
  },

  async update(id: string, data: UpdateActivityData): Promise<Activity> {
    return prisma.activity.update({ where: { id }, data });
  },

  async delete(id: string): Promise<Activity> {
    return prisma.activity.delete({ where: { id } });
  },

  async findById(id: string): Promise<ActivityWithAuthor | null> {
    return prisma.activity.findUnique({ where: { id }, include: AUTHOR_SELECT });
  },

  // Lista visible para usuarios: publicadas del depto + álbum, próximas primero.
  async findPublishedByDepartment(
    department: string,
    albumId: string,
    { skip, take }: Page,
  ): Promise<{ activities: Activity[]; total: number }> {
    const where = { department, albumId, isPublished: true };
    const [activities, total] = await Promise.all([
      prisma.activity.findMany({ where, orderBy: { startsAt: 'asc' }, skip, take }),
      prisma.activity.count({ where }),
    ]);
    return { activities, total };
  },

  // Lista admin: todas (publicadas o no), más recientes primero.
  async findAllForAdmin({
    department,
    albumId,
    skip,
    take,
  }: Page & { department?: string; albumId: string }): Promise<{
    activities: Activity[];
    total: number;
  }> {
    const where = { albumId, ...(department ? { department } : {}) };
    const [activities, total] = await Promise.all([
      prisma.activity.findMany({ where, orderBy: { startsAt: 'desc' }, skip, take }),
      prisma.activity.count({ where }),
    ]);
    return { activities, total };
  },

  // IDs de usuarios activos (no suspendidos) del depto, para el fan-out de notificaciones.
  async findUserIdsByDepartment(department: string): Promise<string[]> {
    const users = await prisma.user.findMany({
      where: { city: department, isSuspended: false },
      select: { id: true },
    });
    return users.map((u) => u.id);
  },
};
