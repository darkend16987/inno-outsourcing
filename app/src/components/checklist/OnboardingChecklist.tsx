'use client';

import React, { useMemo } from 'react';
import type { UserProfile } from '@/types';
import styles from './OnboardingChecklist.module.css';

interface OnboardingChecklistProps {
  profile: UserProfile;
  onNavigate?: (section: string) => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  section: string;
  completed: boolean;
}

export function OnboardingChecklist({ profile, onNavigate }: OnboardingChecklistProps) {
  const items: ChecklistItem[] = useMemo(() => [
    {
      id: 'displayName',
      label: 'Tên hiển thị',
      description: 'Cập nhật tên để nhà tuyển dụng dễ nhận diện',
      section: 'profile',
      completed: !!profile.displayName && profile.displayName.length > 2,
    },
    {
      id: 'phone',
      label: 'Số điện thoại',
      description: 'Liên hệ nhanh qua Zalo/điện thoại',
      section: 'profile',
      completed: !!profile.phone,
    },
    {
      id: 'bio',
      label: 'Giới thiệu bản thân',
      description: 'Viết vài dòng giới thiệu kinh nghiệm của bạn',
      section: 'profile',
      completed: !!profile.bio && profile.bio.length >= 20,
    },
    {
      id: 'specialties',
      label: 'Chuyên ngành',
      description: 'Chọn ít nhất 1 chuyên ngành bạn có thể nhận việc',
      section: 'profile',
      completed: profile.specialties?.length > 0,
    },
    {
      id: 'experience',
      label: 'Kinh nghiệm',
      description: 'Khai báo số năm kinh nghiệm',
      section: 'profile',
      completed: profile.experience > 0,
    },
    {
      id: 'software',
      label: 'Phần mềm sử dụng',
      description: 'Liệt kê các phần mềm bạn thành thạo',
      section: 'profile',
      completed: profile.software?.length > 0,
    },
    {
      id: 'kyc',
      label: 'Xác minh danh tính (KYC)',
      description: 'CMND/CCCD, tài khoản ngân hàng để nhận thanh toán',
      section: 'kyc',
      completed: profile.kycCompleted,
    },
  ], [profile]);

  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;
  const progress = Math.round((completedCount / totalCount) * 100);

  // Don't show if all completed
  if (completedCount === totalCount) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h4 className={styles.title}>Hoàn thiện hồ sơ</h4>
          <p className={styles.subtitle}>
            Hoàn thành để tăng cơ hội nhận việc
          </p>
        </div>
        <div className={styles.progressCircle}>
          <svg viewBox="0 0 36 36" className={styles.progressSvg}>
            <path
              className={styles.progressBg}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={styles.progressFill}
              strokeDasharray={`${progress}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className={styles.progressText}>{progress}%</span>
        </div>
      </div>

      <div className={styles.progressBar}>
        <div className={styles.progressFillBar} style={{ width: `${progress}%` }} />
      </div>
      <p className={styles.progressLabel}>{completedCount}/{totalCount} bước hoàn thành</p>

      <div className={styles.list}>
        {items.map(item => (
          <div
            key={item.id}
            className={`${styles.item} ${item.completed ? styles.completed : ''}`}
            onClick={() => !item.completed && onNavigate?.(item.section)}
            role="button"
            tabIndex={0}
          >
            <div className={styles.checkbox}>
              {item.completed ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
              ) : (
                <div className={styles.emptyCheck} />
              )}
            </div>
            <div className={styles.itemContent}>
              <span className={styles.itemLabel}>{item.label}</span>
              {!item.completed && (
                <span className={styles.itemDesc}>{item.description}</span>
              )}
            </div>
            {!item.completed && (
              <span className={styles.arrow}>→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
