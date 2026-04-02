'use client';

import React from 'react';
import { REVIEW_RATING_LABELS } from '@/types';
import type { Review } from '@/types';
import styles from './ReviewList.module.css';

interface ReviewListProps {
  reviews: Review[];
  title?: string;
  emptyMessage?: string;
}

export function ReviewList({ reviews, title = 'Đánh giá', emptyMessage = 'Chưa có đánh giá nào.' }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>☆</span>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>{title}</h4>
        <div className={styles.summary}>
          <span className={styles.avgRating}>{avgRating.toFixed(1)}</span>
          <div className={styles.avgStars}>
            {[1, 2, 3, 4, 5].map(s => (
              <span key={s} className={s <= Math.round(avgRating) ? styles.filledStar : styles.emptyStar}>
                ★
              </span>
            ))}
          </div>
          <span className={styles.reviewCount}>({reviews.length} đánh giá)</span>
        </div>
      </div>

      <div className={styles.list}>
        {reviews.map(review => (
          <div key={review.id} className={styles.reviewCard}>
            <div className={styles.reviewHeader}>
              <div className={styles.reviewerInfo}>
                <span className={styles.reviewerAvatar}>
                  {review.reviewerName?.charAt(0)?.toUpperCase() || '?'}
                </span>
                <div>
                  <span className={styles.reviewerName}>{review.reviewerName}</span>
                  <span className={styles.reviewDate}>
                    {review.createdAt instanceof Date
                      ? review.createdAt.toLocaleDateString('vi-VN')
                      : ''}
                  </span>
                </div>
              </div>
              <div className={styles.reviewRating}>
                {[1, 2, 3, 4, 5].map(s => (
                  <span key={s} className={s <= review.rating ? styles.filledStar : styles.emptyStar}>
                    ★
                  </span>
                ))}
                <span className={styles.ratingText}>{REVIEW_RATING_LABELS[review.rating]}</span>
              </div>
            </div>

            <p className={styles.reviewComment}>{review.comment}</p>

            {review.categories && (
              <div className={styles.categories}>
                {Object.entries(review.categories).map(([key, value]) => {
                  if (!value) return null;
                  const labels: Record<string, string> = {
                    quality: 'Chất lượng',
                    communication: 'Giao tiếp',
                    timeliness: 'Đúng hạn',
                    professionalism: 'Chuyên nghiệp',
                  };
                  return (
                    <div key={key} className={styles.categoryTag}>
                      <span className={styles.categoryName}>{labels[key] || key}</span>
                      <span className={styles.categoryValue}>{value}/5</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className={styles.jobInfo}>
              Công việc: {review.jobTitle}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
