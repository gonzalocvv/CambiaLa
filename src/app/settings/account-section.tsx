'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function AccountSection() {
  const t = useTranslations('Settings');
  const router = useRouter();
  const [isPendingLogout, startLogoutTransition] = useTransition();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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

  return (
    <>
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
    </>
  );
}
