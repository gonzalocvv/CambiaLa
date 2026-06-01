import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { ConversationItem } from '@/lib/validations/message.schema';

type Props = { conversation: ConversationItem };

export default async function ConversationCard({ conversation }: Props) {
  const t = await getTranslations('Conversations');
  const { partner, lastMessage, unreadCount, status, matchId } = conversation;

  const displayName = partner.username ?? partner.name ?? t('unknownUser');
  const initials = displayName.slice(0, 2).toUpperCase();
  const preview = lastMessage.isMine ? `${t('youPrefix')} ${lastMessage.body}` : lastMessage.body;
  const clampedPreview = preview.length > 60 ? `${preview.slice(0, 60)}…` : preview;

  return (
    <Link href={`/matches/${matchId}`} className="block">
      <Card className="transition-all hover:shadow-md active:scale-[0.99]">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="relative shrink-0">
            {partner.avatarUrl ? (
              <div
                className="bg-muted h-12 w-12 rounded-full bg-cover bg-center"
                style={{ backgroundImage: `url(${partner.avatarUrl})` }}
                role="img"
                aria-label={displayName}
              />
            ) : (
              <div className="bg-primary text-primary-foreground flex h-12 w-12 items-center justify-center rounded-full font-bold">
                {initials}
              </div>
            )}
            {unreadCount > 0 && (
              <span
                className="bg-accent text-accent-foreground absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums"
                aria-label={t('unreadMessages', { count: unreadCount })}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p
                className={`text-foreground truncate font-semibold ${unreadCount > 0 ? 'font-bold' : ''}`}
              >
                {displayName}
              </p>
              <div className="flex shrink-0 items-center gap-1">
                {status === 'completed' && (
                  <Badge variant="secondary" className="text-xs">
                    {t('statusCompleted')}
                  </Badge>
                )}
                {status === 'inactive' && (
                  <Badge variant="outline" className="text-xs">
                    {t('statusInactive')}
                  </Badge>
                )}
              </div>
            </div>
            <p
              className={`mt-0.5 truncate text-sm ${unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
            >
              {clampedPreview}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
