'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Star, Loader2, Inbox, LayoutGrid, List,
  Calendar, DollarSign, Briefcase, Award,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { useAuth } from '@/lib/firebase/auth-context';
import { getApplicationsForFreelancer, getJobById } from '@/lib/firebase/firestore';
import { getReviewsForUser } from '@/lib/firebase/reviews';
import type { Review } from '@/types';
import styles from './page.module.css';

// ---------- helpers ----------

interface PortfolioEntry {
  job: {
    id: string;
    title: string;
    category: string;
    totalFee: number;
    completedAt: string;   // formatted date
    status: string;
  };
  review: Review | null;
}

const formatDate = (d: unknown): string => {
  if (!d) return '';
  if (typeof d === 'object' && d !== null && 'toDate' in d)
    return (d as { toDate: () => Date }).toDate().toLocaleDateString('vi-VN');
  if (d instanceof Date) return d.toLocaleDateString('vi-VN');
  return String(d);
};

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')}\u20AB`;

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.3 },
  }),
};

// ---------- Stars component ----------

function StarRating({ rating }: { rating: number }) {
  return (
    <span className={styles.stars}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={14}
          fill={n <= rating ? '#f59e0b' : 'none'}
          className={n <= rating ? styles.starFilled : styles.starEmpty}
        />
      ))}
      <span className={styles.ratingNumber}>{rating.toFixed(1)}</span>
    </span>
  );
}

// ---------- Category labels for sub-ratings ----------

const CATEGORY_LABELS: Record<string, string> = {
  quality: 'Chất lượng',
  communication: 'Giao tiếp',
  timeliness: 'Đúng hạn',
  professionalism: 'Chuyên nghiệp',
};

// ---------- Main Page ----------

export default function PortfolioPage() {
  const { userProfile } = useAuth();
  const [entries, setEntries] = useState<PortfolioEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    if (!userProfile?.uid) return;

    const fetchData = async () => {
      try {
        // 1. Get all applications for this freelancer
        const apps = await getApplicationsForFreelancer(userProfile.uid);
        const acceptedApps = apps.filter(a => a.status === 'accepted');

        // 2. Get all reviews for this user
        const reviews = await getReviewsForUser(userProfile.uid);
        const reviewsByJobId = new Map<string, Review>();
        for (const r of reviews) {
          reviewsByJobId.set(r.jobId, r);
        }

        // 3. For each accepted application, fetch the job and filter completed/paid
        const portfolioEntries: PortfolioEntry[] = [];
        for (const app of acceptedApps) {
          const job = await getJobById(app.jobId);
          if (!job) continue;
          if (job.status !== 'completed' && job.status !== 'paid') continue;

          portfolioEntries.push({
            job: {
              id: job.id,
              title: job.title,
              category: job.category,
              totalFee: job.totalFee,
              completedAt: formatDate(job.updatedAt || job.deadline),
              status: job.status,
            },
            review: reviewsByJobId.get(job.id) || null,
          });
        }

        setEntries(portfolioEntries);
      } catch (err) {
        console.error('Portfolio fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userProfile?.uid]);

  // ---------- Summary stats ----------

  const summary = useMemo(() => {
    const total = entries.length;
    const reviewedEntries = entries.filter(e => e.review);
    const avgRating = reviewedEntries.length > 0
      ? reviewedEntries.reduce((sum, e) => sum + (e.review?.rating || 0), 0) / reviewedEntries.length
      : 0;
    return { total, avgRating, reviewCount: reviewedEntries.length };
  }, [entries]);

  // ---------- Loading state ----------

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <Loader2 size={24} className={styles.spin} />
          \u0110ang t\u1EA3i d\u1EEF li\u1EC7u...
        </div>
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Portfolio</h1>
          <p className={styles.subtitle}>
            T\u1ED5ng h\u1EE3p c\u00E1c d\u1EF1 \u00E1n \u0111\u00E3 ho\u00E0n th\u00E0nh v\u00E0 \u0111\u00E1nh gi\u00E1 t\u1EEB Jobmaster.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>
            <Briefcase size={20} />
          </div>
          <div className={styles.summaryInfo}>
            <span className={styles.summaryValue}>{summary.total}</span>
            <span className={styles.summaryLabel}>D\u1EF1 \u00E1n ho\u00E0n th\u00E0nh</span>
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
              \u0110\u00E1nh gi\u00E1 trung b\u00ECnh ({summary.reviewCount} \u0111\u00E1nh gi\u00E1)
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <span className={styles.resultCount}>
          {entries.length} d\u1EF1 \u00E1n
        </span>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            <List size={16} />
          </button>
          <button
            className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {/* Job entries */}
      {entries.length === 0 ? (
        <div className={styles.empty}>
          <Inbox size={32} />
          <p>Ch\u01B0a c\u00F3 d\u1EF1 \u00E1n n\u00E0o ho\u00E0n th\u00E0nh trong portfolio.</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className={styles.listView}>
          {entries.map((entry, i) => (
            <motion.div key={entry.job.id} initial="hidden" animate="visible" custom={i} variants={fadeUp}>
              <Card className={styles.listCard}>
                <div className={styles.listMain}>
                  <div className={styles.listTags}>
                    <Badge variant="outline" size="sm">{entry.job.category}</Badge>
                    {/* @ts-ignore */}
                    <Badge variant={entry.job.status === 'paid' ? 'info' : 'success'} size="sm">
                      {entry.job.status === 'paid' ? '\u0110\u00E3 thanh to\u00E1n' : 'Ho\u00E0n th\u00E0nh'}
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
                        <span className={styles.reviewerName}>{entry.review.reviewerName}</span>
                      </div>
                      <StarRating rating={entry.review.rating} />
                      {entry.review.comment && (
                        <p className={styles.reviewComment}>
                          &ldquo;{entry.review.comment}&rdquo;
                        </p>
                      )}
                      {entry.review.categories && (
                        <div className={styles.reviewCategories}>
                          {Object.entries(entry.review.categories).map(([key, val]) =>
                            val ? (
                              <span key={key} className={styles.categoryTag}>
                                {CATEGORY_LABELS[key] || key}: {val}/5
                              </span>
                            ) : null
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className={styles.noReview}>Ch\u01B0a c\u00F3 \u0111\u00E1nh gi\u00E1</span>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className={styles.gridView}>
          {entries.map((entry, i) => (
            <motion.div key={entry.job.id} initial="hidden" animate="visible" custom={i} variants={fadeUp}>
              <Card className={styles.gridCard}>
                <div className={styles.gridTags}>
                  <Badge variant="outline" size="sm">{entry.job.category}</Badge>
                  {/* @ts-ignore */}
                  <Badge variant={entry.job.status === 'paid' ? 'info' : 'success'} size="sm">
                    {entry.job.status === 'paid' ? '\u0110\u00E3 thanh to\u00E1n' : 'Ho\u00E0n th\u00E0nh'}
                  </Badge>
                </div>
                <h3 className={styles.gridTitle}>{entry.job.title}</h3>
                <div className={styles.gridMeta}>
                  <span><DollarSign size={14} /> {formatCurrency(entry.job.totalFee)}</span>
                  <span><Calendar size={14} /> {entry.job.completedAt}</span>
                </div>

                <div className={styles.gridDivider} />

                <div className={styles.gridReview}>
                  {entry.review ? (
                    <>
                      <div className={styles.reviewHeader}>
                        <Award size={14} />
                        <span className={styles.reviewerName}>{entry.review.reviewerName}</span>
                      </div>
                      <StarRating rating={entry.review.rating} />
                      {entry.review.comment && (
                        <p className={styles.reviewComment}>
                          &ldquo;{entry.review.comment}&rdquo;
                        </p>
                      )}
                      {entry.review.categories && (
                        <div className={styles.reviewCategories}>
                          {Object.entries(entry.review.categories).map(([key, val]) =>
                            val ? (
                              <span key={key} className={styles.categoryTag}>
                                {CATEGORY_LABELS[key] || key}: {val}/5
                              </span>
                            ) : null
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className={styles.noReview}>Ch\u01B0a c\u00F3 \u0111\u00E1nh gi\u00E1</span>
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
