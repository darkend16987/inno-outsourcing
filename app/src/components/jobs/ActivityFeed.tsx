'use client';

import React, { useState } from 'react';
import {
  FileText, MessageSquare, Upload, CheckCircle,
  UserCheck, Send, Rocket, Clock, Filter,
  DollarSign, Shield, ChevronDown, ChevronUp,
} from 'lucide-react';
import styles from './ActivityFeed.module.css';

// =====================
// TYPES
// =====================

export type ActivityType =
  | 'job_posted'
  | 'application_received'
  | 'freelancer_selected'
  | 'contract_signed'
  | 'milestone_submitted'
  | 'milestone_approved'
  | 'milestone_paid'
  | 'deliverable_uploaded'
  | 'comment_added'
  | 'progress_updated'
  | 'status_changed'
  | 'escrow_locked'
  | 'escrow_released';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  actor?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  maxVisible?: number;
  className?: string;
}

// =====================
// CONFIG
// =====================

const ACTIVITY_CONFIG: Record<ActivityType, {
  icon: typeof FileText;
  color: string;
  bgColor: string;
}> = {
  job_posted: { icon: Rocket, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
  application_received: { icon: Send, color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.1)' },
  freelancer_selected: { icon: UserCheck, color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)' },
  contract_signed: { icon: FileText, color: '#0d7c66', bgColor: 'rgba(13, 124, 102, 0.1)' },
  milestone_submitted: { icon: Upload, color: '#6366f1', bgColor: 'rgba(99, 102, 241, 0.1)' },
  milestone_approved: { icon: CheckCircle, color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)' },
  milestone_paid: { icon: DollarSign, color: '#059669', bgColor: 'rgba(5, 150, 105, 0.1)' },
  deliverable_uploaded: { icon: Upload, color: '#0ea5e9', bgColor: 'rgba(14, 165, 233, 0.1)' },
  comment_added: { icon: MessageSquare, color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
  progress_updated: { icon: Clock, color: '#6366f1', bgColor: 'rgba(99, 102, 241, 0.1)' },
  status_changed: { icon: Shield, color: '#64748b', bgColor: 'rgba(100, 116, 139, 0.1)' },
  escrow_locked: { icon: Shield, color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
  escrow_released: { icon: CheckCircle, color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)' },
};

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'payment', label: 'Thanh toán' },
  { value: 'communication', label: 'Giao tiếp' },
  { value: 'status', label: 'Trạng thái' },
];

// =====================
// COMPONENT
// =====================

export function ActivityFeed({
  activities,
  maxVisible = 10,
  className = '',
}: ActivityFeedProps) {
  const [filter, setFilter] = useState('all');
  const [showAll, setShowAll] = useState(false);

  const filtered = activities.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'milestone') return ['milestone_submitted', 'milestone_approved', 'milestone_paid'].includes(a.type);
    if (filter === 'payment') return ['milestone_paid', 'escrow_locked', 'escrow_released'].includes(a.type);
    if (filter === 'communication') return ['comment_added', 'deliverable_uploaded'].includes(a.type);
    if (filter === 'status') return ['status_changed', 'freelancer_selected', 'contract_signed', 'job_posted'].includes(a.type);
    return true;
  });

  const visible = showAll ? filtered : filtered.slice(0, maxVisible);
  const hasMore = filtered.length > maxVisible;

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>Lịch sử hoạt động</h3>
        <div className={styles.filters}>
          <Filter size={14} />
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`${styles.filterBtn} ${filter === opt.value ? styles.filterActive : ''}`}
              onClick={() => setFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.timeline}>
        {visible.map((activity, idx) => {
          const config = ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.status_changed;
          const IconComp = config.icon;
          const isLast = idx === visible.length - 1;

          return (
            <div key={activity.id} className={styles.entry}>
              <div className={styles.timelineCol}>
                <div
                  className={styles.iconCircle}
                  style={{ background: config.bgColor, color: config.color }}
                >
                  <IconComp size={14} />
                </div>
                {!isLast && <div className={styles.connector} />}
              </div>

              <div className={styles.content}>
                <div className={styles.entryHeader}>
                  <span className={styles.entryTitle}>{activity.title}</span>
                  <span className={styles.entryTime}>
                    {formatRelativeTime(activity.timestamp)}
                  </span>
                </div>
                {activity.description && (
                  <p className={styles.entryDesc}>{activity.description}</p>
                )}
                {activity.actor && (
                  <span className={styles.entryActor}>bởi {activity.actor}</span>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className={styles.empty}>Chưa có hoạt động nào.</div>
        )}
      </div>

      {hasMore && (
        <button
          className={styles.showMoreBtn}
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? (
            <><ChevronUp size={14} /> Thu gọn</>
          ) : (
            <><ChevronDown size={14} /> Xem thêm {filtered.length - maxVisible} hoạt động</>
          )}
        </button>
      )}
    </div>
  );
}

// =====================
// HELPERS
// =====================

function formatRelativeTime(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

/**
 * Build activity items from various job events
 * Utility for composing the feed from different data sources
 */
export function buildActivityFromJobEvent(
  type: ActivityType,
  title: string,
  timestamp: Date,
  opts?: { description?: string; actor?: string; metadata?: Record<string, unknown> },
): ActivityItem {
  return {
    id: `${type}_${timestamp.getTime()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    title,
    description: opts?.description,
    actor: opts?.actor,
    timestamp,
    metadata: opts?.metadata,
  };
}
