'use client';

import React, { useState } from 'react';
import { createReview } from '@/lib/firebase/reviews';
import { REVIEW_RATING_LABELS } from '@/types';
import type { UserRole } from '@/types';
import styles from './ReviewForm.module.css';

interface ReviewFormProps {
  jobId: string;
  jobTitle: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: UserRole;
  revieweeId: string;
  revieweeName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ReviewForm({
  jobId, jobTitle, reviewerId, reviewerName, reviewerRole,
  revieweeId, revieweeName, onSuccess, onCancel,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [categories, setCategories] = useState({
    quality: 0,
    communication: 0,
    timeliness: 0,
    professionalism: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const categoryLabels: Record<string, string> = {
    quality: 'Chất lượng công việc',
    communication: 'Giao tiếp',
    timeliness: 'Đúng hạn',
    professionalism: 'Chuyên nghiệp',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Vui lòng chọn đánh giá tổng thể.');
      return;
    }
    if (!comment.trim()) {
      setError('Vui lòng viết nhận xét.');
      return;
    }

    setSubmitting(true);
    try {
      // Filter out categories with 0 rating
      const filledCategories = Object.fromEntries(
        Object.entries(categories).filter(([, v]) => v > 0)
      );

      await createReview({
        jobId,
        jobTitle,
        reviewerId,
        reviewerName,
        reviewerRole,
        revieweeId,
        revieweeName,
        rating,
        comment: comment.trim(),
        categories: Object.keys(filledCategories).length > 0
          ? (filledCategories as typeof categories)
          : undefined,
      });
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className={styles.successMsg}>
        <span className={styles.successIcon}>✓</span>
        Đánh giá đã được gửi thành công!
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h4 className={styles.title}>
        Đánh giá <strong>{revieweeName}</strong>
      </h4>
      <p className={styles.subtitle}>Công việc: {jobTitle}</p>

      {/* Overall Rating */}
      <div className={styles.ratingSection}>
        <label className={styles.label}>Đánh giá tổng thể *</label>
        <div className={styles.stars}>
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              className={`${styles.star} ${star <= (hoverRating || rating) ? styles.starActive : ''}`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              aria-label={`${star} sao`}
            >
              ★
            </button>
          ))}
          {(hoverRating || rating) > 0 && (
            <span className={styles.ratingLabel}>
              {REVIEW_RATING_LABELS[hoverRating || rating]}
            </span>
          )}
        </div>
      </div>

      {/* Category Ratings (optional) */}
      <div className={styles.categoriesSection}>
        <label className={styles.label}>Đánh giá chi tiết (tuỳ chọn)</label>
        {Object.entries(categoryLabels).map(([key, label]) => (
          <div key={key} className={styles.categoryRow}>
            <span className={styles.categoryLabel}>{label}</span>
            <div className={styles.categoryStars}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  className={`${styles.smallStar} ${star <= categories[key as keyof typeof categories] ? styles.smallStarActive : ''}`}
                  onClick={() => setCategories(prev => ({ ...prev, [key]: star }))}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Comment */}
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Nhận xét *</label>
        <textarea
          className={styles.textarea}
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Chia sẻ trải nghiệm của bạn..."
          rows={4}
          maxLength={1000}
        />
        <span className={styles.charCount}>{comment.length}/1000</span>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        {onCancel && (
          <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={submitting}>
            Huỷ
          </button>
        )}
        <button type="submit" className={styles.submitBtn} disabled={submitting || rating === 0}>
          {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
        </button>
      </div>
    </form>
  );
}
