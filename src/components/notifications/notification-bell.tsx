'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { NotificationItem } from '@/lib/validations/notification.schema';
import { NotificationDropdown } from './notification-dropdown';

type Props = { initialUnreadCount: number };

export function NotificationBell({ initialUnreadCount }: Props) {
  const t = useTranslations('Notifications');
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=10&page=1');
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications: NotificationItem[];
        unreadCount: number;
      };
      setUnreadCount(data.unreadCount);
      setNotifications(data.notifications);
    } catch {
      // ignore network errors
    }
  };

  useEffect(() => {
    intervalRef.current = setInterval(() => void fetchNotifications(), 60_000);
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleToggle = () => {
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening) void fetchNotifications();
  };

  const handleMarkRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const bellLabel = unreadCount > 0 ? t('bellLabelUnread', { count: unreadCount }) : t('bellLabel');

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="hover:bg-muted relative rounded-lg p-2 transition-colors"
        aria-label={bellLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Bell className="text-foreground h-5 w-5" />
        {unreadCount > 0 && (
          <span className="bg-accent text-accent-foreground absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          onMarkRead={handleMarkRead}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
