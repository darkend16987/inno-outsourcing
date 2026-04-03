'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, Star, Briefcase, Calendar, ExternalLink, Eye, Inbox, RefreshCw } from 'lucide-react';
import { Button, Card, Badge, Avatar, LevelBadge, Skeleton } from '@/components/ui';
import { getAllApplications, updateApplication } from '@/lib/firebase/firestore';
import type { JobApplication } from '@/types';
import styles from './page.module.css';

const STATUS_LABELS: Record<string, string> = { 
  pending: 'Chờ duyệt', 
  shortlisted: 'Vào vòng trong', 
  accepted: 'Đã chọn', 
  rejected: 'Từ chối' 
};

const STATUS_BADGE_VARIANT: Record<string, string> = {
  pending: 'default',
  shortlisted: 'warning',
  accepted: 'success',
  rejected: 'danger',
};

export default function AdminApplicationsPage() {
  const [filter, setFilter] = useState('all');
  const [allApplications, setAllApplications] = useState<(JobApplication & { jobTitle?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      // Always fetch ALL applications, filter client-side for accurate counts
      const result = await getAllApplications({}, 200);
      setAllApplications(result.items);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleUpdateStatus = async (appId: string, newStatus: string) => {
    try {
      setActionLoading(appId);
      await updateApplication(appId, { status: newStatus } as Partial<JobApplication>);
      // Update local state
      setAllApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus as JobApplication['status'] } : a));
    } catch (error) {
      console.error('Error updating application:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Counts computed from ALL applications (not filtered)
  const statusCounts = allApplications.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    acc['all'] = (acc['all'] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Client-side filtering
  const applications = filter === 'all'
    ? allApplications
    : allApplications.filter(a => a.status === filter);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Duyệt Ứng tuyển</h1>
          <p className={styles.pageSubtitle}>Xem xét và chọn ứng viên phù hợp cho các dự án.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchApplications} icon={<RefreshCw size={14} />}>
          Làm mới
        </Button>
      </div>

      <div className={styles.filterRow}>
        {['all', 'pending', 'shortlisted', 'accepted', 'rejected'].map(key => (
          <button key={key} className={`${styles.filterBtn} ${filter === key ? styles.filterActive : ''}`}
            onClick={() => setFilter(key)}>
            {key === 'all' ? 'Tất cả' : STATUS_LABELS[key]}
            {statusCounts[key] ? ` (${statusCounts[key]})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.appGrid}>
          {[1,2,3].map(i => (
            <Card key={i} variant="bordered" className={styles.appCard}>
              <div className={styles.appHeader}>
                <Skeleton width="48px" height="48px" />
                <div className={styles.appInfo}>
                  <Skeleton width="200px" height="20px" />
                  <Skeleton width="120px" height="16px" />
                </div>
              </div>
              <Skeleton width="100%" height="60px" />
              <Skeleton width="100%" height="40px" />
            </Card>
          ))}
        </div>
      ) : applications.length === 0 ? (
        <div className={styles.emptyState}>
          <Inbox size={48} className={styles.emptyIcon} />
          <h3>Chưa có đơn ứng tuyển nào</h3>
          <p>Các đơn ứng tuyển từ freelancer sẽ hiển thị tại đây khi có người nộp hồ sơ.</p>
        </div>
      ) : (
        <div className={styles.appGrid}>
          {applications.map(app => (
            <Card key={app.id} variant="bordered" className={styles.appCard}>
              <div className={styles.appHeader}>
                <Avatar name={app.applicantName || 'Ứng viên'} level={(app.applicantLevel || 'L1') as 'L1'|'L2'|'L3'|'L4'|'L5'} size="md" />
                <div className={styles.appInfo}>
                  <h3 className={styles.appName}>{app.applicantName || 'Ứng viên'}</h3>
                  <div className={styles.appMeta}>
                    <LevelBadge level={(app.applicantLevel || 'L1') as 'L1'|'L2'|'L3'|'L4'|'L5'} />
                    {app.applicantSpecialties?.length > 0 && (
                      <span><Briefcase size={14} /> {app.applicantSpecialties.join(', ')}</span>
                    )}
                  </div>
                </div>
                <Badge variant={STATUS_BADGE_VARIANT[app.status] as 'default' | 'warning' | 'success' || 'default'}>
                  {STATUS_LABELS[app.status] || app.status}
                </Badge>
              </div>

              {(app as JobApplication & { jobTitle?: string }).jobTitle && (
                <div className={styles.jobRef}>
                  <span className={styles.forLabel}>Ứng tuyển cho:</span> {(app as JobApplication & { jobTitle?: string }).jobTitle}
                </div>
              )}

              {app.applicantSpecialties?.length > 0 && (
                <div className={styles.specialties}>
                  {app.applicantSpecialties.map(s => <Badge key={s} variant="default">{s}</Badge>)}
                </div>
              )}

              {app.coverLetter && (
                <p className={styles.coverLetter}>{app.coverLetter}</p>
              )}

              <div className={styles.appDetails}>
                {app.availableDate && (
                  <div className={styles.detailItem}><Calendar size={14} /> Có thể bắt đầu: {typeof app.availableDate === 'string' ? app.availableDate : 'N/A'}</div>
                )}
                {app.expectedFee && (
                  <div className={styles.detailItem}><strong>Thù lao mong muốn:</strong> {(app.expectedFee / 1000000).toFixed(0)}M ₫</div>
                )}
                {app.portfolioLink && (
                  <a href={app.portfolioLink} target="_blank" rel="noopener noreferrer" className={styles.portfolioLink}>
                    <ExternalLink size={14} /> Xem Portfolio
                  </a>
                )}
              </div>

              <div className={styles.appActions}>
                {app.status === 'pending' && (
                  <>
                    <Button 
                      variant="success" size="sm" 
                      icon={<Star size={14} />} 
                      loading={actionLoading === app.id}
                      onClick={() => handleUpdateStatus(app.id, 'shortlisted')}
                    >Shortlist</Button>
                    <Button 
                      variant="danger" size="sm" 
                      icon={<XCircle size={14} />}
                      loading={actionLoading === app.id}
                      onClick={() => handleUpdateStatus(app.id, 'rejected')}
                    >Từ chối</Button>
                  </>
                )}
                {app.status === 'shortlisted' && (
                  <>
                    <Button 
                      variant="success" size="sm" 
                      icon={<CheckCircle size={14} />}
                      loading={actionLoading === app.id}
                      onClick={() => handleUpdateStatus(app.id, 'accepted')}
                    >Chọn</Button>
                    <Button 
                      variant="danger" size="sm" 
                      icon={<XCircle size={14} />}
                      loading={actionLoading === app.id}
                      onClick={() => handleUpdateStatus(app.id, 'rejected')}
                    >Từ chối</Button>
                  </>
                )}
                <Link href={`/admin/users/${app.applicantId}`}>
                  <Button variant="ghost" size="sm" icon={<Eye size={14} />}>Chi tiết</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
