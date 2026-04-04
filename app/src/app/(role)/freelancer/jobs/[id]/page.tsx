'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, MessageSquare, CheckCircle2, X, Loader2, Inbox, Link2, AlertTriangle, Send, RotateCcw } from 'lucide-react';
import { Button, Badge, Card, LevelBadge, Avatar } from '@/components/ui';
import { EscrowStatus } from '@/components/escrow/EscrowStatus';
import { DeadlineIndicator } from '@/components/jobs/DeadlineAlert';
import { MutualReviewForm } from '@/components/reviews/MutualReview';
import { DisputeForm } from '@/components/disputes/DisputeForm';
import { getJobById } from '@/lib/firebase/firestore';
import {
  submitReview,
  hasUserReviewedJob,
  createNotification,
  createMilestoneSubmission,
  getMilestoneSubmissions,
} from '@/lib/firebase/firestore-extended';
import { getOrCreateConversation } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/firebase/auth-context';
import type { Job, MilestoneSubmission } from '@/types';
import styles from './page.module.css';

const formatDate = (d: unknown): string => {
  if (!d) return '-';
  if (typeof d === 'object' && d !== null && 'toDate' in d) return (d as { toDate: () => Date }).toDate().toLocaleDateString('vi-VN');
  if (d instanceof Date) return d.toLocaleDateString('vi-VN');
  return String(d);
};

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')}₫`;

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

export default function FreelancerJobDetail() {
  const params = useParams();
  const { userProfile } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submittingMilestone, setSubmittingMilestone] = useState<string | null>(null);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [submitNote, setSubmitNote] = useState('');
  const [submitLinks, setSubmitLinks] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);

  // Submissions state — keyed by milestoneId
  const [submissions, setSubmissions] = useState<Record<string, MilestoneSubmission>>({});

  useEffect(() => {
    const fetchJob = async () => {
      if (!params.id) return;
      const result = await getJobById(params.id as string);
      setJob(result);
      setLoading(false);
      if (result && (result.status === 'completed' || result.status === 'paid') && result.assignedTo) {
        const reviewed = await hasUserReviewedJob(result.id, result.assignedTo);
        setHasReviewed(reviewed);
      }
      // Fetch latest submissions for each milestone
      if (result && result.milestones && result.milestones.length > 0) {
        try {
          const allSubs = await getMilestoneSubmissions(result.id);
          // Build map: milestoneId → latest submission
          const subMap: Record<string, MilestoneSubmission> = {};
          for (const sub of allSubs) {
            if (!subMap[sub.milestoneId]) {
              subMap[sub.milestoneId] = sub;
            }
          }
          setSubmissions(subMap);
        } catch {
          // Non-critical
        }
      }
    };
    fetchJob().catch(() => setLoading(false));
  }, [params.id]);

  const handleSubmitClick = (milestoneId: string) => {
    setSubmittingMilestone(milestoneId);
    setSubmitNote('');
    setSubmitLinks(['']);
    setIsSubmitModalOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!submittingMilestone || !job || !userProfile || submitting) return;
    setSubmitting(true);
    try {
      const validLinks = submitLinks.filter(l => l.trim() !== '');
      const msData = (job.milestones || []).find(m => m.id === submittingMilestone);

      // Create submission in subcollection (NOT updating job doc)
      const subId = await createMilestoneSubmission({
        milestoneId: submittingMilestone,
        milestoneName: msData?.name || 'Giai đoạn',
        jobId: job.id,
        freelancerId: userProfile.uid,
        freelancerName: userProfile.displayName || 'Freelancer',
        note: submitNote,
        links: validLinks,
      });

      // Update local submissions state
      if (subId) {
        setSubmissions(prev => ({
          ...prev,
          [submittingMilestone]: {
            id: subId,
            milestoneId: submittingMilestone,
            milestoneName: msData?.name || 'Giai đoạn',
            jobId: job.id,
            freelancerId: userProfile.uid,
            freelancerName: userProfile.displayName || 'Freelancer',
            note: submitNote,
            links: validLinks,
            status: 'pending_review',
            submittedAt: new Date(),
          },
        }));
      }

      setIsSubmitModalOpen(false);

      // Notify jobmaster
      if (job.jobMaster) {
        createNotification({
          recipientId: job.jobMaster,
          type: 'milestone_reached',
          title: `Freelancer nộp kết quả: ${msData?.name || 'Giai đoạn'}`,
          body: `${userProfile.displayName || 'Freelancer'} đã nộp kết quả cho dự án "${job.title}". Vui lòng xem xét và nghiệm thu.`,
          link: `/jobmaster/jobs/${job.id}`,
          read: false,
        }).catch(() => {});
      }

      alert('Báo cáo đã được gửi đến Job Master để xem xét!');
    } catch (err) {
      console.error('Error submitting milestone:', err);
      alert('Có lỗi xảy ra: ' + (err instanceof Error ? err.message : 'Vui lòng thử lại.'));
    }
    setSubmitting(false);
  };


  // Navigate to chat with jobmaster
  const handleOpenChat = async () => {
    if (!userProfile?.uid || !job?.jobMaster) return;
    try {
      const participantNames: Record<string, string> = {
        [userProfile.uid]: userProfile.displayName || 'Freelancer',
        [job.jobMaster]: job.jobMasterName || 'Job Master',
      };
      const convId = await getOrCreateConversation(
        [userProfile.uid, job.jobMaster],
        job.id,
        { participantNames, jobTitle: job.title }
      );
      if (convId) {
        window.location.href = `/freelancer/chat?conv=${convId}`;
      }
    } catch {
      alert('Không thể mở hội thoại. Vui lòng thử lại.');
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}><Loader2 size={24} className={styles.spin} /> Đang tải chi tiết dự án...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}><Inbox size={24} /> Không tìm thấy dự án.</div>
      </div>
    );
  }

  const milestones = (job.milestones || []) as Array<{
    id: string; name: string; percentage: number; amount: number; status: string;
  }>;

  const deliverables = ((job.attachments || []) as unknown as Array<{
    id: string; name: string; date: string; status: string;
  }>);

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/freelancer/jobs" className={styles.backLink}>
          <ArrowLeft size={16} /> Quay lại danh sách
        </Link>
      </div>

      <div className={styles.layout}>
        <motion.div className={styles.main} initial="hidden" animate="visible" variants={fadeUp}>
          <Card className={styles.headerCard}>
            <div className={styles.tags}>
              <Badge variant="outline">{job.category}</Badge>
              <LevelBadge level={job.level} />
              <Badge variant="info">{job.status === 'in_progress' ? 'Đang thực hiện' : job.status}</Badge>
            </div>
            <h1 className={styles.title}>{job.title}</h1>
            <div className={styles.meta}>
              <span className={styles.mItem}><Clock size={16}/> Hạn cuối: <strong>{formatDate(job.deadline)}</strong></span>
              <span className={styles.mItem}>Ngân sách: <strong className={styles.fee}>{formatCurrency(job.totalFee || 0)}</strong></span>
            </div>
          </Card>

          <Card className={styles.progressCard}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Tiến độ tổng thể ({job.progress ?? 0}%)</h3>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Tự động cập nhật theo milestone</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${job.progress ?? 0}%` }} />
            </div>
          </Card>

          <Card className={styles.tasksCard}>
            <h3 className={styles.sectionTitle}>Giai đoạn & Thanh toán</h3>
            <div className={styles.milestones}>
              {milestones.map((ms, index) => {
                const latestSub = submissions[ms.id];
                const hasPendingSub = latestSub?.status === 'pending_review';
                const hasRejectedSub = latestSub?.status === 'rejected';
                const hasApprovedSub = latestSub?.status === 'approved';

                return (
                  <div key={ms.id || index} className={`${styles.milestone} ${ms.status === 'in_progress' ? styles.mActive : ''} ${ms.status === 'review' ? styles.mReview : ''}`}>
                    <div className={styles.mLeft}>
                      <div className={styles.mNum}>{index + 1}</div>
                      <div className={styles.mInfo}>
                        <div className={styles.mName}>{ms.name}</div>
                        <div className={styles.mSub}>{ms.percentage}% • {formatCurrency(ms.amount)}</div>
                      </div>
                    </div>
                    <div className={styles.mRight}>
                      {ms.status === 'in_progress' ? (
                        <>
                          {/* Show submission status if exists */}
                          {hasPendingSub ? (
                            <Badge variant="info"><Clock size={12}/> Đã nộp — đang chờ duyệt</Badge>
                          ) : hasRejectedSub ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                              <Badge variant="error"><AlertTriangle size={12}/> Chưa đạt</Badge>
                              <div style={{ fontSize: '12px', color: 'var(--color-error, #ef4444)', maxWidth: '280px', textAlign: 'right' }}>
                                <strong>Lý do:</strong> {latestSub.rejectionReason || 'Không rõ'}
                                {latestSub.rejectedByName && (
                                  <span style={{ color: 'var(--color-text-muted)' }}> — {latestSub.rejectedByName}</span>
                                )}
                              </div>
                              <Button size="sm" onClick={() => handleSubmitClick(ms.id)}>
                                <RotateCcw size={14}/> Nộp lại
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" onClick={() => handleSubmitClick(ms.id)}>
                              <Link2 size={14}/> Nộp kết quả
                            </Button>
                          )}
                        </>
                      ) : ms.status === 'review' ? (
                        <Badge variant="info">Đang chờ nghiệm thu</Badge>
                      ) : ms.status === 'completed' || ms.status === 'released' || ms.status === 'paid' || ms.status === 'approved' ? (
                        <Badge variant="success"><CheckCircle2 size={12}/> Hoàn thành</Badge>
                      ) : (
                        /* pending / locked / not started */
                        <Badge variant="default">Chưa bắt đầu</Badge>
                      )}
                    </div>

                    {/* Show latest submission details inline */}
                    {latestSub && (ms.status === 'in_progress' || ms.status === 'review') && (
                      <div style={{ width: '100%', marginTop: '10px', padding: '10px 12px', background: 'var(--color-surface, #f8f9fa)', borderRadius: '8px', fontSize: '13px' }}>
                        {latestSub.note && (
                          <p style={{ margin: '0 0 6px', color: 'var(--color-text-secondary)' }}>
                            <strong>Ghi chú:</strong> {latestSub.note}
                          </p>
                        )}
                        {latestSub.links.filter(Boolean).length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {latestSub.links.filter(Boolean).map((link, li) => (
                              <a key={li} href={link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', wordBreak: 'break-all' }}>
                                📎 {link}
                              </a>
                            ))}
                          </div>
                        )}
                        <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          Gửi lúc: {latestSub.submittedAt instanceof Date ? latestSub.submittedAt.toLocaleString('vi-VN') : new Date(latestSub.submittedAt).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
              {milestones.length === 0 && (
                <div className={styles.emptySmall}>Chưa có giai đoạn nào được thiết lập.</div>
              )}
            </div>
          </Card>

          <Card className={styles.filesCard}>
            <h3 className={styles.sectionTitle}>Tài liệu đã nộp</h3>
            {deliverables.map((file, i) => (
              <div key={file.id || i} className={styles.fileItem}>
                <div className={styles.fName}>{file.name}</div>
                <div className={styles.fMeta}>
                  <span>{file.date}</span>
                  <Badge size="sm" variant="outline">Đã nộp</Badge>
                </div>
              </div>
            ))}
            {deliverables.length === 0 && (
              <div className={styles.emptySmall}>Chưa có tài liệu nào được nộp.</div>
            )}
          </Card>
        </motion.div>

        <motion.div className={styles.sidebar} initial="hidden" animate="visible" variants={fadeUp}>
          <Card className={styles.contactCard}>
            <h3 className={styles.sTitle}>Job Master Quản lý</h3>
            <div className={styles.mProfile}>
              <Avatar name={job.jobMasterName || 'Job Master'} level="L3" size="md" />
              <div className={styles.mDetails}>
                <div className={styles.mName}>{job.jobMasterName || 'Chưa giao'}</div>
                <div className={styles.mRole}>Job Master</div>
              </div>
            </div>
            <Button fullWidth variant="outline" className={styles.msgBtn} onClick={handleOpenChat}>
              <MessageSquare size={16} /> Nhắn tin trao đổi
            </Button>
          </Card>

          <Card className={styles.linksCard}>
            <h3 className={styles.sTitle}>Liên kết nhanh</h3>
            <ul className={styles.quickLinks}>
              <li><Link href="/freelancer/contracts">Xem hợp đồng giao khoán</Link></li>
              <li><Link href={`/jobs/${job.id}`}>Xem lại yêu cầu gốc</Link></li>
            </ul>
          </Card>

          {/* Deadline Indicator */}
          {job.deadline && (() => {
            const dl = job.deadline instanceof Date ? job.deadline : new Date(job.deadline as string);
            const daysRemaining = Math.ceil((dl.getTime() - Date.now()) / 86400000);
            return (
              <Card className={styles.linksCard}>
                <h3 className={styles.sTitle}>Thời hạn dự án</h3>
                <DeadlineIndicator daysRemaining={daysRemaining} />
              </Card>
            );
          })()}

          {/* Escrow Status */}
          {job.milestones && job.milestones.length > 0 && (
            <EscrowStatus
              totalFee={job.totalFee || 0}
              milestones={job.milestones}
              compact
            />
          )}

          {/* Dispute Form — for in_progress or review jobs */}
          {(job.status === 'in_progress' || job.status === 'review') && userProfile && (
            showDispute ? (
              <DisputeForm
                jobId={job.id}
                jobTitle={job.title}
                initiatorId={userProfile.uid}
                initiatorName={userProfile.displayName || 'Freelancer'}
                initiatorRole="freelancer"
                respondentId={job.jobMaster}
                respondentName={job.jobMasterName || 'Job Master'}
                onSuccess={() => setShowDispute(false)}
                onCancel={() => setShowDispute(false)}
              />
            ) : (
              <Card className={styles.linksCard}>
                <Button fullWidth variant="outline" onClick={() => setShowDispute(true)} style={{ color: 'var(--color-warning)' }}>
                  Báo cáo vấn đề
                </Button>
              </Card>
            )
          )}

          {/* MutualReview for completed jobs */}
          {(job.status === 'completed' || job.status === 'paid') && !hasReviewed && (
            <MutualReviewForm
              jobTitle={job.title}
              targetUserName={job.jobMasterName || 'Job Master'}
              reviewerRole="freelancer"
              onSubmit={async (data) => {
                if (!job.assignedTo) return;
                await submitReview({
                  jobId: job.id,
                  jobTitle: job.title,
                  reviewerId: job.assignedTo,
                  reviewerName: job.assignedWorkerName || 'Freelancer',
                  reviewerRole: 'freelancer',
                  revieweeId: job.jobMaster,
                  revieweeName: job.jobMasterName || 'Job Master',
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
        </motion.div>
      </div>

      <AnimatePresence>
        {isSubmitModalOpen && (
          <div className={styles.modalOverlay}>
            <motion.div
              className={styles.modalContent}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Báo cáo hoàn thành giai đoạn</h3>
                <button onClick={() => setIsSubmitModalOpen(false)} className={styles.closeBtn}><X size={20}/></button>
              </div>
              <div className={styles.modalBody}>
                <div style={{ padding: '10px 12px', background: 'var(--color-info-bg, #eff6ff)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--color-info, #3b82f6)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <Send size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>Báo cáo sẽ được gửi đến Job Master để xem xét. Sau khi duyệt, giai đoạn sẽ được nghiệm thu và thanh toán.</span>
                </div>
                <div className={styles.formGroup}>
                  <label>Ghi chú gửi Job Master</label>
                  <textarea
                    placeholder="Mô tả tóm tắt các công việc đã hoàn thành hoặc các lưu ý đặc biệt..."
                    className={styles.textarea}
                    value={submitNote}
                    onChange={e => setSubmitNote(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Link kết quả (Google Drive, OneDrive, Dropbox...)</label>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 8px 0' }}>
                    Đăng tải file lên cloud và dán link vào đây. Có thể thêm nhiều link.
                  </p>
                  {submitLinks.map((link, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        type="url"
                        className={styles.linkInput}
                        placeholder="https://drive.google.com/... hoặc link cloud khác"
                        value={link}
                        onChange={e => {
                          const updated = [...submitLinks];
                          updated[idx] = e.target.value;
                          setSubmitLinks(updated);
                        }}
                      />
                      {submitLinks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setSubmitLinks(submitLinks.filter((_, i) => i !== idx))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error, #ef4444)', padding: '4px' }}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSubmitLinks([...submitLinks, ''])}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '13px', fontWeight: 600, padding: '4px 0' }}
                  >
                    + Thêm link
                  </button>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <Button variant="outline" onClick={() => setIsSubmitModalOpen(false)}>Hủy bỏ</Button>
                <Button onClick={handleConfirmSubmit} disabled={submitting}>
                  {submitting ? 'Đang gửi...' : 'Xác nhận & Gửi báo cáo'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
