import { redirect } from 'next/navigation';

import { getTranslations } from 'next-intl/server';

import { AppNavbar } from '@/components/layout/app-navbar';
import { getSession } from '@/lib/auth';
import { stickerService } from '@/services/sticker.service';

import { AlbumClient } from './AlbumClient';

export default async function AlbumPage() {
  const session = await getSession();
  if (!session) {
    redirect('/auth/login');
  }

  const album = await stickerService.getUserAlbum(session.userId);
  if (!album) {
    redirect('/');
  }

  const t = await getTranslations('Album');

  return (
    <>
      <AppNavbar />
      <main className="bg-background min-h-screen">
        <div className="container mx-auto max-w-5xl px-4 py-6">
          <h1 className="text-foreground mb-6 text-2xl font-bold">{t('title')}</h1>
          <AlbumClient stickers={album.stickers} initialStats={album.stats} />
        </div>
      </main>
    </>
  );
}
