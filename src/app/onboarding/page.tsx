import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getSession } from '@/lib/auth';
import OnboardingForm from './OnboardingForm';

export async function generateMetadata() {
  const t = await getTranslations('Onboarding');
  return { title: `${t('title')} — CambiaLa` };
}

export default async function OnboardingPage() {
  const t = await getTranslations('Onboarding');
  const session = await getSession();

  if (!session) redirect('/auth/login');
  if (session.onboardingDoneAt) redirect('/matches');

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="bg-card border-border w-full max-w-sm rounded-2xl border p-8 shadow-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="mb-4 inline-flex text-2xl font-extrabold">
            <span className="text-brand">Cambia</span>
            <span className="text-accent">La</span>
          </Link>
          <h1 className="text-foreground mt-2 text-xl font-semibold">{t('title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>
        </div>

        <OnboardingForm />
      </div>
    </div>
  );
}
