'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { X, CheckCircle, AlertCircle, FileText, ArrowRight } from 'lucide-react';
import styles from './ProfileCompletionBanner.module.css';

interface Props {
  completionPercent: number;
  missingFields: string[];
}

/**
 * Shown to freelancers whose profile is incomplete.
 * Encourages them to fill in info so contract signing is faster.
 * Dismissible per session (localStorage).
 */
export function ProfileCompletionBanner({ completionPercent, missingFields }: Props) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('profile_banner_dismissed') === '1';
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem('profile_banner_dismissed', '1'); } catch {}
  };

  if (dismissed || completionPercent >= 80) return null;

  const isLow = completionPercent < 40;

  return (
    <div className={`${styles.banner} ${isLow ? styles.bannerUrgent : styles.bannerInfo}`}>
      <div className={styles.iconWrap}>
        {isLow
          ? <AlertCircle size={22} className={styles.iconUrgent} />
          : <FileText size={22} className={styles.iconInfo} />
        }
      </div>
      <div className={styles.content}>
        <strong className={styles.title}>
          {isLow
            ? 'Hồ sơ chưa đầy đủ — hãy hoàn thiện ngay!'
            : 'Gần xong rồi! Hãy hoàn thiện hồ sơ của bạn.'
          }
        </strong>
        <p className={styles.body}>
          Hồ sơ đầy đủ giúp bạn được nhận job nhanh hơn và quá trình ký hợp đồng sẽ tự động điền sẵn thông tin — không cần nhập lại.
        </p>
        {missingFields.length > 0 && (
          <div className={styles.missingList}>
            <span className={styles.missingLabel}>Còn thiếu:</span>
            {missingFields.slice(0, 4).map(f => (
              <span key={f} className={styles.missingTag}>
                <CheckCircle size={10} /> {f}
              </span>
            ))}
            {missingFields.length > 4 && (
              <span className={styles.missingTag}>+{missingFields.length - 4} mục khác</span>
            )}
          </div>
        )}
        <div className={styles.progress}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${completionPercent}%` }} />
          </div>
          <span className={styles.progressText}>{completionPercent}% hoàn thiện</span>
        </div>
      </div>
      <Link href="/freelancer/profile/edit" className={styles.ctaBtn}>
        Cập nhật ngay <ArrowRight size={14} />
      </Link>
      <button className={styles.closeBtn} onClick={handleDismiss} title="Đóng">
        <X size={16} />
      </button>
    </div>
  );
}
