'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Clock, FileText, CheckCircle, MessageSquare, AlertTriangle, Zap, X, Loader2, Inbox } from 'lucide-react';
import { Button, Card, Badge, Avatar } from '@/components/ui';
import { EscrowStatus } from '@/components/escrow/EscrowStatus';
import { DeadlineIndicator } from '@/components/jobs/DeadlineAlert';
import { MutualReviewForm } from '@/components/reviews/MutualReview';
import { submitReview, hasUserReviewedJob } from '@/lib/firebase/firestore-extended';
import { getJobById } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/firebase/auth-context';
import { ActivityFeed, type ActivityItem } from '@/components/jobs/ActivityFeed';
import type { Job, PaymentMilestone } from '@/types';
import styles from './page.module.css';

const formatDate = (d: unknown): string => {
  if (!d) return '-';
  if (typeof d === 'object' && d !== null && 'toDate' in d) return (d as { toDate: () => Date }).toDate().toLocaleDateString('vi-VN');
  if (d instanceof Date) return d.toLocaleDateString('vi-VN');
  return String(d);
};

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')}₫`;

// Modal for payment confirmation
function PaymentConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  milestoneName, 
  amount 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void;
  milestoneName: string;
  amount: string;
}) {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay}>
      <Card className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Xác nhận Nghiệm thu & Thanh toán</h3>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        <div className={styles.modalBody}>
          <p>Bạn đang thực hiện nghiệm thu giai đoạn: <strong>{milestoneName}</strong></p>
          <p>Số tiền yêu cầu thanh toán: <strong className={styles.amountText}>{amount}</strong></p>
          <div className={styles.infoAlert}>
            <Zap size={16}/>
            <span>Hệ thống sẽ tự động tạo Lệnh chi và gửi thông tin đến bộ phận Kế toán.</span>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <Button variant="outline" onClick={onClose}>Hủy bỏ</Button>
          <Button onClick={onConfirm}>Xác nhận & Gửi yêu cầu</Button>
        </div>
      </Card>
    </div>
  );
}

export default function JobMasterJobDetailPage() {
  const params = useParams();
  const { userProfile } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState({ name: '', amount: '' });

  useEffect(() => {
    const fetchJob = async () => {
      if (!params.id) return;
      try {
        const result = await getJobById(params.id as string);
        setJob(result);
        // Check if already reviewed
        if (result && userProfile && (result.status === 'completed' || result.status === 'paid')) {
          const reviewed = await hasUserReviewedJob(result.id, userProfile.uid);
          setHasReviewed(reviewed);
        }
      } catch (err) {
        console.error('Error fetching job:', err);
      }
      setLoading(false);
    };
    fetchJob();
  }, [params.id, userProfile]);

  const handleApproveClick = (name: string, amount: string) => {
    setSelectedMilestone({ name, amount });
    setIsModalOpen(true);
  };

  const handleConfirmOrder = () => {
    setIsModalOpen(false);
    // In real app: call firebase function 'requestPaymentOrder'
    alert(`Yêu cầu thanh toán ${selectedMilestone.amount} đã được gửi cho Kế toán!`);
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '4rem', color: 'var(--text-secondary)' }}>
          <Loader2 size={24} className={styles.spin || ''} /> Đang tải chi tiết dự án...
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className={styles.page}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '4rem', color: 'var(--text-secondary)' }}>
          <Inbox size={24} /> Không tìm thấy dự án.
        </div>
      </div>
    );
  }

  const milestones = (job.milestones || []) as PaymentMilestone[];

  const totalProgress = job.progress ?? 0;

  // Build activity feed from milestones state
  const activities: ActivityItem[] = [];
  milestones.forEach((ms, idx) => {
    if (ms.status === 'released' || ms.status === 'paid' || ms.status === 'approved') {
      activities.push({
        id: `ms-done-${idx}`,
        type: 'milestone_approved' as const,
        title: `Nghiệm thu: ${ms.name}`,
        description: `${formatCurrency(ms.amount)} đã giải ngân`,
        actor: 'Jobmaster',
        timestamp: new Date(),
      });
    }
    if (ms.status === 'review') {
      activities.push({
        id: `ms-sub-${idx}`,
        type: 'milestone_submitted' as const,
        title: `Nộp kết quả: ${ms.name}`,
        description: 'Đang chờ review',
        actor: job.assignedWorkerName || 'Freelancer',
        timestamp: new Date(),
      });
    }
  });

  if (job.escrowStatus === 'locked' || job.escrowStatus === 'partially_released') {
    activities.unshift({
      id: 'escrow',
      type: 'escrow_locked' as const,
      title: 'Escrow đã được khoá',
      description: `${formatCurrency(job.totalFee || 0)} đã được bảo lưu`,
      actor: 'Hệ thống',
      timestamp: new Date(),
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.hLeft}>
          <Link href="/jobmaster/jobs" className={styles.backLink}>
            <ArrowLeft size={16}/> Quay lại danh sách
          </Link>
          <div className={styles.hTitleArea}>
            <h1 className={styles.title}>{job.title}</h1>
            <Badge variant="info">
              {job.status === 'in_progress' ? 'Đang thực hiện' : 
               job.status === 'completed' ? 'Hoàn thành' : 
               job.status === 'paid' ? 'Đã thanh toán' : job.status}
            </Badge>
          </div>
          <div className={styles.hMeta}>
            <span><Clock size={14}/> Bắt đầu: {formatDate(job.createdAt)}</span>
            <span><Clock size={14}/> Deadline: {formatDate(job.deadline)}</span>
          </div>
        </div>
        <div className={styles.hRight}>
           <Button variant="outline"><AlertTriangle size={16}/> Báo cáo vấn đề</Button>
           <Button><CheckCircle size={16}/> Nghiệm thu toàn bộ</Button>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.mainCol}>
          <Card className={styles.sectionCard}>
            <div className={styles.secHeader}>
              <h3 className={styles.secTitle}>Giai đoạn & Nghiệm thu (Milestones)</h3>
              <span className={styles.progressText}>Tiến độ: {totalProgress}%</span>
            </div>
            
            <div className={styles.milestoneList}>
              {milestones.map((ms, index) => {
                const isDone = ms.status === 'released' || ms.status === 'paid' || ms.status === 'approved';
                const isReview = ms.status === 'review';
                const isActive = ms.status === 'in_progress' || isReview;

                return (
                  <div key={ms.id || index} className={`${styles.milestoneItem} ${isActive ? styles.activeMilestone : ''} ${!isActive && !isDone ? styles.op50 : ''}`}>
                    <div className={styles.mStatus}>
                      {isDone ? (
                        <CheckCircle size={20} color="var(--color-success)"/>
                      ) : isActive ? (
                        <span className={styles.dot}></span>
                      ) : (
                        <span className={styles.dotEmpty}></span>
                      )}
                    </div>
                    <div className={styles.mContent}>
                      <div className={styles.mHead}>
                        <h4>{index + 1}. {ms.name} ({ms.percentage}%)</h4>
                        <span className={styles.mAmount}>{formatCurrency(ms.amount)}</span>
                      </div>
                      {ms.condition && <p className={styles.mDesc}>{ms.condition}</p>}

                      {isReview && (
                        <div className={styles.submissionBox}>
                          <h5><FileText size={14}/> Freelancer đã nộp kết quả — đang chờ duyệt</h5>
                        </div>
                      )}

                      <div className={styles.mActions}>
                        {isDone ? (
                          <Badge variant="success">Đã nghiệm thu & Thanh toán</Badge>
                        ) : isReview ? (
                          <>
                            <Button size="sm" onClick={() => handleApproveClick(ms.name, formatCurrency(ms.amount))}>
                              <CheckCircle size={14}/> Phê duyệt & Yêu cầu thanh toán
                            </Button>
                            <Button variant="outline" size="sm" className={styles.rejectBtn}>
                              <AlertTriangle size={14}/> Yêu cầu sửa đổi
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
              {milestones.length === 0 && (
                <div style={{ padding: '1rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  Chưa có giai đoạn nào được thiết lập.
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className={styles.sideCol}>
          <Card className={styles.sectionCard}>
            <h3 className={styles.secTitle}>Freelancer thực hiện</h3>
            {job.assignedTo ? (
              <div className={styles.teamList}>
                <div className={styles.teamMember}>
                  <Avatar name={job.assignedWorkerName || 'Freelancer'} size="md" />
                  <div className={styles.tmInfo}>
                    <p className={styles.tmName}>{job.assignedWorkerName || 'Freelancer'}</p>
                    <p className={styles.tmRole}>{job.category}</p>
                  </div>
                  <button className={styles.chatBtn}><MessageSquare size={16}/></button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '1rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                Chưa giao cho ai.
              </div>
            )}
          </Card>

          {milestones.length > 0 && (
            <EscrowStatus
              totalFee={job.totalFee || 0}
              milestones={milestones}
            />
          )}

          {/* Deadline Indicator */}
          {job.deadline && (() => {
            const dl = typeof job.deadline === 'object' && job.deadline !== null && 'toDate' in job.deadline
              ? (job.deadline as { toDate: () => Date }).toDate()
              : job.deadline instanceof Date ? job.deadline : new Date(job.deadline as string);
            const daysRemaining = Math.ceil((dl.getTime() - Date.now()) / 86400000);
            return (
              <Card className={styles.sectionCard}>
                <h3 className={styles.secTitle}>Thời hạn dự án</h3>
                <DeadlineIndicator daysRemaining={daysRemaining} />
              </Card>
            );
          })()}

          {activities.length > 0 && (
            <ActivityFeed
              activities={activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())}
              maxVisible={4}
            />
          )}

          {/* MutualReview — shown only when job is completed and not yet reviewed */}
          {(job.status === 'completed' || job.status === 'paid') && !hasReviewed && userProfile && (
            <MutualReviewForm
              jobTitle={job.title}
              targetUserName={job.assignedWorkerName || 'Freelancer'}
              reviewerRole="jobmaster"
              onSubmit={async (data) => {
                await submitReview({
                  jobId: job.id,
                  jobTitle: job.title,
                  reviewerId: userProfile.uid,
                  reviewerName: userProfile.displayName || 'Job Master',
                  reviewerRole: 'jobmaster',
                  revieweeId: job.assignedTo || '',
                  revieweeName: job.assignedWorkerName || 'Freelancer',
                  rating: data.rating,
                  communication: data.communication,
                  quality: data.quality,
                  timeliness: data.timeliness,
                  comment: data.comment,
                });
                setHasReviewed(true);
              }}
            />
          )}
        </div>
      </div>

      <PaymentConfirmModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        milestoneName={selectedMilestone.name}
        amount={selectedMilestone.amount}
        onConfirm={handleConfirmOrder}
      />
    </div>
  );
}
