import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://cambia-la.vercel.app';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/auth/',
        '/admin/',
        '/onboarding/',
        '/settings/',
        '/matches/',
        '/album/',
        '/conversations/',
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
