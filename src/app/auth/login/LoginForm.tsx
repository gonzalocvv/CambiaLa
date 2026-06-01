'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export function LoginForm() {
  const t = useTranslations('Auth.login');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@')) {
      setErrorMsg(t('errorInvalidEmail'));
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        shouldCreateUser: true,
      },
    });

    if (error) {
      setErrorMsg(t('errorGeneric'));
      setStatus('error');
      return;
    }

    setStatus('success');
  }

  if (status === 'success') {
    return (
      <div className="space-y-3 text-center">
        <p className="text-2xl">📬</p>
        <p className="text-foreground text-lg font-semibold">{t('successTitle')}</p>
        <p className="text-muted-foreground text-sm">{t('successMessage', { email })}</p>
        <p className="text-muted-foreground text-xs">{t('successHint')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
  );
}
