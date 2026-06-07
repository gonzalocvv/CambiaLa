/**
 * JSON-LD Schema.org helpers — RF-809.
 * toJsonLdString escapes < > & para que user content no rompa el script tag.
 */

export function toJsonLdString(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

export function buildWebSiteJsonLd(url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'CambiaLa',
    url,
    description: 'Plataforma para intercambiar figuritas del álbum Panini Mundial 2026 en Uruguay',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${url}/u/{username}`,
      'query-input': 'required name=username',
    },
  };
}

export function buildOrganizationJsonLd(url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'CambiaLa',
    url,
    description:
      'Plataforma C2C para intercambiar figuritas del álbum Panini Mundial 2026 en Uruguay',
  };
}

interface PersonJsonLdArgs {
  username: string;
  name: string;
  bio?: string | null;
  city?: string | null;
  baseUrl: string;
}

export function buildPersonJsonLd({ username, name, bio, city, baseUrl }: PersonJsonLdArgs) {
  const person: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    url: `${baseUrl}/u/${username}`,
  };
  if (bio) person.description = bio;
  if (city) {
    person.address = {
      '@type': 'PostalAddress',
      addressLocality: city,
      addressCountry: 'UY',
    };
  }
  return person;
}
