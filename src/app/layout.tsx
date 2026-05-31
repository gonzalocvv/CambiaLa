import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CambiaLa — Cambia tus figuritas del Mundial 2026',
  description:
    'Plataforma para coleccionistas uruguayos. Cargá tu álbum, te avisamos cuando aparece alguien para cambiar.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
