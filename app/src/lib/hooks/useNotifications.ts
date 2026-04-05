'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Notification } from '@/types';
import {
  subscribeToNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/firebase/firestore';

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset state when no userId
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeToNotifications(userId, (items) => {
      setNotifications(items);
      setUnreadCount(items.filter(n => !n.read).length);
      setLoading(false);
    });

    return unsub;
  }, [userId]);

  const markRead = useCallback(async (notifId: string) => {
    await markNotificationRead(notifId);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await markAllNotificationsRead(userId);
  }, [userId]);

  return { notifications, unreadCount, loading, markRead, markAllRead };
}
