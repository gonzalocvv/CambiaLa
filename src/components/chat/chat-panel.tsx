'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { MessageItem } from '@/lib/validations/message.schema';

const POLL_INTERVAL_MS = 10_000;
const MAX_BODY_LENGTH = 1000;

interface Props {
  matchId: string;
  currentUserId: string;
  initialMessages: MessageItem[];
}

export function ChatPanel({ matchId, currentUserId, initialMessages }: Props) {
  const t = useTranslations('Chat');
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // RF-505: poll every 10s for new messages
  useEffect(() => {
    async function fetchMessages() {
      try {
        const res = await fetch(`/api/matches/${matchId}/messages`);
        if (!res.ok) return;
        const data = (await res.json()) as { messages: MessageItem[] };
        setMessages(data.messages);
      } catch {
        // silently ignore poll errors
      }
    }

    pollRef.current = setInterval(fetchMessages, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [matchId]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch(`/api/matches/${matchId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed }),
      });

      if (!res.ok) {
        setError(t('sendError'));
        return;
      }

      const data = (await res.json()) as { message: MessageItem };
      setMessages((prev) => [...prev, data.message]);
      setInput('');
    } catch {
      setError(t('sendError'));
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  const remaining = MAX_BODY_LENGTH - input.length;

  return (
    <div className="border-border bg-card flex h-[420px] flex-col rounded-lg border">
      {/* Message list */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">{t('empty')}</p>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.fromUserId === currentUserId;
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    isOwn
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  }`}
                >
                  <p className="break-words whitespace-pre-wrap">{msg.body}</p>
                  <p
                    className={`mt-0.5 text-right text-[10px] ${
                      isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString('es-UY', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-border border-t p-3">
        {error && <p className="text-destructive mb-2 text-xs">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('placeholder')}
            maxLength={MAX_BODY_LENGTH}
            rows={1}
            disabled={sending}
            className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none disabled:opacity-60"
            style={{ minHeight: '2.5rem', maxHeight: '7rem' }}
            aria-label={t('placeholder')}
          />
          <div className="flex flex-col items-end gap-1">
            <span
              className={`text-[10px] ${remaining < 50 ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              {remaining}
            </span>
            <button
              onClick={() => void handleSend()}
              disabled={sending || !input.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-ring rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:ring-2 focus:outline-none disabled:opacity-50"
              aria-label={t('send')}
            >
              {sending ? t('sending') : t('send')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
