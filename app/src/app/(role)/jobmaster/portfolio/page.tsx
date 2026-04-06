'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Star, Loader2, Inbox, Calendar, DollarSign,
  Briefcase, Award, MessageSquare, TrendingUp, Users,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { useAuth } from '@/lib/firebase/auth-context';
import { getJobs } from '@/lib/firebase/firestore';
import { getReviewsForUser } from '@/lib/firebase/reviews';
import type { Review, Job } from '@/types';
import styles from './page.module.css';

/* ────────── helpers ────────── */

const formatDate = (d: unknown): string => {
  if (!d) return '';
  if (typeof d === 'object' && d !== null && 'toDate' in d)
    return (d as { toDate: () => Date }).toDate().toLocaleDateString('vi-VN');
  if (d instanceof Date) return d.toLocaleDateString('vi-VN');
  return String(d);
};

const formatCurrency = (amount: number) =>
  `${amount.toLocaleString('vi-VN')}\u20AB`;

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.35 },
  }),
};

const JM_CATEGORY_LABELS: Record<string, string> = {
  descriptionClarity: 'Mô tả rõ ràng',
  paymentTimeliness: 'Thanh toán đúng hạn',
  communication: 'Giao tiếp',
  professionalism: 'Chuyên nghiệp',
};

/* ────────── Stars ────────── */

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className={styles.stars}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={size}
          fill={n <= rating ? '#f59e0b' : 'none'}
          className={n <= rating ? styles.starFilled : styles.starEmpty}
        />
      ))}
      <span className={styles.ratingNumber}>{rating.toFixed(1)}</span>
    </span>
  );
}

/* ────────── RatingBar ────────── */

function RatingBar({ label, value, max = 5 }: { label: string; value: number; max?: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className={styles.ratingBarRow}>
      <span className={styles.ratingBarLabel}>{label}</span>
      <div className={styles.ratingBarTrack}>
        <motion.div
          className={styles.ratingBarFill}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className={styles.ratingBarValue}>{value > 0 ? value.toFixed(1) : '--'}</span>
    </div>
  );
}

/* ────────── Types ────────── */

interface PortfolioEntry {
  job: {
    id: string;
    title: string;
    category: string;
    totalFee: number;
    completedAt: string;
    status: string;
  };
  review: Review | null;
}

/* ────────── Main Page ────────── */

export default function JobmasterPortfolioPage() {
  const { userProfile } = useAuth();
  const [entries, setEntries] = useState<PortfolioEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.uid) return;

    const fetchData = async () => {
      try {
        // Fetch jobs created by this jobmaster that are completed/paid
        const [jobsResult, reviewsResult] = await Promise.allSettled([
          getJobs({ jobMaster: userProfile.uid }, 200),
          getReviewsForUser(userProfile.uid),
        ]);

        const allJobs = jobsResult.status === 'fulfilled' ? jobsResult.value.items : [];
        const reviews = reviewsResult.status === 'fulfilled' ? reviewsResult.value : [];

        // Only completed/paid jobs
        const completedJobs = allJobs.filter(
          (j: Job) => j.status === 'completed' || j.status === 'paid'
        );

        // Build review lookup by jobId
        const reviewsByJobId = new Map<string, Review>();
        for (const r of reviews) {
          reviewsByJobId.set(r.jobId, r);
        }

        const portfolioEntries: PortfolioEntry[] = completedJobs.map((job: Job) => ({
          job: {
            id: job.id,
            title: job.title,
            category: job.category,
            totalFee: job.totalFee,
            completedAt: formatDate(job.updatedAt || job.deadline),
            status: job.status,
          },
          review: reviewsByJobId.get(job.id) || null,
        }));

        setEntries(portfolioEntries);
      } catch (err) {
        console.error('Portfolio fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userProfile?.uid]);

  /* ────────── Summary ────────── */

  const summary = useMemo(() => {
    const total = entries.length;
    const reviewedEntries = entries.filter(e => e.review);
    const avgRating = reviewedEntries.length > 0
      ? reviewedEntries.reduce((sum, e) => sum + (e.review?.rating || 0), 0) / reviewedEntries.length
      : 0;

    // Average category ratings
    const catTotals: Record<string, { sum: number; count: number }> = {};
    for (const e of reviewedEntries) {
      if (!e.review?.categories) continue;
      for (const [key, val] of Object.entries(e.review.categories)) {
        if (!val || val === 0) continue;
        if (!catTotals[key]) catTotals[key] = { sum: 0, count: 0 };
        catTotals[key].sum += val;
        catTotals[key].count += 1;
      }
    }
    const categoryAvgs: Record<string, number> = {};
    for (const [key, { sum, count }] of Object.entries(catTotals)) {
      categoryAvgs[key] = sum / count;
    }

    const totalSpent = entries.reduce((sum, e) => sum + (e.job.totalFee || 0), 0);

    return { total, avgRating, reviewCount: reviewedEntries.length, categoryAvgs, totalSpent };
  }, [entries]);

  /* ────────── Loading ────────── */

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <Loader2 size={24} className={styles.spin} />
          Đang tải dữ liệu...
        </div>
      </div>
    );
  }

  /* ────────── Render ────────── */

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Portfolio Jobmaster</h1>
          <p className={styles.subtitle}>
            Tổng hợp các dự án đã hoàn thành và đánh giá từ Freelancer.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>
            <Briefcase size={20} />
          </div>
          <div className={styles.summaryInfo}>
            <span className={styles.summaryValue}>{summary.total}</span>
            <span className={styles.summaryLabel}>Dự án hoàn thành</span>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={`${styles.summaryIcon} ${styles.ratingIcon}`}>
            <Star size={20} />
          </div>
          <div className={styles.summaryInfo}>
            <span className={styles.summaryValue}>
              {summary.avgRating > 0 ? summary.avgRating.toFixed(1) : '--'}
            </span>
            <span className={styles.summaryLabel}>
              Đánh giá trung bình ({summary.reviewCount} đánh giá)
            </span>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={`${styles.summaryIcon} ${styles.earningsIcon}`}>
            <DollarSign size={20} />
          </div>
          <div className={styles.summaryInfo}>
            <span className={styles.summaryValue}>
              {summary.totalSpent > 0 ? formatCurrency(summary.totalSpent) : '--'}
            </span>
            <span className={styles.summaryLabel}>Tổng chi trả</span>
          </div>
        </div>
      </div>

      {/* Detailed Ratings Breakdown */}
      {summary.reviewCount > 0 && Object.keys(summary.categoryAvgs).length > 0 && (
        <Card className={styles.ratingsBreakdown}>
          <div className={styles.breakdownHeader}>
            <TrendingUp size={18} />
            <h3>Đánh giá chi tiết trung bình từ Freelancer</h3>
          </div>
          <div className={styles.breakdownContent}>
            <div className={styles.breakdownOverall}>
              <span className={styles.breakdownBigNumber}>
                {summary.avgRating.toFixed(1)}
              </span>
              <StarRating rating={Math.round(summary.avgRating)} size={18} />
              <span className={styles.breakdownCount}>
                {summary.reviewCount} đánh giá
              </span>
            </div>
            <div className={styles.breakdownBars}>
              {Object.entries(JM_CATEGORY_LABELS).map(([key, label]) => (
                <RatingBar
                  key={key}
                  label={label}
                  value={summary.categoryAvgs[key] || 0}
                />
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Job list */}
      {entries.length === 0 ? (
        <div className={styles.empty}>
          <Inbox size={32} />
          <p>Chưa có dự án nào hoàn thành trong portfolio.</p>
        </div>
      ) : (
        <div className={styles.listView}>
          {entries.map((entry, i) => (
            <motion.div key={entry.job.id} initial="hidden" animate="visible" custom={i} variants={fadeUp}>
              <Card className={styles.listCard}>
                <div className={styles.listMain}>
                  <div className={styles.listTags}>
                    <Badge variant="outline" size="sm">{entry.job.category}</Badge>
                    <Badge variant={entry.job.status === 'paid' ? 'info' : 'success'} size="sm">
                      {entry.job.status === 'paid' ? 'Đã thanh toán' : 'Hoàn thành'}
                    </Badge>
                  </div>
                  <h3 className={styles.listTitle}>{entry.job.title}</h3>
                  <div className={styles.listMeta}>
                    <span><DollarSign size={14} /> {formatCurrency(entry.job.totalFee)}</span>
                    <span><Calendar size={14} /> {entry.job.completedAt}</span>
                  </div>
                </div>

                <div className={styles.listReview}>
                  {entry.review ? (
                    <>
                      <div className={styles.reviewHeader}>
                        <Award size={14} />
                        <span className={styles.reviewerLabel}>Đánh giá từ</span>
                        <span className={styles.reviewerName}>{entry.review.reviewerName}</span>
                      </div>
                      <StarRating rating={entry.review.rating} />
                      {entry.review.comment && (
                        <div className={styles.reviewCommentBlock}>
                          <MessageSquare size={12} />
                          <p className={styles.reviewComment}>
                            &ldquo;{entry.review.comment}&rdquo;
                          </p>
                        </div>
                      )}
                      {entry.review.categories && (
                        <div className={styles.reviewCategories}>
                          {Object.entries(entry.review.categories).map(([key, val]) =>
                            val ? (
                              <span key={key} className={styles.categoryTag}>
                                {JM_CATEGORY_LABELS[key] || key}: {val}/5
                              </span>
                            ) : null
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className={styles.noReview}>
                      <Users size={14} /> Chưa có đánh giá
                    </span>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
