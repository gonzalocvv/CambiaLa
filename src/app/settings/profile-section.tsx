'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { normalizeUruguayanMobile } from '@/lib/phone';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type Props = {
  initialName: string;
  initialBio: string;
  initialWhatsapp: string;
  initialPublicProfile: boolean;
};

export default function ProfileSection({
  initialName,
  initialBio,
  initialWhatsapp,
  initialPublicProfile,
}: Props) {
  const t = useTranslations('Settings');
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp);
  const [publicProfile, setPublicProfile] = useState(initialPublicProfile);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [profileError, setProfileError] = useState('');
  const [whatsappError, setWhatsappError] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveState('saving');
    setProfileError('');
    setWhatsappError('');

    // Accept the number as-is and normalize here.
    let normalizedWhatsapp: string | undefined;
    if (whatsapp.trim()) {
      const normalized = normalizeUruguayanMobile(whatsapp);
      if (!normalized) {
        setWhatsappError(t('whatsappError'));
        setSaveState('error');
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
        setSaveState('error');
        return;
      }
      if (normalizedWhatsapp) setWhatsapp(normalizedWhatsapp);
      setSaveState('saved');
      router.refresh();
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('error');
      setProfileError(t('saveError'));
    }
  }

  const buttonLabel =
    saveState === 'saving' ? t('saving') : saveState === 'saved' ? t('saved') : t('saveButton');

  return (
    <section className="bg-card border-border rounded-xl border p-6">
      <h2 className="text-foreground mb-1 text-lg font-semibold">{t('profileTitle')}</h2>
      <p className="text-muted-foreground mb-5 text-sm">{t('profileSubtitle')}</p>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label htmlFor="settings-name" className="text-foreground mb-1 block text-sm font-medium">
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
          <label htmlFor="settings-bio" className="text-foreground mb-1 block text-sm font-medium">
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

        {saveState === 'error' && profileError && (
          <p className="text-destructive text-sm">{profileError}</p>
        )}

        <button
          type="submit"
          disabled={saveState === 'saving'}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {buttonLabel}
        </button>
      </form>
    </section>
  );
}
