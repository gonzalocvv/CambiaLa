import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { ActivityForm } from '@/components/admin/activity-form';
import { AppNavbar } from '@/components/layout/app-navbar';
import { activityService } from '@/services/activity.service';

export default async function EditActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations('Admin.activities');
  const { id } = await params;
  const activity = await activityService.getActivityDetail(id);
  if (!activity) notFound();

  return (
    <>
      <AppNavbar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link
          href="/admin/activities"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          {t('backToList')}
        </Link>
        <h1 className="text-foreground mt-2 mb-6 text-2xl font-bold">{t('formTitleEdit')}</h1>
        <ActivityForm mode="edit" activityId={id} initial={activity} />
      </main>
    </>
  );
}
