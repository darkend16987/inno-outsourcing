'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, Check, X, Loader2, Inbox, Clock, ArrowRight } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { useAuth } from '@/lib/firebase/auth-context';
import { getInvitationsForFreelancer, respondToInvitation } from '@/lib/firebase/firestore-extended';
import styles from './page.module.css';

export default function FreelancerInvitationsPage() {
  const { userProfile } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile?.uid) return;
    const load = async () => {
      const list = await getInvitationsForFreelancer(userProfile.uid);
      setInvitations(list);
      setLoading(false);
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
          {invitations.map(inv => (
            <Card key={inv.id} className={styles.invCard}>
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
                  {inv.status === 'pending' && <Badge variant="warning">Chờ phản hồi</Badge>}
                  {inv.status === 'accepted' && <Badge variant="success">Đã chấp nhận</Badge>}
                  {inv.status === 'declined' && <Badge variant="error">Đã từ chối</Badge>}
                </div>
              </div>

              {inv.status === 'pending' && (
                <div className={styles.invActions}>
                  <Link href={`/freelancer/jobs/${inv.jobId}`}>
                    <Button variant="ghost" size="sm" icon={<ArrowRight size={14} />}>Xem chi tiết</Button>
                  </Link>
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
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
