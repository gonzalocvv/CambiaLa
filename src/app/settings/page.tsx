import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { AppNavbar } from '@/components/layout/app-navbar';
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
    <>
      <AppNavbar />
      <div className="bg-background min-h-screen px-4 py-8">
        <div className="mx-auto max-w-lg">
          <h1 className="text-foreground mb-8 text-2xl font-bold">{t('title')}</h1>

          <SettingsForm
            initialName={profile.name ?? ''}
            initialBio={profile.bio ?? ''}
            initialCity={profile.city ?? ''}
            initialNeighborhood={profile.neighborhood ?? ''}
            initialWhatsapp={profile.whatsapp ?? ''}
            initialPublicProfile={profile.publicProfile}
          />
        </div>
      </div>
    </>
  );
}
