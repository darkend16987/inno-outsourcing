'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { NotificationHub } from '@/components/notifications/NotificationHub';
import { useAuth } from '@/lib/firebase/auth-context';
import { subscribeToNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/firebase/firestore';
import type { Notification as AppNotification } from '@/types';
import styles from './CMSNotificationBell.module.css';

/**
 * ============================================
 * CMS Notification Bell — Topbar Component
 * ============================================
 *
 * Reusable notification bell for all CMS role layouts.
 * Subscribes to real-time notifications via Firestore.
 */
export function CMSNotificationBell() {
  const { userProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Subscribe to notifications
  useEffect(() => {
    if (!userProfile?.uid) return;
    const unsub = subscribeToNotifications(userProfile.uid, (items) => {
      setNotifications(items.slice(0, 30));
    });
    return unsub;
  }, [userProfile?.uid]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = (id: string) => {
    markNotificationRead(id).catch(() => {});
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllRead = () => {
    if (!userProfile?.uid) return;
    markAllNotificationsRead(userProfile.uid).catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  if (!userProfile) return null;

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        className={styles.bellBtn}
        onClick={() => setOpen(!open)}
        aria-label="Thông báo"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <NotificationHub
            notifications={notifications}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
          />
        </div>
      )}
    </div>
  );
}
