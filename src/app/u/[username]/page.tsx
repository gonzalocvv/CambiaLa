import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

import { Badge } from '@/components/ui/badge';
import { AppNavbar } from '@/components/layout/app-navbar';
import { ShareButton } from '@/components/profile/share-button';
import { getSession } from '@/lib/auth';
import { userService, PublicProfileNotFoundError } from '@/services/user.service';
import { stickerService } from '@/services/sticker.service';

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  try {
    const user = await userService.getPublicProfileUser(username);
    const displayName = user.name ?? user.username ?? username;
    const description = user.bio ?? `Perfil de ${displayName} en CambiaLa`;
    return {
      title: `${displayName} — CambiaLa`,
      description,
      openGraph: {
        title: `${displayName} — CambiaLa`,
        description,
        type: 'profile',
        username: user.username ?? undefined,
      },
    };
  } catch {
    return { title: 'CambiaLa' };
  }
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const t = await getTranslations('PublicProfile');

  let user: Awaited<ReturnType<typeof userService.getPublicProfileUser>>;
  try {
    user = await userService.getPublicProfileUser(username);
  } catch (err) {
    if (err instanceof PublicProfileNotFoundError) notFound();
    throw err;
  }

  const [session, albumData] = await Promise.all([
    getSession(),
    stickerService.getUserAlbum(user.id),
  ]);

  const displayName = user.name ?? user.username ?? username;
  const location = user.neighborhood ?? user.city;
  const initials = displayName.slice(0, 2).toUpperCase();
  const isNewCollector = user.tradesCompleted < 5;
  const isOwnProfile = session?.userId === user.id;

  const stickers = albumData?.stickers ?? [];
  const stats = albumData?.stats ?? {
    total: 0,
    have: 0,
    missing: 0,
    duplicates: 0,
    percentComplete: 0,
  };
  const duplicatesList = stickers.filter((s) => s.count >= 2);
  const missingList = stickers.filter((s) => s.count === 0);

  const memberDate = new Date(user.createdAt).toLocaleDateString('es-UY', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <AppNavbar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        {/* Profile header */}
        <div className="mb-8 flex items-start gap-4">
          <div className="shrink-0">
            {user.avatarUrl ? (
              <div
                className="bg-muted h-20 w-20 rounded-full bg-cover bg-center"
                style={{ backgroundImage: `url(${user.avatarUrl})` }}
                role="img"
                aria-label={displayName}
              />
            ) : (
              <div className="bg-primary text-primary-foreground flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold">
                {initials}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-foreground text-2xl font-bold">{displayName}</h1>
            {user.username && user.name && (
              <p className="text-muted-foreground text-sm">@{user.username}</p>
            )}
            {location && <p className="text-muted-foreground text-sm">{location}</p>}
            {user.bio && <p className="text-foreground mt-2 text-sm">{user.bio}</p>}
            <p className="text-muted-foreground mt-2 text-xs">
              {isNewCollector
                ? t('newCollector')
                : `${user.reputation.toFixed(1)} ⭐ · ${t('trades', { count: user.tradesCompleted })}`}
            </p>
            <p className="text-muted-foreground text-xs">{t('member', { date: memberDate })}</p>
          </div>
        </div>

        {/* CTAs — RF-706 / RF-707 */}
        <div className="mb-8 flex flex-wrap gap-3">
          {isOwnProfile ? (
            <Link
              href="/settings"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {t('editProfile')}
            </Link>
          ) : session ? (
            <Link
              href="/matches"
              className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {t('viewMatches')}
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {t('ctaLogin')}
            </Link>
          )}
          <ShareButton label={t('share')} copiedLabel={t('shareCopied')} />
        </div>

        {/* Album summary — RF-703 */}
        {albumData && (
          <section className="mb-8">
            <h2 className="text-foreground mb-4 text-base font-semibold">{t('albumTitle')}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="bg-card border-border rounded-lg border p-3 text-center">
                <p className="text-foreground text-xl font-bold">{stats.percentComplete}%</p>
                <p className="text-muted-foreground text-xs">{t('statComplete')}</p>
              </div>
              <div className="bg-card border-border rounded-lg border p-3 text-center">
                <p className="text-foreground text-xl font-bold">{stats.have}</p>
                <p className="text-muted-foreground text-xs">{t('statHave')}</p>
              </div>
              <div className="bg-card border-border rounded-lg border p-3 text-center">
                <p className="text-foreground text-xl font-bold">{stats.duplicates}</p>
                <p className="text-muted-foreground text-xs">{t('statDuplicates')}</p>
              </div>
              <div className="bg-card border-border rounded-lg border p-3 text-center">
                <p className="text-foreground text-xl font-bold">{stats.missing}</p>
                <p className="text-muted-foreground text-xs">{t('statMissing')}</p>
              </div>
            </div>
          </section>
        )}

        {/* Duplicates list — RF-704 */}
        {duplicatesList.length > 0 && (
          <section className="mb-8">
            <h2 className="text-foreground mb-1 text-base font-semibold">
              {t('duplicatesTitle')}
              <span className="text-muted-foreground ml-2 text-sm font-normal">
                ({duplicatesList.length})
              </span>
            </h2>
            <p className="text-muted-foreground mb-3 text-xs">{t('duplicatesHint')}</p>
            <div className="flex flex-wrap gap-1.5">
              {duplicatesList.map((s) => (
                <Badge key={s.id} variant="secondary" className="font-mono text-xs">
                  {s.number}
                  {s.count > 2 && <span className="text-muted-foreground ml-1">×{s.count}</span>}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* Missing list — RF-705 */}
        {missingList.length > 0 && (
          <section>
            <h2 className="text-foreground mb-1 text-base font-semibold">
              {t('missingTitle')}
              <span className="text-muted-foreground ml-2 text-sm font-normal">
                ({missingList.length})
              </span>
            </h2>
            <p className="text-muted-foreground mb-3 text-xs">{t('missingHint')}</p>
            <div className="flex flex-wrap gap-1.5">
              {missingList.map((s) => (
                <Badge key={s.id} variant="outline" className="font-mono text-xs">
                  {s.number}
                </Badge>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
