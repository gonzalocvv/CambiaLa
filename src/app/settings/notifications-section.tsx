'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type EmailFrequency = 'instant' | 'daily' | 'weekly' | 'never';

type Props = {
  initialNotifyOnMatch: boolean;
  initialEmailFrequency: EmailFrequency;
  initialPushEnabled: boolean;
};

export default function NotificationsSection({
  initialNotifyOnMatch,
  initialEmailFrequency,
  initialPushEnabled,
}: Props) {
  const t = useTranslations('Settings');
  const router = useRouter();

  const [notifyOnMatch, setNotifyOnMatch] = useState(initialNotifyOnMatch);
  const [emailFrequency, setEmailFrequency] = useState<EmailFrequency>(initialEmailFrequency);
  const [pushEnabled, setPushEnabled] = useState(initialPushEnabled);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveState('saving');
    setError('');
    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifyOnMatch, emailFrequency, pushEnabled }),
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
      <h2 className="text-foreground mb-1 text-lg font-semibold">{t('notificationsTitle')}</h2>
      <p className="text-muted-foreground mb-5 text-sm">{t('notificationsSubtitle')}</p>

      <form onSubmit={handleSave} className="space-y-4">
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

        {saveState === 'error' && error && <p className="text-destructive text-sm">{error}</p>}

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
