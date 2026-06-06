'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { URUGUAY_DEPARTMENTS, MONTEVIDEO_NEIGHBORHOODS } from '@/lib/locations';
import { normalizeUruguayanMobile } from '@/lib/phone';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type Props = {
  initialName: string;
  initialBio: string;
  initialCity: string;
  initialNeighborhood: string;
  initialWhatsapp: string;
  initialPublicProfile: boolean;
};

export default function SettingsForm({
  initialName,
  initialBio,
  initialCity,
  initialNeighborhood,
  initialWhatsapp,
  initialPublicProfile,
}: Props) {
  const t = useTranslations('Settings');
  const router = useRouter();
  const [isPendingLogout, startLogoutTransition] = useTransition();

  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp);
  const [publicProfile, setPublicProfile] = useState(initialPublicProfile);
  const [city, setCity] = useState(initialCity);
  const [neighborhood, setNeighborhood] = useState(initialNeighborhood);

  const [profileSaveState, setProfileSaveState] = useState<SaveState>('idle');
  const [locationSaveState, setLocationSaveState] = useState<SaveState>('idle');
  const [profileError, setProfileError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [whatsappError, setWhatsappError] = useState('');

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaveState('saving');
    setProfileError('');
    setWhatsappError('');

    // Aceptamos el celular como lo escriba el usuario y lo normalizamos acá.
    let normalizedWhatsapp: string | undefined;
    if (whatsapp.trim()) {
      const normalized = normalizeUruguayanMobile(whatsapp);
      if (!normalized) {
        setWhatsappError(t('whatsappError'));
        setProfileSaveState('error');
        return;
      }
      normalizedWhatsapp = normalized;
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || undefined,
          bio: bio || undefined,
          whatsapp: normalizedWhatsapp,
          publicProfile,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setProfileError(data.error ?? t('saveError'));
        setProfileSaveState('error');
        return;
      }
      if (normalizedWhatsapp) setWhatsapp(normalizedWhatsapp);
      setProfileSaveState('saved');
      router.refresh();
      setTimeout(() => setProfileSaveState('idle'), 2000);
    } catch {
      setProfileSaveState('error');
      setProfileError(t('saveError'));
    }
  }

  async function handleSaveLocation(e: React.FormEvent) {
    e.preventDefault();
    setLocationSaveState('saving');
    setLocationError('');
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
        setLocationError(data.error ?? t('saveError'));
        setLocationSaveState('error');
        return;
      }
      setLocationSaveState('saved');
      router.refresh();
      setTimeout(() => setLocationSaveState('idle'), 2000);
    } catch {
      setLocationSaveState('error');
      setLocationError(t('saveError'));
    }
  }

  function handleLogout() {
    startLogoutTransition(async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    });
  }

  const profileButtonLabel =
    profileSaveState === 'saving'
      ? t('saving')
      : profileSaveState === 'saved'
        ? t('saved')
        : t('saveButton');

  const locationButtonLabel =
    locationSaveState === 'saving'
      ? t('saving')
      : locationSaveState === 'saved'
        ? t('saved')
        : t('saveButton');

  return (
    <div className="space-y-8">
      {/* Profile section */}
      <section className="bg-card border-border rounded-xl border p-6">
        <h2 className="text-foreground mb-1 text-lg font-semibold">{t('profileTitle')}</h2>
        <p className="text-muted-foreground mb-5 text-sm">{t('profileSubtitle')}</p>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label
              htmlFor="settings-name"
              className="text-foreground mb-1 block text-sm font-medium"
            >
              {t('nameLabel')}
            </label>
            <input
              id="settings-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              maxLength={50}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="settings-bio"
              className="text-foreground mb-1 block text-sm font-medium"
            >
              {t('bioLabel')}
            </label>
            <textarea
              id="settings-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t('bioPlaceholder')}
              maxLength={140}
              rows={3}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary w-full resize-none rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            />
            <p className="text-muted-foreground mt-1 text-right text-xs">
              {t('bioHint', { count: bio.length })}
            </p>
          </div>

          <div>
            <label
              htmlFor="settings-whatsapp"
              className="text-foreground mb-1 block text-sm font-medium"
            >
              {t('whatsappLabel')}
            </label>
            <input
              id="settings-whatsapp"
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder={t('whatsappPlaceholder')}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            />
            <p className="text-muted-foreground mt-1 text-xs">{t('whatsappHint')}</p>
            {whatsappError && <p className="text-destructive mt-1 text-xs">{whatsappError}</p>}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground text-sm font-medium">{t('publicProfileLabel')}</p>
              <p className="text-muted-foreground text-xs">{t('publicProfileSubtitle')}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={publicProfile}
              onClick={() => setPublicProfile((v) => !v)}
              className={`focus:ring-primary relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${
                publicProfile ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  publicProfile ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {profileSaveState === 'error' && profileError && (
            <p className="text-destructive text-sm">{profileError}</p>
          )}

          <button
            type="submit"
            disabled={profileSaveState === 'saving'}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {profileButtonLabel}
          </button>
        </form>
      </section>

      {/* Location section */}
      <section className="bg-card border-border rounded-xl border p-6">
        <h2 className="text-foreground mb-1 text-lg font-semibold">{t('locationTitle')}</h2>
        <p className="text-muted-foreground mb-5 text-sm">{t('locationSubtitle')}</p>

        <form onSubmit={handleSaveLocation} className="space-y-4">
          <div>
            <label
              htmlFor="settings-city"
              className="text-foreground mb-1 block text-sm font-medium"
            >
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

          {locationSaveState === 'error' && locationError && (
            <p className="text-destructive text-sm">{locationError}</p>
          )}

          <button
            type="submit"
            disabled={
              locationSaveState === 'saving' || !city || (city === 'Montevideo' && !neighborhood)
            }
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {locationButtonLabel}
          </button>
        </form>
      </section>

      {/* Account section */}
      <section className="bg-card border-border rounded-xl border p-6">
        <h2 className="text-foreground mb-5 text-lg font-semibold">{t('accountTitle')}</h2>
        <button
          onClick={handleLogout}
          disabled={isPendingLogout}
          className="border-border text-foreground hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPendingLogout ? t('loggingOut') : t('logoutButton')}
        </button>
      </section>
    </div>
  );
}
