'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Check, X, FileText, ArrowUpRight, Loader2, Inbox } from 'lucide-react';
import { Card, Badge, Avatar, Button, LevelBadge } from '@/components/ui';
import { TrustBadge } from '@/components/ui/TrustBadge';
import { AvailabilityBadge } from '@/components/ui/AvailabilityBadge';
import { ActiveJobWarning } from '@/components/ui/ActiveJobWarning';
import { useAuth } from '@/lib/firebase/auth-context';
import { getAllApplications, updateApplication, getUserProfile } from '@/lib/firebase/firestore';
import { getActiveJobCount } from '@/lib/firebase/firestore-extended';
import { calculateTrustScore } from '@/lib/matching/trust-score';
import { cache, TTL } from '@/lib/cache/swr-cache';
import type { JobApplication, AvailabilityStatus, TrustBadgeLevel } from '@/types';
import styles from './page.module.css';

interface AppItem {
  id: string;
  jobId: string;
  jobTitle: string;
  candidateName: string;
  candidateId: string;
  candidateLevel: string;
  bidAmount: number;
  duration: number;
  status: string;
  coverLetter: string;
  createdAt: unknown;
  // Enriched data
  trustBadge?: TrustBadgeLevel;
  trustScore?: number;
  availability?: AvailabilityStatus;
  activeJobCount?: number;
}

const formatDate = (d: unknown): string => {
  if (!d) return '-';
  if (typeof d === 'object' && d !== null && 'toDate' in d) return (d as { toDate: () => Date }).toDate().toLocaleDateString('vi-VN');
  if (d instanceof Date) return d.toLocaleDateString('vi-VN');
  return String(d);
};

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')}₫`;

export default function ApplicationsPage() {
  const { userProfile } = useAuth();
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedLetter, setExpandedLetter] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile?.uid) return;
    const fetchApps = async () => {
      const result = await cache.get(`jm:apps:all:${userProfile.uid}`, () => getAllApplications({}, 50), TTL.MEDIUM);
      const mapped: AppItem[] = result.items.map((a) => ({
        id: a.id,
        jobId: a.jobId || '',
        jobTitle: a.jobTitle || 'Dự án',
        candidateName: a.applicantName || 'Ứng viên',
        candidateId: a.applicantId || '',
        candidateLevel: a.applicantLevel || 'L1',
        bidAmount: a.expectedFee || 0,
        duration: 0,
        status: a.status || 'pending',
        coverLetter: a.coverLetter || '',
        createdAt: a.createdAt,
      }));
      setApps(mapped);
      setLoading(false);

      // Enrich with trust, availability, active job count in background
      const uniqueIds = [...new Set(mapped.map(a => a.candidateId).filter(Boolean))];
      const enrichMap = new Map<string, { trustBadge?: TrustBadgeLevel; trustScore?: number; availability?: AvailabilityStatus; activeJobCount?: number }>();
      await Promise.all(uniqueIds.map(async (uid) => {
        try {
          const [profile, activeCount] = await Promise.all([
            getUserProfile(uid),
            getActiveJobCount(uid),
          ]);
          if (profile) {
            const stats = profile.stats || { completedJobs: 0, totalEarnings: 0, avgRating: 0, ratingCount: 0, onTimeRate: 0, currentMonthEarnings: 0 };
            const trust = calculateTrustScore(stats);
            enrichMap.set(uid, {
              trustBadge: trust.badge,
              trustScore: trust.totalScore,
              availability: profile.availability,
              activeJobCount: activeCount,
            });
          }
        } catch { /* skip */ }
      }));
      setApps(prev => prev.map(a => {
        const enrich = enrichMap.get(a.candidateId);
        return enrich ? { ...a, ...enrich } : a;
      }));
    };
    fetchApps().catch(() => setLoading(false));
  }, [userProfile?.uid]);

  const handleApprove = async (app: AppItem) => {
    if (!userProfile) return;
    if (!confirm(`Bạn xác nhận chọn "${app.candidateName}" cho dự án "${app.jobTitle}"?`)) return;
    setActionLoading(app.id);
    try {
      await updateApplication(app.id, { status: 'accepted' } as Partial<JobApplication>, {
        uid: userProfile.uid,
        name: userProfile.displayName,
        role: userProfile.role,
      });
      setApps(prev => prev.map(a => a.id === app.id ? { ...a, status: 'accepted' } : a));
      cache.invalidate(`jm:apps:all:${userProfile.uid}`);
      alert('✅ Đã chọn ứng viên thành công!');
    } catch (err) {
      console.error('Approve failed:', err);
      alert('❌ Không thể duyệt. Vui lòng thử lại.');
    }
    setActionLoading(null);
  };

  const handleReject = async (app: AppItem) => {
    if (!userProfile) return;
    if (!confirm(`Bạn xác nhận từ chối "${app.candidateName}"?`)) return;
    setActionLoading(app.id);
    try {
      await updateApplication(app.id, { status: 'rejected' } as Partial<JobApplication>, {
        uid: userProfile.uid,
        name: userProfile.displayName,
        role: userProfile.role,
      });
      setApps(prev => prev.map(a => a.id === app.id ? { ...a, status: 'rejected' } : a));
      cache.invalidate(`jm:apps:all:${userProfile.uid}`);
    } catch (err) {
      console.error('Reject failed:', err);
      alert('❌ Không thể từ chối. Vui lòng thử lại.');
    }
    setActionLoading(null);
  };

  const filteredApps = apps.filter(a => {
    const matchFilter = filter === 'all' || a.status === filter;
    const matchSearch = !search || a.jobTitle.toLowerCase().includes(search.toLowerCase()) || a.candidateName.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}><Loader2 size={24} className={styles.spin} /> Đang tải...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Duyệt ứng viên</h1>
          <p className={styles.subtitle}>Xem xét và chọn ra Freelancer phù hợp nhất cho dự án của bạn.</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input type="text" placeholder="Tìm theo tên dự án, tên ứng viên..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className={styles.filters}>
          <button className={`${styles.filterBtn} ${filter === 'pending' ? styles.active : ''}`} onClick={() => setFilter('pending')}>Chưa duyệt</button>
          <button className={`${styles.filterBtn} ${filter === 'accepted' ? styles.active : ''}`} onClick={() => setFilter('accepted')}>Đã chọn</button>
          <button className={`${styles.filterBtn} ${filter === 'rejected' ? styles.active : ''}`} onClick={() => setFilter('rejected')}>Đã từ chối</button>
          <button className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`} onClick={() => setFilter('all')}>Tất cả</button>
        </div>
      </div>

      <div className={styles.appList}>
        {filteredApps.map(app => (
          <Card key={app.id} className={styles.appCard}>
            <div className={styles.appHeader}>
              <div className={styles.jobInfo}>
                <span className={styles.jLabel}>Dự án ứng tuyển:</span>
                <span className={styles.jTitle}>{app.jobTitle}</span>
              </div>
              <div className={styles.timeInfo}>{formatDate(app.createdAt)}</div>
            </div>

            <div className={styles.appBody}>
              <div className={styles.candidateCol}>
                <Avatar name={app.candidateName} level={app.candidateLevel as 'L1' | 'L2' | 'L3' | 'L4' | 'L5'} size="lg" />
                <div className={styles.cInfo}>
                  <h3 className={styles.cName}>{app.candidateName}</h3>
                  <div className={styles.cTags}>
                    <LevelBadge level={app.candidateLevel as 'L1' | 'L2' | 'L3' | 'L4' | 'L5'} />
                    {app.trustBadge && <TrustBadge badge={app.trustBadge} score={app.trustScore} size="sm" showTooltip={false} />}
                    {app.availability && <AvailabilityBadge status={app.availability} size="sm" />}
                  </div>
                  {app.candidateId && (
                    <Link href={`/jobmaster/freelancers/${app.candidateId}`} className={styles.viewProfileBtn}>
                      Xem hồ sơ kỹ năng <ArrowUpRight size={14}/>
                    </Link>
                  )}
                  {app.activeJobCount !== undefined && app.activeJobCount >= 3 && (
                    <ActiveJobWarning count={app.activeJobCount} threshold={3} variant="applicant" />
                  )}
                </div>
              </div>

              <div className={styles.proposalCol}>
                <div className={styles.pItem}>
                  <span className={styles.pLabel}>Ngân sách đề xuất</span>
                  <span className={styles.pVal}>{app.bidAmount > 0 ? formatCurrency(app.bidAmount) : '-'}</span>
                </div>
                <div className={styles.pItem}>
                  <span className={styles.pLabel}>Thời gian thi công</span>
                  <span className={styles.pVal}>{app.duration > 0 ? `${app.duration} ngày` : '-'}</span>
                </div>
              </div>

              <div className={styles.actionCol}>
                {app.status === 'pending' ? (
                  <>
                    <Button
                      className={styles.approveBtn}
                      onClick={() => handleApprove(app)}
                      disabled={actionLoading === app.id}
                    >
                      <Check size={16}/> {actionLoading === app.id ? 'Đang xử lý...' : 'Chọn ứng viên'}
                    </Button>
                    <Button
                      variant="outline"
                      className={styles.rejectBtn}
                      onClick={() => handleReject(app)}
                      disabled={actionLoading === app.id}
                    >
                      <X size={16}/> Từ chối
                    </Button>
                    {app.coverLetter && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedLetter(expandedLetter === app.id ? null : app.id)}
                      >
                        <FileText size={16}/> {expandedLetter === app.id ? 'Ẩn thư' : 'Xem thư giới thiệu'}
                      </Button>
                    )}
                  </>
                ) : (
                  <Badge variant={app.status === 'accepted' ? 'success' : app.status === 'rejected' ? 'error' : 'default'}>
                    {app.status === 'accepted' ? 'Đã được chọn' : app.status === 'rejected' ? 'Đã từ chối' : app.status}
                  </Badge>
                )}
              </div>
            </div>

            {expandedLetter === app.id && app.coverLetter && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)', borderRadius: '0 0 12px 12px', fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                <strong>Thư giới thiệu:</strong>
                <p style={{ marginTop: '4px' }}>{app.coverLetter}</p>
              </div>
            )}
          </Card>
        ))}

        {filteredApps.length === 0 && (
          <div className={styles.empty}>
            <Inbox size={24} /><p>Chưa có ứng viên nào cần duyệt.</p>
          </div>
        )}
      </div>
    </div>
  );
}
