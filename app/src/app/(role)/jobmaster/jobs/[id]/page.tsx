'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Clock, FileText, CheckCircle, MessageSquare, AlertTriangle, Zap, X, Loader2, Inbox, Pencil, Save, Send, ImageIcon, BarChart3, Mail, UserPlus, Star } from 'lucide-react';
import { Button, Card, Badge, Avatar } from '@/components/ui';
import { ChatPanel } from '@/components/chat';
import { EscrowStatus } from '@/components/escrow/EscrowStatus';
import { DeadlineIndicator } from '@/components/jobs/DeadlineAlert';
import { MutualReviewForm } from '@/components/reviews/MutualReview';
import {
  submitReview,
  hasUserReviewedJob,
  approveMilestoneAndPay,
  rejectMilestone,
  approveAllMilestones,
  getMilestoneSubmissions,
  reviewMilestoneSubmission,
  createNotification,
  sendJobInvitation,
} from '@/lib/firebase/firestore-extended';
import { getJobById, updateJob, getOrCreateConversation } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/firebase/auth-context';
import { ActivityFeed, type ActivityItem } from '@/components/jobs/ActivityFeed';
import { DisputeForm } from '@/components/disputes/DisputeForm';
import { formatFriendlyMoney, formatCurrencyInput, parseCurrencyInput } from '@/lib/formatters';
import type { Job, PaymentMilestone, MilestoneSubmission } from '@/types';
import styles from './page.module.css';

const formatDate = (d: unknown): string => {
  if (!d) return '-';
  if (typeof d === 'object' && d !== null && 'toDate' in d) return (d as { toDate: () => Date }).toDate().toLocaleDateString('vi-VN');
  if (d instanceof Date) return d.toLocaleDateString('vi-VN');
  return String(d);
};

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')}₫`;

const STATUS_LABELS: Record<string, { label: string; variant: string }> = {
  draft: { label: 'Nháp', variant: 'default' },
  pending_approval: { label: 'Chờ Admin duyệt', variant: 'warning' },
  open: { label: 'Đang tuyển', variant: 'info' },
  assigned: { label: 'Đã giao', variant: 'accent' },
  in_progress: { label: 'Đang thực hiện', variant: 'info' },
  review: { label: 'Đang nghiệm thu', variant: 'accent' },
  completed: { label: 'Hoàn thành', variant: 'success' },
  paid: { label: 'Đã thanh toán', variant: 'success' },
  cancelled: { label: 'Đã hủy', variant: 'error' },
};

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

// Modal for rejection reason
function RejectReasonModal({
  isOpen,
  onClose,
  onConfirm,
  milestoneName,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  milestoneName: string;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay}>
      <Card className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Yêu cầu sửa đổi giai đoạn</h3>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        <div className={styles.modalBody}>
          <p>Giai đoạn: <strong>{milestoneName}</strong></p>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Vui lòng nhập lý do để freelancer biết cần sửa đổi gì. Thông tin này sẽ được gửi kèm thông báo đến freelancer.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>Lý do chưa đạt</label>
            <textarea
              placeholder="VD: File AutoCAD thiếu layer MEP, cần bổ sung mặt bằng tầng 3..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={4}
              style={{
                padding: '10px 12px', fontSize: '14px', lineHeight: 1.6, fontFamily: 'inherit',
                border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                background: 'var(--color-bg)', color: 'var(--color-charcoal)', resize: 'vertical',
              }}
            />
          </div>
        </div>
        <div className={styles.modalFooter}>
          <Button variant="outline" onClick={onClose}>Hủy bỏ</Button>
          <Button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim() || loading}
            style={{ color: 'white', background: 'var(--color-error, #ef4444)' }}
          >
            <AlertTriangle size={14}/> {loading ? 'Đang gửi...' : 'Gửi yêu cầu sửa đổi'}
          </Button>
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
  const [selectedMilestone, setSelectedMilestone] = useState({ id: '', name: '', amount: '', numericAmount: 0 });
  const [showDispute, setShowDispute] = useState(false);
  const [approving, setApproving] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [now] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<'info' | 'progress' | 'chat' | 'review'>('info');
  const [chatConvId, setChatConvId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  // Submissions from subcollection
  const [allSubmissions, setAllSubmissions] = useState<MilestoneSubmission[]>([]);
  // Rejection modal
  const [rejectModal, setRejectModal] = useState<{ open: boolean; ms: PaymentMilestone | null; sub: MilestoneSubmission | null }>({ open: false, ms: null, sub: null });
  const [rejecting, setRejecting] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTotalFee, setEditTotalFee] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editProjectScale, setEditProjectScale] = useState('');
  const [editProjectImages, setEditProjectImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteFreelancerId, setInviteFreelancerId] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteSending, setInviteSending] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      if (!params.id) return;
      try {
        const result = await getJobById(params.id as string);
        setJob(result);
        if (result && userProfile && (result.status === 'completed' || result.status === 'paid')) {
          const reviewed = await hasUserReviewedJob(result.id, userProfile.uid);
          setHasReviewed(reviewed);
        }
        // Fetch submissions
        if (result) {
          const subs = await getMilestoneSubmissions(result.id);
          setAllSubmissions(subs);
        }
      } catch (err) {
        console.error('Error fetching job:', err);
      }
      setLoading(false);
    };
    fetchJob();
  }, [params.id, userProfile]);

  // Initialize chat conversation when Chat tab is opened
  const initChat = useCallback(async () => {
    if (chatConvId || chatLoading || !job || !userProfile || !job.assignedTo) return;
    setChatLoading(true);
    try {
      const participantNames: Record<string, string> = {
        [userProfile.uid]: userProfile.displayName || 'Job Master',
        [job.assignedTo]: job.assignedWorkerName || 'Freelancer',
      };
      const convId = await getOrCreateConversation(
        [userProfile.uid, job.assignedTo],
        job.id,
        { participantNames, jobTitle: job.title }
      );
      setChatConvId(convId);
    } catch (err) {
      console.error('Failed to init chat:', err);
    }
    setChatLoading(false);
  }, [chatConvId, chatLoading, job, userProfile]);

  // Get latest submission for a milestone
  const getLatestSubForMilestone = (milestoneId: string): MilestoneSubmission | null => {
    return allSubmissions.find(s => s.milestoneId === milestoneId) || null;
  };

  // Get pending submissions for a milestone
  const getPendingSubForMilestone = (milestoneId: string): MilestoneSubmission | null => {
    return allSubmissions.find(s => s.milestoneId === milestoneId && s.status === 'pending_review') || null;
  };

  const startEditing = () => {
    if (!job) return;
    setEditTitle(job.title);
    setEditDescription(job.description || '');
    setEditTotalFee(formatCurrencyInput(String(job.totalFee || 0)));
    setEditDuration(String(job.duration || ''));
    setEditProjectScale(job.projectScale || '');
    setEditProjectImages(job.projectImages || []);
    setNewImageUrl('');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveEdits = async () => {
    if (!job || !userProfile) return;
    setEditSaving(true);
    try {
      await updateJob(job.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        totalFee: parseCurrencyInput(editTotalFee),
        duration: Number(editDuration),
        projectScale: editProjectScale.trim() || undefined,
        projectImages: editProjectImages.length > 0 ? editProjectImages : undefined,
      } as Partial<Job>, {
        uid: userProfile.uid,
        name: userProfile.displayName || 'Job Master',
        role: 'jobmaster',
      });
      const updated = await getJobById(job.id);
      setJob(updated);
      setIsEditing(false);
      alert('✅ Đã cập nhật thành công!');
    } catch (err) {
      console.error('Save failed:', err);
      alert('❌ Không thể lưu. Vui lòng thử lại.');
    }
    setEditSaving(false);
  };

  // Step 1: Accept submission → milestone goes to 'review' status
  const handleAcceptSubmission = async (ms: PaymentMilestone, sub: MilestoneSubmission) => {
    if (!job || !userProfile || !sub.id) return;
    try {
      await reviewMilestoneSubmission({
        jobId: job.id,
        submissionId: sub.id,
        milestoneId: ms.id,
        decision: 'approved',
        reviewerId: userProfile.uid,
        reviewerName: userProfile.displayName || 'Job Master',
      });
      // Refresh
      const [updatedJob, updatedSubs] = await Promise.all([
        getJobById(job.id),
        getMilestoneSubmissions(job.id),
      ]);
      setJob(updatedJob);
      setAllSubmissions(updatedSubs);
    } catch (err) {
      console.error('Accept submission failed:', err);
      alert('❌ Lỗi khi duyệt submission.');
    }
  };

  // Step 2: Approve milestone → create payment (existing flow)
  const handleApproveClick = (ms: PaymentMilestone) => {
    setSelectedMilestone({ id: ms.id, name: ms.name, amount: formatCurrency(ms.amount), numericAmount: ms.amount });
    setIsModalOpen(true);
  };

  const handleConfirmOrder = async () => {
    if (!job || !userProfile || approving) return;
    setApproving(true);
    try {
      const result = await approveMilestoneAndPay({
        jobId: job.id,
        milestoneId: selectedMilestone.id,
        jobTitle: job.title,
        milestoneName: selectedMilestone.name,
        milestoneAmount: selectedMilestone.numericAmount,
        workerId: job.assignedTo || '',
        workerName: job.assignedWorkerName || 'Freelancer',
        jobMasterId: userProfile.uid,
        jobMasterName: userProfile.displayName || 'Job Master',
      });
      const updated = await getJobById(job.id);
      setJob(updated);
      setIsModalOpen(false);
      if (result.allDone) {
        alert('✅ Toàn bộ dự án đã được nghiệm thu! Lệnh chi đã gửi cho Kế toán.');
      } else {
        alert('✅ Đã phê duyệt giai đoạn và gửi lệnh chi cho Kế toán.');
      }
    } catch (err) {
      console.error('Approve failed:', err);
      alert('❌ Lỗi: ' + (err instanceof Error ? err.message : 'Vui lòng thử lại.'));
    }
    setApproving(false);
  };

  // Reject submission with reason
  const handleOpenRejectModal = (ms: PaymentMilestone, sub: MilestoneSubmission) => {
    setRejectModal({ open: true, ms, sub });
  };

  const handleConfirmReject = async (reason: string) => {
    if (!job || !userProfile || !rejectModal.ms || !rejectModal.sub?.id) return;
    setRejecting(true);
    try {
      await reviewMilestoneSubmission({
        jobId: job.id,
        submissionId: rejectModal.sub.id,
        milestoneId: rejectModal.ms.id,
        decision: 'rejected',
        rejectionReason: reason,
        reviewerId: userProfile.uid,
        reviewerName: userProfile.displayName || 'Job Master',
      });
      // Notify freelancer with rejection reason
      if (job.assignedTo) {
        createNotification({
          recipientId: job.assignedTo,
          type: 'milestone_reached',
          title: `Yêu cầu sửa đổi: ${rejectModal.ms.name}`,
          body: `JM ${userProfile.displayName || 'Job Master'} yêu cầu sửa đổi giai đoạn này. Lý do: ${reason}`,
          link: `/freelancer/jobs/${job.id}`,
          read: false,
        }).catch(() => {});
      }
      // Refresh
      const updatedSubs = await getMilestoneSubmissions(job.id);
      setAllSubmissions(updatedSubs);
      setRejectModal({ open: false, ms: null, sub: null });
      alert('✅ Đã gửi yêu cầu sửa đổi cho freelancer.');
    } catch (err) {
      console.error('Reject failed:', err);
      alert('❌ Lỗi khi yêu cầu sửa đổi.');
    }
    setRejecting(false);
  };

  const handleBulkApprove = async () => {
    if (!job || !userProfile || bulkApproving) return;
    if (!confirm('Xác nhận nghiệm thu và tạo lệnh chi cho TẤT CẢ các giai đoạn còn lại?')) return;
    setBulkApproving(true);
    try {
      await approveAllMilestones({
        jobId: job.id,
        jobTitle: job.title,
        workerId: job.assignedTo || '',
        workerName: job.assignedWorkerName || 'Freelancer',
        jobMasterId: userProfile.uid,
        jobMasterName: userProfile.displayName || 'Job Master',
      });
      const updated = await getJobById(job.id);
      setJob(updated);
      alert('✅ Toàn bộ dự án đã được nghiệm thu! Lệnh chi đã gửi cho Kế toán.');
    } catch (err) {
      console.error('Bulk approve failed:', err);
      alert('❌ Lỗi: ' + (err instanceof Error ? err.message : 'Vui lòng thử lại.'));
    }
    setBulkApproving(false);
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
  const canEdit = job.status === 'draft' || job.status === 'pending_approval';
  const isActiveJob = job.status === 'in_progress' || job.status === 'review' || job.status === 'assigned';
  const statusInfo = STATUS_LABELS[job.status] || { label: job.status, variant: 'default' };

  // Check if there are any pending submissions
  const hasPendingSubmissions = allSubmissions.some(s => s.status === 'pending_review');

  // Build activity feed from milestones state + submissions
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
        description: 'Đang chờ nghiệm thu & thanh toán',
        actor: job.assignedWorkerName || 'Freelancer',
        timestamp: new Date(),
      });
    }
  });

  // Add pending submissions to activities
  allSubmissions.filter(s => s.status === 'pending_review').forEach(sub => {
    activities.push({
      id: `sub-${sub.id}`,
      type: 'milestone_submitted' as const,
      title: `Nộp báo cáo: ${sub.milestoneName}`,
      description: 'Đang chờ bạn xem xét',
      actor: sub.freelancerName,
      timestamp: sub.submittedAt instanceof Date ? sub.submittedAt : new Date(sub.submittedAt),
    });
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
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className={styles.editTitleInput}
              />
            ) : (
              <h1 className={styles.title}>{job.title}</h1>
            )}
            {/* @ts-expect-error dynamic badge variant */}
            <Badge variant={statusInfo.variant}>
              {statusInfo.label}
            </Badge>
            {hasPendingSubmissions && (
              <Badge variant="warning">Có báo cáo chờ duyệt</Badge>
            )}
          </div>
          <div className={styles.hMeta}>
            <span><Clock size={14}/> Tạo: {formatDate(job.createdAt)}</span>
            <span><Clock size={14}/> Deadline: {formatDate(job.deadline)}</span>
          </div>
        </div>
        <div className={styles.hRight}>
          {canEdit && !isEditing && (
            <Button variant="outline" onClick={startEditing}>
              <Pencil size={16}/> Chỉnh sửa
            </Button>
          )}
          {canEdit && isEditing && (
            <>
              <Button variant="outline" onClick={cancelEditing} disabled={editSaving}>
                Hủy
              </Button>
              <Button onClick={saveEdits} disabled={editSaving}>
                <Save size={16}/> {editSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </>
          )}
          {isActiveJob && (
            <>
              <Button variant="outline" onClick={() => setShowDispute(!showDispute)}>
                <AlertTriangle size={16}/> Báo cáo vấn đề
              </Button>
              <Button onClick={handleBulkApprove} disabled={bulkApproving}>
                <CheckCircle size={16}/> {bulkApproving ? 'Đang xử lý...' : 'Nghiệm thu toàn bộ'}
              </Button>
            </>
          )}
          {job.status === 'open' && (
            <Button variant="outline" onClick={() => setShowInviteModal(true)}>
              <UserPlus size={16}/> Mời Freelancer
            </Button>
          )}
        </div>
      </div>

      {/* Dispute Form */}
      {showDispute && userProfile && isActiveJob && (
        <DisputeForm
          jobId={job.id}
          jobTitle={job.title}
          initiatorId={userProfile.uid}
          initiatorName={userProfile.displayName || 'Job Master'}
          initiatorRole="jobmaster"
          respondentId={job.assignedTo || ''}
          respondentName={job.assignedWorkerName || 'Freelancer'}
          onSuccess={() => setShowDispute(false)}
          onCancel={() => setShowDispute(false)}
        />
      )}

      {/* Tab Navigation */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'info' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <FileText size={16}/> Thông tin
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'progress' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          <BarChart3 size={16}/> Tiến độ
          {hasPendingSubmissions && <span className={styles.tabBadge}>!</span>}
        </button>
        {isActiveJob && job.assignedTo && (
          <button
            className={`${styles.tabBtn} ${activeTab === 'chat' ? styles.tabActive : ''}`}
            onClick={() => { setActiveTab('chat'); initChat(); }}
          >
            <MessageSquare size={16}/> Chat
          </button>
        )}
        {(job.status === 'completed' || job.status === 'paid') && (
          <button
            className={`${styles.tabBtn} ${activeTab === 'review' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('review')}
          >
            <Star size={16}/> Đánh giá
            {!hasReviewed && <span className={styles.tabBadge}>!</span>}
          </button>
        )}
      </div>

      {/* TAB: Thông tin */}
      {activeTab === 'info' && (
      <div className={styles.grid}>
        <div className={styles.mainCol}>
          {/* Pending/Draft Status Info Card */}
          {canEdit && !isEditing && (
            <Card className={styles.statusInfoCard}>
              <div className={styles.statusInfoContent}>
                <div className={styles.statusIcon}>
                  {job.status === 'pending_approval' ? <Send size={24}/> : <FileText size={24}/>}
                </div>
                <div>
                  <h3 className={styles.statusInfoTitle}>
                    {job.status === 'pending_approval' 
                      ? 'Đang chờ Admin duyệt' 
                      : 'Bản nháp — Chưa gửi duyệt'}
                  </h3>
                  <p className={styles.statusInfoDesc}>
                    {job.status === 'pending_approval' 
                      ? 'Bài đăng đã được gửi và đang chờ Admin xem xét phê duyệt. Bạn có thể chỉnh sửa trong khi chờ duyệt.'
                      : 'Bài đăng chưa được gửi duyệt. Hãy hoàn thiện thông tin và nhấn "Đăng công việc" để gửi duyệt.'}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Edit mode */}
          {isEditing && (
            <Card className={styles.sectionCard}>
              <h3 className={styles.secTitle}>Chỉnh sửa thông tin</h3>
              <div className={styles.editForm}>
                <div className={styles.editField}>
                  <label>Mô tả công việc</label>
                  <textarea
                    rows={8}
                    className={styles.editTextarea}
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                  />
                </div>
                <div className={styles.editRow}>
                  <div className={styles.editField}>
                    <label>Tổng ngân sách (VND)</label>
                    <input
                      type="text"
                      className={styles.editInput}
                      value={editTotalFee}
                      onChange={e => setEditTotalFee(formatCurrencyInput(e.target.value))}
                    />
                  </div>
                  <div className={styles.editField}>
                    <label>Thời gian (ngày)</label>
                    <input
                      type="number"
                      className={styles.editInput}
                      value={editDuration}
                      onChange={e => setEditDuration(e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.editField}>
                  <label>Quy mô dự án</label>
                  <textarea
                    rows={3}
                    className={styles.editTextarea}
                    value={editProjectScale}
                    onChange={e => setEditProjectScale(e.target.value)}
                    placeholder="VD: 8 tầng, 3000m² sàn, khoảng 50 căn hộ..."
                  />
                </div>
                <div className={styles.editField}>
                  <label>Hình ảnh công trình <span style={{fontSize:'12px',fontWeight:400,color:'var(--color-text-muted)'}}>URL trực tiếp</span></label>
                  {editProjectImages.length > 0 && (
                    <div className={styles.imageGallery}>
                      {editProjectImages.map((url, i) => (
                        <div key={i} className={styles.galleryItem}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`Project ${i + 1}`} className={styles.galleryImg} />
                          <button className={styles.removeImgBtn} onClick={() => setEditProjectImages(prev => prev.filter((_, idx) => idx !== i))}><X size={14}/></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className={styles.addImageRow}>
                    <input
                      type="url"
                      className={styles.editInput}
                      value={newImageUrl}
                      onChange={e => setNewImageUrl(e.target.value)}
                      placeholder="https://i.ibb.co/xxx/image.jpg"
                    />
                    <Button variant="outline" size="sm" onClick={() => { if (newImageUrl.trim()) { setEditProjectImages(p => [...p, newImageUrl.trim()]); setNewImageUrl(''); }}} disabled={!newImageUrl.trim()}>
                      <ImageIcon size={14}/> Thêm
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Job Description (read only) */}
          {!isEditing && (
            <Card className={styles.sectionCard}>
              <h3 className={styles.secTitle}>Mô tả công việc</h3>
              <p className={styles.descText}>{job.description || 'Chưa có mô tả.'}</p>
              <div className={styles.jobInfoGrid}>
                <div className={styles.jobInfoItem}>
                  <span className={styles.jobInfoLabel}>Lĩnh vực</span>
                  <strong>{job.category}</strong>
                </div>
                <div className={styles.jobInfoItem}>
                  <span className={styles.jobInfoLabel}>Cấp độ</span>
                  <strong>{job.level}</strong>
                </div>
                <div className={styles.jobInfoItem}>
                  <span className={styles.jobInfoLabel}>Ngân sách</span>
                  <strong>{formatFriendlyMoney(job.totalFee)}</strong>
                </div>
                <div className={styles.jobInfoItem}>
                  <span className={styles.jobInfoLabel}>Thời gian</span>
                  <strong>{job.duration} ngày</strong>
                </div>
              </div>
            </Card>
          )}

          {/* Project Scale & Images */}
          {!isEditing && job.projectScale && (
            <Card className={styles.sectionCard}>
              <h3 className={styles.secTitle}>📐 Quy mô dự án</h3>
              <p className={styles.descText}>{job.projectScale}</p>
            </Card>
          )}
          {!isEditing && job.projectImages && job.projectImages.length > 0 && (
            <Card className={styles.sectionCard}>
              <h3 className={styles.secTitle}>🏗️ Hình ảnh công trình</h3>
              <div className={styles.imageGallery}>
                {job.projectImages.map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className={styles.galleryItemLarge}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Project ${i + 1}`} className={styles.galleryImg} />
                  </a>
                ))}
              </div>
            </Card>
          )}



        </div>

        <div className={styles.sideCol}>
          {/* Freelancer Info */}
          {job.assignedTo && (
            <Card className={styles.sectionCard}>
              <h3 className={styles.secTitle}>Freelancer thực hiện</h3>
              <div className={styles.teamList}>
                <div className={styles.teamMember}>
                  <Avatar name={job.assignedWorkerName || 'Freelancer'} size="md" />
                  <div className={styles.tmInfo}>
                    <p className={styles.tmName}>{job.assignedWorkerName || 'Freelancer'}</p>
                    <p className={styles.tmRole}>{job.category}</p>
                  </div>
                  <button className={styles.chatBtn} onClick={() => { setActiveTab('chat'); initChat(); }}><MessageSquare size={16}/></button>
                </div>
              </div>
            </Card>
          )}



          {/* Deadline Indicator */}
          {job.deadline && (() => {
            const dl = typeof job.deadline === 'object' && job.deadline !== null && 'toDate' in job.deadline
              ? (job.deadline as { toDate: () => Date }).toDate()
              : job.deadline instanceof Date ? job.deadline : new Date(job.deadline as string);
            const daysRemaining = Math.ceil((dl.getTime() - now) / 86400000);
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

          {/* Job summary for draft/pending */}
          {canEdit && (
            <Card className={styles.sectionCard}>
              <h3 className={styles.secTitle}>Tóm tắt</h3>
              <div className={styles.summaryList}>
                <div className={styles.summaryItem}>
                  <span>Trạng thái</span>
                  {/* @ts-expect-error dynamic badge variant */}
                  <Badge variant={statusInfo.variant} size="sm">{statusInfo.label}</Badge>
                </div>
                <div className={styles.summaryItem}>
                  <span>Lĩnh vực</span>
                  <strong>{job.category || '-'}</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span>Cấp độ</span>
                  <strong>{job.level || '-'}</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span>Ngân sách</span>
                  <strong>{formatFriendlyMoney(job.totalFee)}</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span>Thời gian</span>
                  <strong>{job.duration || 0} ngày</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span>Milestones</span>
                  <strong>{milestones.length} giai đoạn</strong>
                </div>
              </div>
            </Card>
          )}


        </div>
      </div>
      )}

      {/* TAB: Tiến độ */}
      {activeTab === 'progress' && (
        <div className={styles.grid}>
          <div className={styles.mainCol}>
            <Card className={styles.sectionCard}>
              <div className={styles.secHeader}>
                <h3 className={styles.secTitle}>Giai đoạn & Nghiệm thu (Milestones)</h3>
                <span className={styles.progressText}>Tiến độ: {totalProgress}%</span>
              </div>
              <div style={{ marginBottom: 'var(--space-5)' }}>
                <div style={{ height: '8px', borderRadius: '4px', background: 'var(--color-bg)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${totalProgress}%`, borderRadius: '4px', background: 'linear-gradient(90deg, var(--color-primary), var(--color-success))', transition: 'width 0.4s ease' }} />
                </div>
              </div>
              <div className={styles.milestoneList}>
                {milestones.map((ms, index) => {
                  const isDone = ms.status === 'released' || ms.status === 'paid' || ms.status === 'approved';
                  const isReview = ms.status === 'review';
                  const isInProgress = ms.status === 'in_progress';
                  const isActive = isInProgress || isReview;
                  const pendingSub = getPendingSubForMilestone(ms.id);
                  const latestSub = getLatestSubForMilestone(ms.id);

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

                        {/* Pending submission from freelancer */}
                        {isInProgress && pendingSub && (
                          <div className={styles.submissionBox} style={{ borderColor: 'var(--color-warning)', background: 'rgba(244, 157, 37, 0.05)' }}>
                            <h5><FileText size={14}/> 📋 Freelancer đã nộp báo cáo — chờ bạn xem xét</h5>
                            {pendingSub.note && (
                              <p className={styles.mDesc} style={{ marginTop: '0.5rem' }}>
                                <strong>Ghi chú:</strong> {pendingSub.note}
                              </p>
                            )}
                            {pendingSub.links.filter(Boolean).length > 0 && (
                              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <strong style={{ fontSize: '13px' }}>Link kết quả:</strong>
                                {pendingSub.links.filter(Boolean).map((link, li) => (
                                  <a key={li} href={link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: 'var(--color-primary)', wordBreak: 'break-all' }}>
                                    📎 {link}
                                  </a>
                                ))}
                              </div>
                            )}
                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                              Gửi lúc: {pendingSub.submittedAt instanceof Date ? pendingSub.submittedAt.toLocaleString('vi-VN') : new Date(pendingSub.submittedAt).toLocaleString('vi-VN')}
                            </p>
                            <div className={styles.mActions} style={{ marginTop: '12px' }}>
                              <Button size="sm" onClick={() => handleAcceptSubmission(ms, pendingSub)}>
                                <CheckCircle size={14}/> Chấp nhận báo cáo
                              </Button>
                              <Button variant="outline" size="sm" className={styles.rejectBtn} onClick={() => handleOpenRejectModal(ms, pendingSub)}>
                                <AlertTriangle size={14}/> Yêu cầu sửa đổi
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Milestone in review — ready for payment */}
                        {isReview && (
                          <div className={styles.submissionBox}>
                            <h5><FileText size={14}/> Báo cáo đã được chấp nhận — sẵn sàng nghiệm thu</h5>
                            {latestSub && latestSub.note && (
                              <p className={styles.mDesc} style={{ marginTop: '0.5rem' }}>
                                <strong>Ghi chú:</strong> {latestSub.note}
                              </p>
                            )}
                            {latestSub && latestSub.links.filter(Boolean).length > 0 && (
                              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <strong style={{ fontSize: '13px' }}>Link kết quả:</strong>
                                {latestSub.links.filter(Boolean).map((link, li) => (
                                  <a key={li} href={link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: 'var(--color-primary)', wordBreak: 'break-all' }}>
                                    📎 {link}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className={styles.mActions}>
                          {isDone ? (
                            <Badge variant="success">Đã nghiệm thu & Thanh toán</Badge>
                          ) : isReview ? (
                            <Button size="sm" onClick={() => handleApproveClick(ms)}>
                              <CheckCircle size={14}/> Phê duyệt & Yêu cầu thanh toán
                            </Button>
                          ) : isInProgress && !pendingSub ? (
                            <Badge variant="default">Freelancer đang thực hiện</Badge>
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
            {/* Escrow Status */}
            {milestones.length > 0 && (
              <EscrowStatus totalFee={job.totalFee || 0} milestones={milestones} />
            )}
            {activities.length > 0 && (
              <ActivityFeed
                activities={activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())}
                maxVisible={6}
              />
            )}
          </div>
        </div>
      )}

      {/* TAB: Chat */}
      {activeTab === 'chat' && isActiveJob && job.assignedTo && (
        <div className={styles.chatTabContainer}>
          {chatLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '3rem', color: 'var(--color-text-muted)' }}>
              <Loader2 size={20} className={styles.spin} /> Đang kết nối...
            </div>
          ) : chatConvId ? (
            <ChatPanel
              conversationId={chatConvId}
              participantName={job.assignedWorkerName || 'Freelancer'}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '3rem', color: 'var(--color-text-muted)' }}>
              <MessageSquare size={20} /> Không thể kết nối chat. Vui lòng thử lại.
            </div>
          )}
        </div>
      )}

      {/* TAB: Đánh giá */}
      {activeTab === 'review' && (job.status === 'completed' || job.status === 'paid') && (
        <div className={styles.grid}>
          <div className={styles.mainCol}>
            {hasReviewed ? (
              <Card className={styles.sectionCard}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '2rem 1rem', textAlign: 'center' }}>
                  <CheckCircle size={48} style={{ color: 'var(--color-success)' }} />
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>Bạn đã đánh giá freelancer</h3>
                  <p style={{ fontSize: 14, color: 'var(--color-text-muted)', maxWidth: 400 }}>
                    Cảm ơn bạn đã gửi đánh giá. Điểm số sẽ được cập nhật vào hồ sơ của freelancer.
                  </p>
                </div>
              </Card>
            ) : userProfile ? (
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
            ) : null}
          </div>
          <div className={styles.sideCol}>
            <Card className={styles.sectionCard}>
              <h3 className={styles.secTitle}>Thông tin dự án</h3>
              <div className={styles.summaryList}>
                <div className={styles.summaryItem}>
                  <span>Freelancer</span>
                  <strong>{job.assignedWorkerName || '-'}</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span>Trạng thái</span>
                  {/* @ts-expect-error dynamic badge variant */}
                  <Badge variant={statusInfo.variant} size="sm">{statusInfo.label}</Badge>
                </div>
                <div className={styles.summaryItem}>
                  <span>Ngân sách</span>
                  <strong>{formatFriendlyMoney(job.totalFee)}</strong>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      <PaymentConfirmModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        milestoneName={selectedMilestone.name}
        amount={selectedMilestone.amount}
        onConfirm={handleConfirmOrder}
      />

      <RejectReasonModal
        isOpen={rejectModal.open}
        onClose={() => setRejectModal({ open: false, ms: null, sub: null })}
        milestoneName={rejectModal.ms?.name || ''}
        onConfirm={handleConfirmReject}
        loading={rejecting}
      />

      {/* Invite Freelancer Modal */}
      {showInviteModal && (
        <div className={styles.modalOverlay}>
          <Card className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}><Mail size={18}/> Mời Freelancer ứng tuyển</h3>
              <button onClick={() => setShowInviteModal(false)}><X size={20}/></button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                Nhập UID của freelancer bạn muốn mời. Freelancer sẽ nhận được thông báo mời ứng tuyển vào dự án này.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 4 }}>Freelancer UID *</label>
                  <input
                    type="text"
                    placeholder="VD: abc123..."
                    value={inviteFreelancerId}
                    onChange={e => setInviteFreelancerId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'var(--bg-secondary)', fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tin nhắn kèm theo</label>
                  <textarea
                    rows={3}
                    placeholder="Lời nhắn gửi kèm lời mời (tùy chọn)..."
                    value={inviteMessage}
                    onChange={e => setInviteMessage(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'var(--bg-secondary)', fontSize: 14, resize: 'vertical' }}
                  />
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <Button variant="outline" onClick={() => setShowInviteModal(false)}>Hủy</Button>
              <Button
                disabled={!inviteFreelancerId.trim() || inviteSending}
                onClick={async () => {
                  if (!userProfile || !job) return;
                  setInviteSending(true);
                  try {
                    await sendJobInvitation(
                      job.id,
                      inviteFreelancerId.trim(),
                      userProfile.uid,
                      inviteMessage || undefined,
                    );
                    alert('Đã gửi lời mời thành công!');
                    setShowInviteModal(false);
                    setInviteFreelancerId('');
                    setInviteMessage('');
                  } catch (err) {
                    console.error(err);
                    alert('Lỗi khi gửi lời mời. Vui lòng thử lại.');
                  }
                  setInviteSending(false);
                }}
              >
                <Send size={14}/> {inviteSending ? 'Đang gửi...' : 'Gửi lời mời'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
