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
          <p className="text-muted-foreground">{t('empty')}</p>
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
