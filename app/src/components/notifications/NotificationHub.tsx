'use client';

import React, { useState, useMemo } from 'react';
import {
  Bell, BriefcaseBusiness, DollarSign, Award,
  ChevronDown, ChevronRight, Check, CheckCheck,
} from 'lucide-react';
import styles from './NotificationHub.module.css';
import type { Notification, NotificationType } from '@/types';

// =====================
// TYPES
// =====================

type NotificationGroup = 'job' | 'payment' | 'system';

interface GroupedNotifications {
  group: NotificationGroup;
  label: string;
  icon: typeof Bell;
  notifications: Notification[];
  unreadCount: number;
}

interface NotificationHubProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNotificationClick?: (notification: Notification) => void;
  className?: string;
}

// =====================
// GROUP MAPPING
// =====================

const TYPE_TO_GROUP: Record<NotificationType, NotificationGroup> = {
  job_new: 'job',
  application_received: 'job',
  application_accepted: 'job',
  application_rejected: 'job',
  milestone_reached: 'job',
  progress_update: 'job',
  comment_reply: 'job',
  deadline_warning: 'job',
  deadline_7days: 'job',
  deadline_3days: 'job',
  deadline_1day: 'job',
  deadline_overdue: 'job',
  job_recommended: 'job',
  job_invitation: 'job',
  payment_pending: 'payment',
  payment_completed: 'payment',
  contract_ready: 'payment',
  escrow_locked: 'payment',
  escrow_released: 'payment',
  badge_earned: 'system',
  contract_deadline_warning: 'system',
  contract_submitted: 'system',
};

const GROUP_CONFIG: Record<NotificationGroup, {
  label: string;
  icon: typeof Bell;
}> = {
  job: { label: 'Công việc', icon: BriefcaseBusiness },
  payment: { label: 'Thanh toán', icon: DollarSign },
  system: { label: 'Hệ thống', icon: Award },
};

// =====================
// COMPONENT
// =====================

export function NotificationHub({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onNotificationClick,
  className = '',
}: NotificationHubProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['job', 'payment', 'system'])
  );

  // Group notifications
  const grouped = useMemo(() => {
    const groups: Record<NotificationGroup, Notification[]> = {
      job: [],
      payment: [],
      system: [],
    };

    notifications.forEach(n => {
      const group = TYPE_TO_GROUP[n.type] || 'system';
      groups[group].push(n);
    });

    const result: GroupedNotifications[] = [];
    for (const [key, config] of Object.entries(GROUP_CONFIG)) {
      const groupKey = key as NotificationGroup;
      const items = groups[groupKey];
      if (items.length > 0) {
        result.push({
          group: groupKey,
          label: config.label,
          icon: config.icon,
          notifications: items,
          unreadCount: items.filter(n => !n.read).length,
        });
      }
    }

    return result;
  }, [notifications]);

  const totalUnread = notifications.filter(n => !n.read).length;

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Bell size={18} />
          <h3 className={styles.title}>Thông báo</h3>
          {totalUnread > 0 && (
            <span className={styles.unreadBadge}>{totalUnread}</span>
          )}
        </div>
        {totalUnread > 0 && (
          <button
            className={styles.markAllBtn}
            onClick={onMarkAllRead}
          >
            <CheckCheck size={14} />
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      <div className={styles.groups}>
        {grouped.map(group => {
          const isExpanded = expandedGroups.has(group.group);
          const GroupIcon = group.icon;

          return (
            <div key={group.group} className={styles.group}>
              <button
                className={styles.groupHeader}
                onClick={() => toggleGroup(group.group)}
              >
                <div className={styles.groupLeft}>
                  <GroupIcon size={16} />
                  <span className={styles.groupLabel}>{group.label}</span>
                  {group.unreadCount > 0 && (
                    <span className={styles.groupUnread}>{group.unreadCount} mới</span>
                  )}
                </div>
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {isExpanded && (
                <div className={styles.groupItems}>
                  {group.notifications.map(notif => (
                    <div
                      key={notif.id}
                      className={`${styles.notifItem} ${!notif.read ? styles.unread : ''}`}
                      onClick={() => {
                        if (!notif.read) onMarkRead(notif.id);
                        onNotificationClick?.(notif);
                      }}
                    >
                      <div className={styles.notifContent}>
                        <span className={styles.notifTitle}>{notif.title}</span>
                        <span className={styles.notifBody}>{notif.body}</span>
                        <span className={styles.notifTime}>
                          {formatTime(notif.createdAt)}
                        </span>
                      </div>
                      {!notif.read && (
                        <button
                          className={styles.readBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkRead(notif.id);
                          }}
                          title="Đánh dấu đã đọc"
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {notifications.length === 0 && (
          <div className={styles.empty}>
            <Bell size={24} />
            <span>Không có thông báo mới</span>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================
// HELPERS
// =====================

function formatTime(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins}p trước`;
  if (diffHours < 24) return `${diffHours}h trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}
