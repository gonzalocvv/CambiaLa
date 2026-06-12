import type { Album } from '@prisma/client';

import { prisma } from '@/lib/prisma';

export const albumRepository = {
  // Resuelve el álbum activo del MVP (mono-álbum en UI). Prioriza el más reciente
  // por releasedAt. El dato queda parametrizado para multi-álbum en F2.
  async findActiveAlbum(): Promise<Album | null> {
    return prisma.album.findFirst({
      where: { isActive: true },
      orderBy: { releasedAt: 'desc' },
    });
  },
};
