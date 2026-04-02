'use client';

import React, { useState } from 'react';
import { Star, Send, User } from 'lucide-react';
import styles from './MutualReview.module.css';

interface ReviewFormData {
  rating: number;
  communication: number;
  quality: number;
  timeliness: number;
  comment: string;
}

interface MutualReviewFormProps {
  jobTitle: string;
  targetUserName: string;
  targetUserAvatar?: string;
  reviewerRole: 'freelancer' | 'jobmaster';
  onSubmit: (data: ReviewFormData) => Promise<void>;
  className?: string;
}

const CRITERIA_LABELS = {
  freelancer: {
    communication: 'Giao tiếp',
    quality: 'Chất lượng công việc',
    timeliness: 'Đúng hạn',
  },
  jobmaster: {
    communication: 'Giao tiếp',
    quality: 'Mô tả rõ ràng',
    timeliness: 'Thanh toán đúng hạn',
  },
};

export function MutualReviewForm({
  jobTitle,
  targetUserName,
  targetUserAvatar,
  reviewerRole,
  onSubmit,
  className = '',
}: MutualReviewFormProps) {
  const [form, setForm] = useState<ReviewFormData>({
    rating: 0,
    communication: 0,
    quality: 0,
    timeliness: 0,
    comment: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const labels = CRITERIA_LABELS[reviewerRole === 'freelancer' ? 'jobmaster' : 'freelancer'];

  const handleSubmit = async () => {
    if (form.rating === 0) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={`${styles.container} ${styles.success} ${className}`}>
        <div className={styles.successIcon}>✅</div>
        <h4>Cảm ơn bạn đã đánh giá!</h4>
        <p>Đánh giá của bạn giúp cộng đồng VAA JOB tốt hơn.</p>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>Đánh giá sau dự án</h3>
        <span className={styles.subtitle}>Job: {jobTitle}</span>
      </div>

      <div className={styles.target}>
        <div className={styles.avatar}>
          {targetUserAvatar ? (
            <img src={targetUserAvatar} alt={targetUserName} />
          ) : (
            <User size={20} />
          )}
        </div>
        <div>
          <span className={styles.targetName}>{targetUserName}</span>
          <span className={styles.targetRole}>
            {reviewerRole === 'freelancer' ? 'Jobmaster' : 'Freelancer'}
          </span>
        </div>
      </div>

      {/* Overall rating */}
      <div className={styles.section}>
        <label className={styles.label}>Đánh giá tổng thể</label>
        <StarRating
          value={form.rating}
          onChange={(v) => setForm(prev => ({ ...prev, rating: v }))}
          size="lg"
        />
      </div>

      {/* Criteria ratings */}
      <div className={styles.criteria}>
        <div className={styles.criteriaRow}>
          <span>{labels.communication}</span>
          <StarRating
            value={form.communication}
            onChange={(v) => setForm(prev => ({ ...prev, communication: v }))}
          />
        </div>
        <div className={styles.criteriaRow}>
          <span>{labels.quality}</span>
          <StarRating
            value={form.quality}
            onChange={(v) => setForm(prev => ({ ...prev, quality: v }))}
          />
        </div>
        <div className={styles.criteriaRow}>
          <span>{labels.timeliness}</span>
          <StarRating
            value={form.timeliness}
            onChange={(v) => setForm(prev => ({ ...prev, timeliness: v }))}
          />
        </div>
      </div>

      {/* Comment */}
      <div className={styles.section}>
        <label className={styles.label}>Nhận xét (tùy chọn)</label>
        <textarea
          className={styles.textarea}
          placeholder="Chia sẻ trải nghiệm làm việc của bạn..."
          value={form.comment}
          onChange={(e) => setForm(prev => ({ ...prev, comment: e.target.value }))}
          rows={3}
          maxLength={500}
        />
        <span className={styles.charCount}>{form.comment.length}/500</span>
      </div>

      <button
        className={styles.submitBtn}
        onClick={handleSubmit}
        disabled={form.rating === 0 || submitting}
      >
        {submitting ? (
          'Đang gửi...'
        ) : (
          <>
            <Send size={14} />
            Gửi đánh giá
          </>
        )}
      </button>
    </div>
  );
}

// =====================
// Star Rating Sub-component
// =====================

function StarRating({
  value,
  onChange,
  size = 'md',
}: {
  value: number;
  onChange: (v: number) => void;
  size?: 'md' | 'lg';
}) {
  const [hover, setHover] = useState(0);
  const starSize = size === 'lg' ? 28 : 18;

  return (
    <div className={`${styles.stars} ${styles[`stars_${size}`]}`}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          className={`${styles.star} ${star <= (hover || value) ? styles.starActive : ''}`}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
        >
          <Star size={starSize} />
        </button>
      ))}
      {(hover || value) > 0 && (
        <span className={styles.ratingLabel}>
          {getRatingLabel(hover || value)}
        </span>
      )}
    </div>
  );
}

function getRatingLabel(rating: number): string {
  switch (rating) {
    case 1: return 'Kém';
    case 2: return 'Trung bình';
    case 3: return 'Tốt';
    case 4: return 'Rất tốt';
    case 5: return 'Xuất sắc';
    default: return '';
  }
}
