'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { URUGUAY_DEPARTMENTS } from '@/lib/locations';
import type { ActivityItem } from '@/lib/validations/activity.schema';

type Props = {
  mode: 'create' | 'edit';
  activityId?: string;
  initial?: ActivityItem;
};

// ISO → valor de <input type="datetime-local"> (hora local, sin zona).
function toLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const inputClass =
  'border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none';

export function ActivityForm({ mode, activityId, initial }: Props) {
  const t = useTranslations('Admin.activities');
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const form = new FormData(e.currentTarget);
      const url =
        mode === 'create' ? '/api/admin/activities' : `/api/admin/activities/${activityId}`;
      const res = await fetch(url, { method: mode === 'create' ? 'POST' : 'PATCH', body: form });
      if (res.ok) {
        router.push('/admin/activities');
        router.refresh();
        return;
      }
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(
        body?.error === 'banner_too_large' || body?.error === 'banner_invalid_type'
          ? t('errorBanner')
          : t('errorGeneric'),
      );
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!activityId || !window.confirm(t('deleteConfirm'))) return;
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/activities/${activityId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/admin/activities');
        router.refresh();
        return;
      }
      setError(t('errorGeneric'));
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="text-foreground mb-1 block text-sm font-medium">{t('fieldTitle')}</span>
        <input name="title" required defaultValue={initial?.title ?? ''} className={inputClass} />
      </label>

      <label className="block">
        <span className="text-foreground mb-1 block text-sm font-medium">
          {t('fieldDepartment')}
        </span>
        <select
          name="department"
          required
          defaultValue={initial?.department ?? ''}
          className={inputClass}
        >
          <option value="" disabled>
            {t('departmentPlaceholder')}
          </option>
          {URUGUAY_DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-foreground mb-1 block text-sm font-medium">
            {t('fieldStartsAt')}
          </span>
          <input
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={toLocalInput(initial?.startsAt)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-foreground mb-1 block text-sm font-medium">{t('fieldEndsAt')}</span>
          <input
            name="endsAt"
            type="datetime-local"
            defaultValue={toLocalInput(initial?.endsAt)}
            className={inputClass}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-foreground mb-1 block text-sm font-medium">{t('fieldLocation')}</span>
        <input name="location" defaultValue={initial?.location ?? ''} className={inputClass} />
      </label>

      <label className="block">
        <span className="text-foreground mb-1 block text-sm font-medium">
          {t('fieldDescription')}
        </span>
        <textarea
          name="description"
          rows={4}
          defaultValue={initial?.description ?? ''}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="text-foreground mb-1 block text-sm font-medium">{t('fieldBanner')}</span>
        <input
          name="banner"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="text-foreground text-sm"
        />
        <span className="text-muted-foreground mt-1 block text-xs">{t('bannerHint')}</span>
      </label>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? t('saving') : t('save')}
        </button>
        <Link
          href="/admin/activities"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          {t('cancel')}
        </Link>
        {mode === 'edit' && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-destructive ml-auto text-sm hover:underline disabled:opacity-60"
          >
            {deleting ? t('deleting') : t('delete')}
          </button>
        )}
      </div>
    </form>
  );
}
