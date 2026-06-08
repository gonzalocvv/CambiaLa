'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { URUGUAY_DEPARTMENTS, MONTEVIDEO_NEIGHBORHOODS } from '@/lib/locations';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type Props = {
  initialCity: string;
  initialNeighborhood: string;
};

export default function LocationSection({ initialCity, initialNeighborhood }: Props) {
  const t = useTranslations('Settings');
  const router = useRouter();

  const [city, setCity] = useState(initialCity);
  const [neighborhood, setNeighborhood] = useState(initialNeighborhood);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveState('saving');
    setError('');
    try {
      const res = await fetch('/api/settings/location', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          neighborhood: city === 'Montevideo' ? neighborhood || undefined : undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? t('saveError'));
        setSaveState('error');
        return;
      }
      setSaveState('saved');
      router.refresh();
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('error');
      setError(t('saveError'));
    }
  }

  const buttonLabel =
    saveState === 'saving' ? t('saving') : saveState === 'saved' ? t('saved') : t('saveButton');

  return (
    <section className="bg-card border-border rounded-xl border p-6">
      <h2 className="text-foreground mb-1 text-lg font-semibold">{t('locationTitle')}</h2>
      <p className="text-muted-foreground mb-5 text-sm">{t('locationSubtitle')}</p>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label htmlFor="settings-city" className="text-foreground mb-1 block text-sm font-medium">
            {t('cityLabel')}
          </label>
          <select
            id="settings-city"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              if (e.target.value !== 'Montevideo') setNeighborhood('');
            }}
            className="border-border bg-background text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
          >
            <option value="">{t('cityPlaceholder')}</option>
            {URUGUAY_DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {city === 'Montevideo' && (
          <div>
            <label
              htmlFor="settings-neighborhood"
              className="text-foreground mb-1 block text-sm font-medium"
            >
              {t('neighborhoodLabel')}
            </label>
            <select
              id="settings-neighborhood"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className="border-border bg-background text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            >
              <option value="">{t('neighborhoodPlaceholder')}</option>
              {MONTEVIDEO_NEIGHBORHOODS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        )}

        {saveState === 'error' && error && <p className="text-destructive text-sm">{error}</p>}

        <button
          type="submit"
          disabled={saveState === 'saving' || !city || (city === 'Montevideo' && !neighborhood)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {buttonLabel}
        </button>
      </form>
    </section>
  );
}
