'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type MatchRadius = 'neighborhood' | 'department' | 'country';

type Props = {
  initialParticipatesInMatchmaking: boolean;
  initialMatchRadius: MatchRadius;
  initialOfferUniques: boolean;
  initialAcceptUnbalanced: boolean;
};

export default function MatchmakingSection({
  initialParticipatesInMatchmaking,
  initialMatchRadius,
  initialOfferUniques,
  initialAcceptUnbalanced,
}: Props) {
  const t = useTranslations('Settings');
  const router = useRouter();

  const [participatesInMatchmaking, setParticipatesInMatchmaking] = useState(
    initialParticipatesInMatchmaking,
  );
  const [matchRadius, setMatchRadius] = useState<MatchRadius>(initialMatchRadius);
  const [offerUniques, setOfferUniques] = useState(initialOfferUniques);
  const [acceptUnbalanced, setAcceptUnbalanced] = useState(initialAcceptUnbalanced);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveState('saving');
    setError('');
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
      <h2 className="text-foreground mb-1 text-lg font-semibold">{t('matchmakingTitle')}</h2>
      <p className="text-muted-foreground mb-5 text-sm">{t('matchmakingSubtitle')}</p>

      <form onSubmit={handleSave} className="space-y-4">
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
