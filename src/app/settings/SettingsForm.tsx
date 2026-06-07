'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { URUGUAY_DEPARTMENTS, MONTEVIDEO_NEIGHBORHOODS } from '@/lib/locations';
import { normalizeUruguayanMobile } from '@/lib/phone';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type EmailFrequency = 'instant' | 'daily' | 'weekly' | 'never';
type MatchRadius = 'neighborhood' | 'department' | 'country';

type Props = {
  initialName: string;
  initialBio: string;
  initialCity: string;
  initialNeighborhood: string;
  initialWhatsapp: string;
  initialPublicProfile: boolean;
  initialNotifyOnMatch: boolean;
  initialEmailFrequency: EmailFrequency;
  initialPushEnabled: boolean;
  initialParticipatesInMatchmaking: boolean;
  initialMatchRadius: MatchRadius;
  initialOfferUniques: boolean;
  initialAcceptUnbalanced: boolean;
};

export default function SettingsForm({
  initialName,
  initialBio,
  initialCity,
  initialNeighborhood,
  initialWhatsapp,
  initialPublicProfile,
  initialNotifyOnMatch,
  initialEmailFrequency,
  initialPushEnabled,
  initialParticipatesInMatchmaking,
  initialMatchRadius,
  initialOfferUniques,
  initialAcceptUnbalanced,
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

  const [notifyOnMatch, setNotifyOnMatch] = useState(initialNotifyOnMatch);
  const [emailFrequency, setEmailFrequency] = useState<EmailFrequency>(initialEmailFrequency);
  const [pushEnabled, setPushEnabled] = useState(initialPushEnabled);

  const [participatesInMatchmaking, setParticipatesInMatchmaking] = useState(
    initialParticipatesInMatchmaking,
  );
  const [matchRadius, setMatchRadius] = useState<MatchRadius>(initialMatchRadius);
  const [offerUniques, setOfferUniques] = useState(initialOfferUniques);
  const [acceptUnbalanced, setAcceptUnbalanced] = useState(initialAcceptUnbalanced);

  const [profileSaveState, setProfileSaveState] = useState<SaveState>('idle');
  const [locationSaveState, setLocationSaveState] = useState<SaveState>('idle');
  const [notificationsSaveState, setNotificationsSaveState] = useState<SaveState>('idle');
  const [matchmakingSaveState, setMatchmakingSaveState] = useState<SaveState>('idle');
  const [profileError, setProfileError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [whatsappError, setWhatsappError] = useState('');
  const [notificationsError, setNotificationsError] = useState('');
  const [matchmakingError, setMatchmakingError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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

  async function handleSaveNotifications(e: React.FormEvent) {
    e.preventDefault();
    setNotificationsSaveState('saving');
    setNotificationsError('');
    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifyOnMatch, emailFrequency, pushEnabled }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setNotificationsError(data.error ?? t('saveError'));
        setNotificationsSaveState('error');
        return;
      }
      setNotificationsSaveState('saved');
      router.refresh();
      setTimeout(() => setNotificationsSaveState('idle'), 2000);
    } catch {
      setNotificationsSaveState('error');
      setNotificationsError(t('saveError'));
    }
  }

  async function handleSaveMatchmaking(e: React.FormEvent) {
    e.preventDefault();
    setMatchmakingSaveState('saving');
    setMatchmakingError('');
    try {
      const res = await fetch('/api/settings/matchmaking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participatesInMatchmaking,
          matchRadius,
          offerUniques,
          acceptUnbalanced,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setMatchmakingError(data.error ?? t('saveError'));
        setMatchmakingSaveState('error');
        return;
      }
      setMatchmakingSaveState('saved');
      router.refresh();
      setTimeout(() => setMatchmakingSaveState('idle'), 2000);
    } catch {
      setMatchmakingSaveState('error');
      setMatchmakingError(t('saveError'));
    }
  }

  function handleLogout() {
    startLogoutTransition(async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    });
  }

  async function handleDeleteAccount() {
    setIsDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/settings/account', { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setDeleteError(data.error ?? t('deleteAccountError'));
        setIsDeleting(false);
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setDeleteError(t('deleteAccountError'));
      setIsDeleting(false);
    }
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

  const notificationsButtonLabel =
    notificationsSaveState === 'saving'
      ? t('saving')
      : notificationsSaveState === 'saved'
        ? t('saved')
        : t('saveButton');

  const matchmakingButtonLabel =
    matchmakingSaveState === 'saving'
      ? t('saving')
      : matchmakingSaveState === 'saved'
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

      {/* Notifications section */}
      <section className="bg-card border-border rounded-xl border p-6">
        <h2 className="text-foreground mb-1 text-lg font-semibold">{t('notificationsTitle')}</h2>
        <p className="text-muted-foreground mb-5 text-sm">{t('notificationsSubtitle')}</p>

        <form onSubmit={handleSaveNotifications} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground text-sm font-medium">{t('notifyOnMatchLabel')}</p>
              <p className="text-muted-foreground text-xs">{t('notifyOnMatchSubtitle')}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notifyOnMatch}
              onClick={() => setNotifyOnMatch((v) => !v)}
              className={`focus:ring-primary relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${notifyOnMatch ? 'bg-primary' : 'bg-muted'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${notifyOnMatch ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          <div>
            <label
              htmlFor="settings-email-frequency"
              className="text-foreground mb-1 block text-sm font-medium"
            >
              {t('emailFrequencyLabel')}
            </label>
            <select
              id="settings-email-frequency"
              value={emailFrequency}
              onChange={(e) => setEmailFrequency(e.target.value as EmailFrequency)}
              className="border-border bg-background text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            >
              <option value="instant">{t('emailFrequencyInstant')}</option>
              <option value="daily">{t('emailFrequencyDaily')}</option>
              <option value="weekly">{t('emailFrequencyWeekly')}</option>
              <option value="never">{t('emailFrequencyNever')}</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground text-sm font-medium">{t('pushEnabledLabel')}</p>
              <p className="text-muted-foreground text-xs">{t('pushEnabledSubtitle')}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={pushEnabled}
              onClick={() => setPushEnabled((v) => !v)}
              className={`focus:ring-primary relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${pushEnabled ? 'bg-primary' : 'bg-muted'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${pushEnabled ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {notificationsSaveState === 'error' && notificationsError && (
            <p className="text-destructive text-sm">{notificationsError}</p>
          )}

          <button
            type="submit"
            disabled={notificationsSaveState === 'saving'}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {notificationsButtonLabel}
          </button>
        </form>
      </section>

      {/* Matchmaking section */}
      <section className="bg-card border-border rounded-xl border p-6">
        <h2 className="text-foreground mb-1 text-lg font-semibold">{t('matchmakingTitle')}</h2>
        <p className="text-muted-foreground mb-5 text-sm">{t('matchmakingSubtitle')}</p>

        <form onSubmit={handleSaveMatchmaking} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground text-sm font-medium">{t('participatesLabel')}</p>
              <p className="text-muted-foreground text-xs">{t('participatesSubtitle')}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={participatesInMatchmaking}
              onClick={() => setParticipatesInMatchmaking((v) => !v)}
              className={`focus:ring-primary relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${participatesInMatchmaking ? 'bg-primary' : 'bg-muted'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${participatesInMatchmaking ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          <div>
            <label
              htmlFor="settings-match-radius"
              className="text-foreground mb-1 block text-sm font-medium"
            >
              {t('matchRadiusLabel')}
            </label>
            <select
              id="settings-match-radius"
              value={matchRadius}
              onChange={(e) => setMatchRadius(e.target.value as MatchRadius)}
              className="border-border bg-background text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            >
              <option value="neighborhood">{t('matchRadiusNeighborhood')}</option>
              <option value="department">{t('matchRadiusDepartment')}</option>
              <option value="country">{t('matchRadiusCountry')}</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground text-sm font-medium">{t('offerUniquesLabel')}</p>
              <p className="text-muted-foreground text-xs">{t('offerUniquesSubtitle')}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={offerUniques}
              onClick={() => setOfferUniques((v) => !v)}
              className={`focus:ring-primary relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${offerUniques ? 'bg-primary' : 'bg-muted'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${offerUniques ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground text-sm font-medium">{t('acceptUnbalancedLabel')}</p>
              <p className="text-muted-foreground text-xs">{t('acceptUnbalancedSubtitle')}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={acceptUnbalanced}
              onClick={() => setAcceptUnbalanced((v) => !v)}
              className={`focus:ring-primary relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${acceptUnbalanced ? 'bg-primary' : 'bg-muted'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${acceptUnbalanced ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {matchmakingSaveState === 'error' && matchmakingError && (
            <p className="text-destructive text-sm">{matchmakingError}</p>
          )}

          <button
            type="submit"
            disabled={matchmakingSaveState === 'saving'}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {matchmakingButtonLabel}
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

      {/* Danger zone */}
      <section className="border-destructive/50 bg-card rounded-xl border p-6">
        <h2 className="text-destructive mb-1 text-lg font-semibold">{t('dangerZoneTitle')}</h2>
        <p className="text-muted-foreground mb-5 text-sm">{t('dangerZoneSubtitle')}</p>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          disabled={isDeleting}
          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('deleteAccountButton')}
        </button>
        {deleteError && <p className="text-destructive mt-3 text-sm">{deleteError}</p>}
      </section>

      {/* Confirmation modal */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="bg-overlay/80 fixed inset-0"
            onClick={() => !isDeleting && setShowDeleteModal(false)}
          />
          <div className="bg-card border-border relative w-full max-w-sm rounded-xl border p-6 shadow-lg">
            <h3 id="delete-modal-title" className="text-foreground mb-3 text-lg font-semibold">
              {t('deleteAccountModalTitle')}
            </h3>
            <p className="text-muted-foreground mb-6 text-sm">{t('deleteAccountModalBody')}</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="border-border text-foreground hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {t('deleteAccountModalCancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? t('deleteAccountDeleting') : t('deleteAccountModalConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
