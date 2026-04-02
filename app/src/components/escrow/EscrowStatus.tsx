'use client';

import React from 'react';
import { Lock, CheckCircle, Clock, DollarSign } from 'lucide-react';
import styles from './EscrowStatus.module.css';
import type { PaymentMilestone } from '@/types';
import { calculateEscrowSummary } from '@/lib/services/milestone-progress';

interface EscrowStatusProps {
  milestones: PaymentMilestone[];
  totalFee: number;
  className?: string;
  compact?: boolean;
}

export function EscrowStatus({
  milestones,
  totalFee,
  className = '',
  compact = false,
}: EscrowStatusProps) {
  const summary = calculateEscrowSummary(milestones, totalFee);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
  };

  if (compact) {
    return (
      <div className={`${styles.compact} ${className}`}>
        <div className={styles.progressBar}>
          <div
            className={styles.releasedBar}
            style={{ width: `${summary.releasedPercentage}%` }}
            title={`Đã giải phóng: ${formatCurrency(summary.releasedAmount)}`}
          />
          <div
            className={styles.lockedBar}
            style={{ width: `${summary.lockedPercentage}%` }}
            title={`Đã khóa: ${formatCurrency(summary.lockedAmount)}`}
          />
        </div>
        <span className={styles.compactLabel}>
          {summary.releasedPercentage}% giải phóng
        </span>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.header}>
        <DollarSign size={18} className={styles.headerIcon} />
        <span className={styles.headerTitle}>Bảo vệ thanh toán</span>
        <span className={`${styles.statusPill} ${styles[summary.status]}`}>
          {getStatusLabel(summary.status)}
        </span>
      </div>

      <div className={styles.totalRow}>
        <span>Tổng giá trị</span>
        <strong>{formatCurrency(summary.totalValue)}</strong>
      </div>

      <div className={styles.progressBar}>
        <div
          className={styles.releasedBar}
          style={{ width: `${summary.releasedPercentage}%` }}
        />
        <div
          className={styles.lockedBar}
          style={{ width: `${summary.lockedPercentage}%` }}
        />
      </div>

      <div className={styles.breakdown}>
        <div className={styles.item}>
          <div className={`${styles.dot} ${styles.dotReleased}`} />
          <div className={styles.itemInfo}>
            <span className={styles.itemLabel}>
              <CheckCircle size={14} /> Đã giải phóng
            </span>
            <span className={styles.itemValue}>{formatCurrency(summary.releasedAmount)}</span>
          </div>
          <span className={styles.itemPct}>{summary.releasedPercentage}%</span>
        </div>

        <div className={styles.item}>
          <div className={`${styles.dot} ${styles.dotLocked}`} />
          <div className={styles.itemInfo}>
            <span className={styles.itemLabel}>
              <Lock size={14} /> Đã khóa
            </span>
            <span className={styles.itemValue}>{formatCurrency(summary.lockedAmount)}</span>
          </div>
          <span className={styles.itemPct}>{summary.lockedPercentage}%</span>
        </div>

        <div className={styles.item}>
          <div className={`${styles.dot} ${styles.dotPending}`} />
          <div className={styles.itemInfo}>
            <span className={styles.itemLabel}>
              <Clock size={14} /> Chờ xử lý
            </span>
            <span className={styles.itemValue}>{formatCurrency(summary.pendingAmount)}</span>
          </div>
          <span className={styles.itemPct}>{summary.pendingPercentage}%</span>
        </div>
      </div>

      {summary.lockedAmount > 0 && (
        <div className={styles.securityNote}>
          <Lock size={12} />
          <span>Số tiền đã được khóa sẽ giải phóng khi milestone được duyệt</span>
        </div>
      )}
    </div>
  );
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'fully_released': return '✅ Hoàn tất';
    case 'partially_released': return '🔄 Đang giải phóng';
    case 'locked': return '🔒 Đã khóa';
    default: return '⏳ Chưa bắt đầu';
  }
}
