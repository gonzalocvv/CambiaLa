'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

type Step = 'email' | 'code';
type Status = 'idle' | 'loading' | 'error';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.4 14.97.4 12 .4A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75z"
      />
    </svg>
  );
}

export function LoginForm() {
  const t = useTranslations('Auth.login');
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function signInWithGoogle() {
    setStatus('loading');
    setErrorMsg('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/api/auth/callback` },
      });
      if (error) {
        setErrorMsg(t('googleError'));
        setStatus('error');
      }
      // En éxito, signInWithOAuth redirige al consentimiento de Google.
    } catch {
      setErrorMsg(t('googleError'));
      setStatus('error');
    }
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@')) {
      setErrorMsg(t('errorInvalidEmail'));
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMsg('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          // El link sigue funcionando como respaldo; el método principal es el código.
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
          shouldCreateUser: true,
        },
      });

      if (error) {
        setErrorMsg(error.status === 429 ? t('errorRateLimited') : t('errorGeneric'));
        setStatus('error');
        return;
      }

      setEmail(trimmed);
      setCode('');
      setStep('code');
      setStatus('idle');
    } catch {
      setErrorMsg(t('errorGeneric'));
      setStatus('error');
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = code.replace(/\s/g, '');
    if (cleanCode.length < 6) {
      setErrorMsg(t('errorInvalidCode'));
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: cleanCode }),
      });

      if (!res.ok) {
        setErrorMsg(res.status === 429 ? t('errorRateLimited') : t('errorInvalidCode'));
        setStatus('error');
        return;
      }

      const { destination } = (await res.json()) as { destination: string };
      window.location.assign(destination || '/matches');
    } catch {
      setErrorMsg(t('errorGeneric'));
      setStatus('error');
    }
  }

  // ----- Paso 2: ingresar el código -----
  if (step === 'code') {
    return (
      <form onSubmit={verifyCode} className="space-y-4">
        <div className="space-y-2 text-center">
          <p className="text-2xl">📬</p>
          <p className="text-foreground text-lg font-semibold">{t('codeTitle')}</p>
          <p className="text-muted-foreground text-sm">{t('codeMessage', { email })}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="code">{t('codeLabel')}</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder={t('codePlaceholder')}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6));
              if (status === 'error') setStatus('idle');
            }}
            disabled={status === 'loading'}
            maxLength={6}
            required
            autoFocus
            className="text-center text-2xl tracking-[0.5em]"
          />
        </div>

        {status === 'error' && <p className="text-destructive text-sm">{errorMsg}</p>}

        <Button type="submit" disabled={status === 'loading'} className="w-full">
          {status === 'loading' ? t('codeVerifying') : t('codeSubmit')}
        </Button>

        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              setStep('email');
              setStatus('idle');
              setErrorMsg('');
            }}
            className="text-muted-foreground hover:text-foreground underline transition-colors"
          >
            {t('backToEmail')}
          </button>
          <button
            type="button"
            onClick={() => sendCode()}
            disabled={status === 'loading'}
            className="text-muted-foreground hover:text-foreground underline transition-colors disabled:opacity-50"
          >
            {t('codeResend')}
          </button>
        </div>

        <p className="text-muted-foreground text-center text-xs">{t('codeHint')}</p>
      </form>
    );
  }

  // ----- Paso 1: Google + email -----
  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        onClick={signInWithGoogle}
        disabled={status === 'loading'}
        className="w-full gap-2"
      >
        <GoogleIcon />
        {t('googleButton')}
      </Button>

      <div className="flex items-center gap-3">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs">{t('dividerOr')}</span>
        <span className="bg-border h-px flex-1" />
      </div>

      <form onSubmit={sendCode} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t('emailLabel')}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t('emailPlaceholder')}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === 'error') setStatus('idle');
            }}
            disabled={status === 'loading'}
            required
            className="text-base"
          />
        </div>

        {status === 'error' && <p className="text-destructive text-sm">{errorMsg}</p>}

        <Button type="submit" disabled={status === 'loading'} className="w-full">
          {status === 'loading' ? t('submitting') : t('submitButton')}
        </Button>
      </form>
    </div>
  );
}
