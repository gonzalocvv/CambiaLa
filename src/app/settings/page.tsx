import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getSession } from '@/lib/auth';
import { userService } from '@/services/user.service';
import SettingsForm from './SettingsForm';

export async function generateMetadata() {
  const t = await getTranslations('Settings');
  return { title: `${t('title')} — CambiaLa` };
}

export default async function SettingsPage() {
  const t = await getTranslations('Settings');
  const session = await getSession();

  if (!session) redirect('/auth/login');
  if (!session.onboardingDoneAt) redirect('/onboarding');

  const profile = await userService.getUserProfile(session.userId);

  return (
    <div className="bg-background min-h-screen px-4 py-8">
      <div className="mx-auto max-w-lg">
        <Link
          href="/matches"
          className="text-muted-foreground hover:text-foreground mb-6 inline-block text-sm transition-colors"
        >
          {t('backToMatches')}
        </Link>
        <h1 className="text-foreground mb-8 text-2xl font-bold">{t('title')}</h1>

        <SettingsForm
          initialName={profile.name ?? ''}
          initialBio={profile.bio ?? ''}
          initialCity={profile.city ?? ''}
          initialNeighborhood={profile.neighborhood ?? ''}
        />
      </div>
    </div>
  );
}
