'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { URUGUAY_DEPARTMENTS, MONTEVIDEO_NEIGHBORHOODS } from '@/lib/locations';

type Step = 1 | 2;

function getSyncError(u: string): 'too_short' | 'invalid_chars' | null {
  if (u.length > 0 && u.length < 3) return 'too_short';
  if (u.length >= 3 && (!/^[a-zA-Z0-9_]+$/.test(u) || u.length > 20)) return 'invalid_chars';
  return null;
}

export default function OnboardingForm() {
  const t = useTranslations('Onboarding');
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [username, setUsername] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Track the last username that was actually checked and its result
  const [lastChecked, setLastChecked] = useState({
    username: '',
    result: null as 'available' | 'taken' | null,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncError = getSyncError(username);
  const validUsername = username.length >= 3 && syncError === null;
  const checkIsCurrent = lastChecked.username === username && lastChecked.result !== null;

  // Derived display state — no setState calls anywhere in the effect body
  type DisplayState = 'idle' | 'invalid' | 'checking' | 'available' | 'taken';
  const displayState: DisplayState = (() => {
    if (username.length === 0) return 'idle';
    if (syncError === 'too_short') return 'idle';
    if (syncError === 'invalid_chars') return 'invalid';
    if (checkIsCurrent) return lastChecked.result as 'available' | 'taken';
    return 'checking';
  })();

  useEffect(() => {
    if (!validUsername) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    const captured = username;
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/onboarding/check-username?username=${encodeURIComponent(captured)}`,
        );
        if (res.ok) {
          const data = (await res.json()) as { available: boolean };
          setLastChecked({ username: captured, result: data.available ? 'available' : 'taken' });
        }
      } catch {
        // network error — leave displayState as 'checking' so user can retry
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username, validUsername]);

  const canProceedStep1 = displayState === 'available';
  const canSubmit = city !== '' && (city !== 'Montevideo' || neighborhood !== '');

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const body = {
        username,
        city,
        ...(city === 'Montevideo' ? { neighborhood } : {}),
      };
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status === 409) {
        setStep(1);
        setLastChecked({ username, result: 'taken' });
        setSubmitting(false);
        return;
      }
      if (!res.ok) {
        setError(t('errorGeneric'));
        setSubmitting(false);
        return;
      }
      router.push('/matches');
    } catch {
      setError(t('errorGeneric'));
      setSubmitting(false);
    }
  }

  function renderUsernameHint() {
    if (displayState === 'idle') return null;
    if (displayState === 'invalid')
      return <span className="text-destructive">{t('usernameInvalid')}</span>;
    if (displayState === 'checking')
      return <span className="text-muted-foreground">{t('usernameChecking')}</span>;
    if (displayState === 'available')
      return <span className="text-primary">{t('usernameAvailable')}</span>;
    if (displayState === 'taken')
      return <span className="text-destructive">{t('usernameTaken')}</span>;
    return null;
  }

  return (
    <div className="w-full space-y-6">
      <p className="text-muted-foreground text-center text-xs">
        {t('stepOf', { current: step, total: 2 })}
      </p>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-foreground text-lg font-semibold">{t('step1Title')}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{t('step1Subtitle')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">{t('usernameLabel')}</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder={t('usernamePlaceholder')}
              maxLength={20}
              autoComplete="off"
              autoFocus
            />
            <p className="min-h-[1rem] text-xs">{renderUsernameHint()}</p>
          </div>

          <Button className="w-full" onClick={() => setStep(2)} disabled={!canProceedStep1}>
            {t('nextButton')}
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-foreground text-lg font-semibold">{t('step2Title')}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{t('step2Subtitle')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">{t('cityLabel')}</Label>
            <select
              id="city"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setNeighborhood('');
              }}
              className="border-input bg-background text-foreground focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            >
              <option value="">{t('cityPlaceholder')}</option>
              {URUGUAY_DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {city === 'Montevideo' && (
            <div className="space-y-2">
              <Label htmlFor="neighborhood">{t('neighborhoodLabel')}</Label>
              <select
                id="neighborhood"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="border-input bg-background text-foreground focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
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

          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="space-y-2">
            <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit || submitting}>
              {submitting ? t('submitting') : t('submitButton')}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setStep(1)}
              disabled={submitting}
            >
              {t('backButton')}
            </Button>
          </div>
        </div>
      )}

      <div className="text-center">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground text-xs underline transition-colors"
        >
          {t('skipButton')}
        </Link>
      </div>
    </div>
  );
}
