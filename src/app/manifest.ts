import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CambiaLa — Figuritas del Mundial 2026',
    short_name: 'CambiaLa',
    description:
      'Intercambiá figuritas del Mundial 2026 con coleccionistas de tu barrio en Uruguay.',
    start_url: '/album',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#0284c7',
    lang: 'es',
    categories: ['sports', 'social'],
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
