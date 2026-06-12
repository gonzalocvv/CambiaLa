import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import './globals.css';
import { SwRegister } from '@/components/pwa/sw-register';

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://cambia-la.vercel.app';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  const title = t('title');
  const description = t('description');
  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'es_UY',
      siteName: t('ogSiteName'),
      url: BASE_URL,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    appleWebApp: {
      capable: true,
      title: 'CambiaLa',
      statusBarStyle: 'default',
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        <SwRegister />
      </body>
    </html>
  );
}
