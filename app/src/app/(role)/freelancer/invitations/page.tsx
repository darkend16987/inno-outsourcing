'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, Check, X, Loader2, Inbox, Clock, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { useAuth } from '@/lib/firebase/auth-context';
import { getInvitationsForFreelancer, respondToInvitation } from '@/lib/firebase/firestore-extended';
import { getJobById } from '@/lib/firebase/firestore';
import styles from './page.module.css';

export default function FreelancerInvitationsPage() {
  const { userProfile } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  // Track job status for each invitation
  const [jobStatuses, setJobStatuses] = useState<Record<string, { status: string; assignedTo?: string; assignedWorkerName?: string }>>({});

  useEffect(() => {
    if (!userProfile?.uid) return;
    const load = async () => {
      const list = await getInvitationsForFreelancer(userProfile.uid);
      setInvitations(list);
      setLoading(false);

      // Fetch job statuses in parallel for pending invitations
      const statusMap: Record<string, { status: string; assignedTo?: string; assignedWorkerName?: string }> = {};
      await Promise.all(
        list.map(async (inv) => {
          try {
            const job = await getJobById(inv.jobId);
            if (job) {
              statusMap[inv.jobId] = {
                status: job.status,
                assignedTo: job.assignedTo || undefined,
                assignedWorkerName: job.assignedWorkerName || undefined,
              };
            }
          } catch { /* ignore */ }
        })
      );
      setJobStatuses(statusMap);
    };
    load().catch(() => setLoading(false));
  }, [userProfile?.uid]);

  const handleRespond = async (id: string, response: 'accepted' | 'declined') => {
    setResponding(id);
    try {
      await respondToInvitation(id, response);
      setInvitations(prev => prev.map(inv =>
        inv.id === id ? { ...inv, status: response } : inv
      ));
    } catch (err) {
      console.error('Failed to respond:', err);
      alert('Có lỗi xảy ra. Vui lòng thử lại.');
    }
    setResponding(null);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}><Mail size={24} /> Lời mời ứng tuyển</h1>
        <p className={styles.subtitle}>Các lời mời tham gia dự án từ Job Master</p>
      </div>

      {loading ? (
        <div className={styles.loadingWrap}><Loader2 size={20} className={styles.spin} /> Đang tải...</div>
      ) : invitations.length === 0 ? (
        <div className={styles.emptyState}>
          <Inbox size={48} strokeWidth={1} />
          <p>Bạn chưa nhận được lời mời nào.</p>
          <Link href="/jobs">
            <Button variant="outline">Xem danh sách Job</Button>
          </Link>
        </div>
      ) : (
        <div className={styles.invList}>
          {invitations.map(inv => {
            const jobStatus = jobStatuses[inv.jobId];
            const isJobAssigned = jobStatus && jobStatus.status !== 'open' && jobStatus.status !== 'pending_approval' && jobStatus.status !== 'draft';
            const isAssignedToMe = jobStatus?.assignedTo === userProfile?.uid;

            return (
              <Card key={inv.id} className={`${styles.invCard} ${isJobAssigned && !isAssignedToMe ? styles.invAssigned : ''}`}>
                <div className={styles.invTop}>
                  <div className={styles.invInfo}>
                    <h3 className={styles.invJobTitle}>{inv.jobTitle || `Dự án #${inv.jobId.slice(0, 8)}`}</h3>
                    <p className={styles.invMessage}>{inv.message || 'Jobmaster mời bạn tham gia dự án này.'}</p>
                    <div className={styles.invMeta}>
                      <Clock size={14} />
                      <span>
                        {inv.createdAt && typeof inv.createdAt === 'object' && 'toDate' in inv.createdAt
                          ? (inv.createdAt as { toDate: () => Date }).toDate().toLocaleDateString('vi-VN')
                          : ''}
                      </span>
                    </div>
                  </div>
                  <div className={styles.invStatus}>
                    {/* Show job assigned status if applicable */}
                    {isJobAssigned && !isAssignedToMe && (
                      <Badge variant="default">
                        <UserCheck size={12} /> Đã giao cho người khác
                      </Badge>
                    )}
                    {isAssignedToMe && (
                      <Badge variant="success">
                        <UserCheck size={12} /> Đã giao cho bạn
                      </Badge>
                    )}
                    {inv.status === 'pending' && !isJobAssigned && <Badge variant="warning">Chờ phản hồi</Badge>}
                    {inv.status === 'accepted' && !isJobAssigned && <Badge variant="success">Đã chấp nhận</Badge>}
                    {inv.status === 'declined' && <Badge variant="error">Đã từ chối</Badge>}
                  </div>
                </div>

                {/* Assigned-to-other warning banner */}
                {isJobAssigned && !isAssignedToMe && inv.status === 'pending' && (
                  <div className={styles.assignedBanner}>
                    <AlertCircle size={16} />
                    <span>Dự án này đã được giao cho freelancer khác{jobStatus.assignedWorkerName ? ` (${jobStatus.assignedWorkerName})` : ''}. Bạn vẫn có thể xem thông tin dự án.</span>
                  </div>
                )}

                <div className={styles.invActions}>
                  <Link href={`/jobs/${inv.jobId}`}>
                    <Button variant="ghost" size="sm" icon={<ArrowRight size={14} />}>Xem chi tiết</Button>
                  </Link>
                  {inv.status === 'pending' && !isJobAssigned && (
                    <div className={styles.invBtns}>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<X size={14} />}
                        disabled={responding === inv.id}
                        onClick={() => handleRespond(inv.id, 'declined')}
                      >
                        Từ chối
                      </Button>
                      <Button
                        size="sm"
                        icon={<Check size={14} />}
                        disabled={responding === inv.id}
                        onClick={() => handleRespond(inv.id, 'accepted')}
                      >
                        {responding === inv.id ? 'Đang xử lý...' : 'Chấp nhận'}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
