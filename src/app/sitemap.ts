import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://cambia-la.vercel.app';
  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/como-funciona`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/precios`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/contacto`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/privacidad`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${base}/terminos`, changeFrequency: 'yearly', priority: 0.4 },
  ];
}
