import { LoginForm } from './LoginForm';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export async function generateMetadata() {
  const t = await getTranslations('Auth.login');
  return { title: `${t('title')} — CambiaLa` };
}

export default async function LoginPage({ searchParams }: Props) {
  const t = await getTranslations('Auth.login');
  const params = await searchParams;
  const hasError = Boolean(params.error);

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

        {hasError && (
          <div className="bg-destructive/10 text-destructive mb-4 rounded-lg px-4 py-3 text-sm">
            {t('callbackError')}
          </div>
        )}

        <LoginForm />

        <p className="text-muted-foreground mt-6 text-center text-xs">
          <Link href="/" className="hover:text-foreground underline transition-colors">
            {t('backToHome')}
          </Link>
        </p>
      </div>
    </div>
  );
}
