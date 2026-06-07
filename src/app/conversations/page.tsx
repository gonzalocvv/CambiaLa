import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { AppNavbar } from '@/components/layout/app-navbar';
import ConversationCard from '@/components/chat/conversation-card';
import { getSession } from '@/lib/auth';
import { messageService } from '@/services/message.service';

export default async function ConversationsPage() {
  const t = await getTranslations('Conversations');
  const session = await getSession();

  if (!session) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-muted-foreground">{t('notAuthenticated')}</p>
      </main>
    );
  }

  if (!session.onboardingDoneAt) redirect('/onboarding');

  const conversations = await messageService.getConversationsForUser(session.userId);

  return (
    <>
      <AppNavbar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-foreground mb-6 text-2xl font-bold">{t('title')}</h1>

        {conversations.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl" aria-hidden="true">
              💬
            </div>
            <h2 className="text-foreground mt-4 mb-2 text-lg font-semibold">{t('emptyTitle')}</h2>
            <p className="text-muted-foreground mx-auto mb-6 max-w-xs text-sm">
              {t('emptyDescription')}
            </p>
            <Link
              href="/matches"
              className="bg-primary text-primary-foreground inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
            >
              {t('emptyCta')}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => (
              <ConversationCard key={conv.matchId} conversation={conv} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
