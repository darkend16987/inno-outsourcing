'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, MessageSquare, Clock, User, DollarSign, FileText, Send, Loader2, Inbox, Lock, RotateCcw, Edit3, Save, X, AlertTriangle, Zap, BarChart3, Ruler, Paperclip, FolderOpen } from 'lucide-react';
import { Button, Card, Badge, StatusBadge, LevelBadge } from '@/components/ui';
import { getJobById, updateJob } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/firebase/auth-context';
import { cache } from '@/lib/cache/swr-cache';
import { FileItem } from '@/components/ui/FileItem';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/formatters';
import { getConfigItems, type SystemConfigItem, type ConfigCategory } from '@/lib/firebase/system-config';
import {
  getMilestoneSubmissions,
  reviewMilestoneSubmission,
  approveMilestoneAndPay,
  createNotification,
} from '@/lib/firebase/firestore-extended';
import { collection, query, where, getDocs, deleteField } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Job, PaymentMilestone, MilestoneSubmission } from '@/types';
import styles from './page.module.css';

const formatDate = (d: unknown): string => {
  if (!d) return '-';
  if (typeof d === 'object' && d !== null && 'toDate' in d) return (d as { toDate: () => Date }).toDate().toLocaleDateString('vi-VN');
  if (d instanceof Date) return d.toLocaleDateString('vi-VN');
  return String(d);
};

const formatCurrency = (amount: number) => {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)}M ₫`;
  return `${amount.toLocaleString('vi-VN')}₫`;
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Nháp', pending_approval: 'Chờ duyệt', open: 'Đang mở', assigned: 'Chốt kèo',
  in_progress: 'Đang thực hiện', review: 'Nghiệm thu', completed: 'Hoàn thành', paid: 'Đã TT', cancelled: 'Đã hủy',
};

// Payment Confirm Modal
function PaymentConfirmModal({ isOpen, onClose, onConfirm, milestoneName, amount, loading }: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void; milestoneName: string; amount: string; loading: boolean;
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
          <Button onClick={onConfirm} disabled={loading}>{loading ? 'Đang xử lý...' : 'Xác nhận & Gửi yêu cầu'}</Button>
        </div>
      </Card>
    </div>
  );
}

// Reject Reason Modal
function RejectReasonModal({ isOpen, onClose, onConfirm, milestoneName, loading }: {
  isOpen: boolean; onClose: () => void; onConfirm: (reason: string) => void; milestoneName: string; loading: boolean;
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
            Vui lòng nhập lý do để freelancer biết cần sửa đổi gì. Thông tin sẽ được gửi kèm thông báo.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>Lý do chưa đạt</label>
            <textarea
              placeholder="VD: File AutoCAD thiếu layer MEP, cần bổ sung mặt bằng tầng 3..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={4}
              className={styles.textarea}
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

export default function AdminJobReviewPage() {
  const params = useParams();
  const router = useRouter();
  const { userProfile } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [notes, setNotes] = useState<Array<{ author: string; content: string; date: string }>>([]);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [applicationCount, setApplicationCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'info' | 'progress'>('info');

  // Submissions
  const [allSubmissions, setAllSubmissions] = useState<MilestoneSubmission[]>([]);

  // Payment modal
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; ms: PaymentMilestone | null }>({ open: false, ms: null });
  const [approving, setApproving] = useState(false);

  // Reject modal
  const [rejectModal, setRejectModal] = useState<{ open: boolean; ms: PaymentMilestone | null; sub: MilestoneSubmission | null }>({ open: false, ms: null, sub: null });
  const [rejecting, setRejecting] = useState(false);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTotalFee, setEditTotalFee] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editProjectScale, setEditProjectScale] = useState('');
  const [editProjectImages, setEditProjectImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');

  // Config
  const [specialties, setSpecialties] = useState<SystemConfigItem[]>([]);
  const [levels, setLevels] = useState<SystemConfigItem[]>([]);
  const [editCategory, setEditCategory] = useState('');
  const [editLevel, setEditLevel] = useState('');

  useEffect(() => {
    const fetchJob = async () => {
      if (!params.id) return;
      const [result, sp, lv] = await Promise.all([
        getJobById(params.id as string),
        getConfigItems('specialties' as ConfigCategory),
        getConfigItems('levels' as ConfigCategory),
      ]);
      setJob(result);
      setSpecialties(sp.filter(i => i.isActive));
      setLevels(lv.filter(i => i.isActive));
      // @ts-expect-error internalNotes is dynamic field not in Job type
      if (result?.internalNotes) {
        // @ts-expect-error internalNotes is dynamic field
        setNotes(result.internalNotes as Array<{ author: string; content: string; date: string }>);
      }
      // Count applications
      if (result) {
        try {
          const appSnap = await getDocs(query(collection(db, 'applications'), where('jobId', '==', result.id)));
          setApplicationCount(appSnap.size);
        } catch { setApplicationCount(0); }
        // Fetch submissions
        try {
          const subs = await getMilestoneSubmissions(result.id);
          setAllSubmissions(subs);
        } catch { /* ignore */ }
      }
      setLoading(false);
    };
    fetchJob().catch(() => setLoading(false));
  }, [params.id]);

  // Submission helpers
  const getPendingSubForMilestone = (milestoneId: string): MilestoneSubmission | null => {
    return allSubmissions.find(s => s.milestoneId === milestoneId && s.status === 'pending_review') || null;
  };
  const getLatestSubForMilestone = (milestoneId: string): MilestoneSubmission | null => {
    return allSubmissions.find(s => s.milestoneId === milestoneId) || null;
  };

  const startEditing = () => {
    if (!job) return;
    setEditTitle(job.title);
    setEditDescription(job.description);
    setEditTotalFee(job.totalFee ? job.totalFee.toLocaleString('vi-VN').replace(/,/g, '.') : '');
    setEditDuration(String(job.duration || ''));
    setEditCategory(job.category);
    setEditLevel(job.level);
    setEditProjectScale(job.projectScale || '');
    setEditProjectImages(job.projectImages || []);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!job || !userProfile) return;
    setActionLoading(true);
    try {
      await updateJob(job.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        totalFee: parseCurrencyInput(editTotalFee),
        duration: Number(editDuration),
        category: editCategory as never,
        level: editLevel as never,
        projectScale: editProjectScale.trim() || undefined,
        projectImages: editProjectImages.length > 0 ? editProjectImages : undefined,
      } as Partial<Job>, {
        uid: userProfile.uid,
        name: userProfile.displayName,
        role: userProfile.role,
      });
      cache.invalidate('admin:jobs:list');
      const updated = await getJobById(job.id);
      setJob(updated);
      setEditing(false);
      alert('✅ Đã cập nhật thông tin job!');
    } catch (err) {
      console.error('Save failed:', err);
      alert('❌ Không thể lưu. Vui lòng thử lại.');
    }
    setActionLoading(false);
  };

  const handleApprove = async () => {
    if (!job || !userProfile) return;
    if (!confirm('Bạn xác nhận duyệt job này? Job sẽ chuyển sang trạng thái "Đang mở" và hiển thị cho freelancer.')) return;
    setActionLoading(true);
    try {
      await updateJob(job.id, { status: 'open', approvedBy: userProfile.uid }, {
        uid: userProfile.uid, name: userProfile.displayName, role: userProfile.role,
      });
      cache.invalidate('admin:jobs:list');
      const updated = await getJobById(job.id);
      setJob(updated);
      alert('✅ Job đã được duyệt thành công!');
    } catch (err) {
      console.error('Approve failed:', err);
      alert('❌ Không thể duyệt job. Vui lòng thử lại.');
    }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!job || !userProfile) return;
    if (!rejectReason.trim()) { alert('Vui lòng nhập lý do từ chối.'); return; }
    setActionLoading(true);
    try {
      await updateJob(job.id, { status: 'cancelled' }, {
        uid: userProfile.uid, name: userProfile.displayName, role: userProfile.role,
      });
      cache.invalidate('admin:jobs:list');
      alert('Job đã bị từ chối.');
      router.push('/admin/jobs');
    } catch (err) {
      console.error('Reject failed:', err);
      alert('❌ Không thể từ chối job. Vui lòng thử lại.');
    }
    setActionLoading(false);
  };

  const handleLockJob = async () => {
    if (!job || !userProfile) return;
    if (applicationCount > 0) { alert('⚠️ Không thể khóa job đã có người ứng tuyển.'); return; }
    if (!confirm('Bạn muốn KHÓA job này? Job sẽ chuyển về nháp.')) return;
    setActionLoading(true);
    try {
      await updateJob(job.id, { status: 'draft' }, { uid: userProfile.uid, name: userProfile.displayName, role: userProfile.role });
      cache.invalidate('admin:jobs:list');
      const updated = await getJobById(job.id);
      setJob(updated);
      alert('✅ Job đã được khóa (chuyển về Nháp).');
    } catch (err) { console.error(err); alert('❌ Lỗi.'); }
    setActionLoading(false);
  };

  const handleRevokeApproval = async () => {
    if (!job || !userProfile) return;
    if (applicationCount > 0) { alert('⚠️ Không thể thu hồi duyệt — đã có người ứng tuyển.'); return; }
    if (!confirm('Thu hồi trạng thái duyệt? Job sẽ chuyển về "Chờ duyệt".')) return;
    setActionLoading(true);
    try {
      await updateJob(job.id, { status: 'pending_approval', approvedBy: deleteField() } as unknown as Partial<Job>, {
        uid: userProfile.uid, name: userProfile.displayName, role: userProfile.role,
      });
      cache.invalidate('admin:jobs:list');
      const updated = await getJobById(job.id);
      setJob(updated);
      alert('✅ Đã thu hồi duyệt.');
    } catch (err) { console.error(err); alert('❌ Lỗi.'); }
    setActionLoading(false);
  };

  // Accept submission → milestone goes to 'review'
  const handleAcceptSubmission = async (ms: PaymentMilestone, sub: MilestoneSubmission) => {
    if (!job || !userProfile || !sub.id) return;
    try {
      await reviewMilestoneSubmission({
        jobId: job.id, submissionId: sub.id, milestoneId: ms.id,
        decision: 'approved', reviewerId: userProfile.uid, reviewerName: userProfile.displayName || 'Admin',
      });
      const [updatedJob, updatedSubs] = await Promise.all([getJobById(job.id), getMilestoneSubmissions(job.id)]);
      setJob(updatedJob);
      setAllSubmissions(updatedSubs);
      alert('✅ Đã chấp nhận báo cáo. Sẵn sàng nghiệm thu & thanh toán.');
    } catch (err) {
      console.error('Accept submission failed:', err);
      alert('❌ Lỗi khi duyệt submission.');
    }
  };

  // Approve milestone & create payment
  const handleConfirmPayment = async () => {
    if (!job || !userProfile || !paymentModal.ms || approving) return;
    setApproving(true);
    try {
      const ms = paymentModal.ms;
      const result = await approveMilestoneAndPay({
        jobId: job.id, milestoneId: ms.id, jobTitle: job.title, milestoneName: ms.name,
        milestoneAmount: ms.amount, workerId: job.assignedTo || '', workerName: job.assignedWorkerName || 'Freelancer',
        jobMasterId: userProfile.uid, jobMasterName: userProfile.displayName || 'Admin',
      });
      const updated = await getJobById(job.id);
      setJob(updated);
      setPaymentModal({ open: false, ms: null });
      if (result.allDone) alert('✅ Toàn bộ dự án đã nghiệm thu! Lệnh chi đã gửi cho Kế toán.');
      else alert('✅ Đã phê duyệt và gửi lệnh chi cho Kế toán.');
    } catch (err) {
      console.error('Approve payment failed:', err);
      alert('❌ Lỗi: ' + (err instanceof Error ? err.message : 'Vui lòng thử lại.'));
    }
    setApproving(false);
  };

  // Reject submission with reason
  const handleConfirmReject = async (reason: string) => {
    if (!job || !userProfile || !rejectModal.ms || !rejectModal.sub?.id) return;
    setRejecting(true);
    try {
      await reviewMilestoneSubmission({
        jobId: job.id, submissionId: rejectModal.sub.id, milestoneId: rejectModal.ms.id,
        decision: 'rejected', rejectionReason: reason,
        reviewerId: userProfile.uid, reviewerName: userProfile.displayName || 'Admin',
      });
      if (job.assignedTo) {
        createNotification({
          recipientId: job.assignedTo, type: 'milestone_reached',
          title: `Yêu cầu sửa đổi: ${rejectModal.ms.name}`,
          body: `Admin yêu cầu sửa đổi giai đoạn. Lý do: ${reason}`,
          link: `/freelancer/jobs/${job.id}`, read: false,
        }).catch(() => {});
      }
      const updatedSubs = await getMilestoneSubmissions(job.id);
      setAllSubmissions(updatedSubs);
      setRejectModal({ open: false, ms: null, sub: null });
      alert('✅ Đã gửi yêu cầu sửa đổi cho freelancer.');
    } catch (err) {
      console.error('Reject failed:', err);
      alert('❌ Lỗi.');
    }
    setRejecting(false);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    setNotes(prev => [...prev, { author: userProfile?.displayName || 'Admin', content: newNote, date: new Date().toLocaleDateString('vi-VN') }]);
    setNewNote('');
  };

  const addProjectImage = () => {
    if (newImageUrl.trim()) { setEditProjectImages(prev => [...prev, newImageUrl.trim()]); setNewImageUrl(''); }
  };
  const removeProjectImage = (idx: number) => { setEditProjectImages(prev => prev.filter((_, i) => i !== idx)); };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}><Loader2 size={24} className={styles.spin} /> Đang tải chi tiết job...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className={styles.page}>
        <Link href="/admin/jobs" className={styles.backLink}><ArrowLeft size={16} /> Quay lại</Link>
        <div className={styles.loadingWrap}><Inbox size={24} /> Không tìm thấy job này.</div>
      </div>
    );
  }

  const milestones = (job.milestones || []) as PaymentMilestone[];
  const requirements = (job.requirements || {}) as {
    experience?: string; certifications?: string; software?: string[]; standards?: string[];
  };

  const canEdit = ['draft', 'pending_approval'].includes(job.status) && applicationCount === 0;
  const canLock = job.status === 'open';
  const canRevoke = job.status === 'open';
  const isActiveJob = ['in_progress', 'review', 'assigned'].includes(job.status);
  const showMilestoneReview = ['in_progress', 'review', 'assigned', 'completed', 'paid'].includes(job.status);
  const hasPendingSubmissions = allSubmissions.some(s => s.status === 'pending_review');
  const totalProgress = job.progress ?? 0;

  return (
    <div className={styles.page}>
      <Link href="/admin/jobs" className={styles.backLink}>
        <ArrowLeft size={16} /> Quay lại danh sách
      </Link>

      <div className={styles.pageHeader}>
        <div>
          <div className={styles.titleRow}>
            {editing ? (
              <input type="text" className={styles.editTitleInput} value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Tên dự án..." />
            ) : (
              <h1 className={styles.pageTitle}>{job.title}</h1>
            )}
            <StatusBadge status={job.status} label={STATUS_LABELS[job.status] || job.status} />
            {applicationCount > 0 && <Badge variant="info">{applicationCount} ứng viên</Badge>}
            {hasPendingSubmissions && <Badge variant="warning">Có báo cáo chờ duyệt</Badge>}
          </div>
          <div className={styles.metaRow}>
            <span><Badge variant="default">{job.category}</Badge></span>
            <span><LevelBadge level={job.level} /></span>
            <span className={styles.metaItem}><Clock size={14} /> {job.duration || '-'} ngày</span>
            <span className={styles.metaItem}><DollarSign size={14} /> {formatCurrency(job.totalFee || 0)}</span>
            <span className={styles.metaItem}><User size={14} /> JM: {job.jobMasterName || '-'}</span>
          </div>
        </div>

        <div className={styles.actionButtons}>
          {job.status === 'pending_approval' && !editing && (
            <>
              <Button variant="success" size="md" icon={<CheckCircle size={16} />} onClick={handleApprove} disabled={actionLoading}>
                {actionLoading ? 'Đang xử lý...' : 'Duyệt Job'}
              </Button>
              <Button variant="danger" size="md" icon={<XCircle size={16} />} onClick={() => setShowRejectForm(!showRejectForm)} disabled={actionLoading}>
                Từ chối
              </Button>
            </>
          )}
          {canLock && !editing && (
            <Button variant="outline" size="md" icon={<Lock size={16} />} onClick={() => {
              if (applicationCount > 0 && !confirm(`Job hiện có ${applicationCount} ứng viên. Bạn có chắc muốn khóa?`)) return;
              handleLockJob();
            }} disabled={actionLoading}>Khóa Job{applicationCount > 0 ? ` (${applicationCount} ứng viên)` : ''}</Button>
          )}
          {canRevoke && !editing && (
            <Button variant="outline" size="md" icon={<RotateCcw size={16} />} onClick={() => {
              if (applicationCount > 0 && !confirm(`Job hiện có ${applicationCount} ứng viên. Bạn có chắc muốn thu hồi duyệt?`)) return;
              handleRevokeApproval();
            }} disabled={actionLoading}>Thu hồi duyệt{applicationCount > 0 ? ` (${applicationCount} ứng viên)` : ''}</Button>
          )}
          {canEdit && !editing && (
            <Button variant="primary" size="md" icon={<Edit3 size={16} />} onClick={startEditing}>Chỉnh sửa</Button>
          )}
          {editing && (
            <>
              <Button variant="primary" size="md" icon={<Save size={16} />} onClick={handleSaveEdit} disabled={actionLoading}>
                {actionLoading ? 'Đang lưu...' : 'Lưu'}
              </Button>
              <Button variant="ghost" size="md" icon={<X size={16} />} onClick={() => setEditing(false)}>Hủy</Button>
            </>
          )}
        </div>
      </div>

      {showRejectForm && (
        <Card variant="bordered" className={styles.rejectForm}>
          <h3>Lý do từ chối</h3>
          <textarea className={styles.textarea} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Nhập lý do từ chối để gửi lại cho người tạo..." rows={3} />
          <div className={styles.rejectActions}>
            <Button variant="danger" size="sm" icon={<Send size={14} />} onClick={handleReject} disabled={actionLoading}>
              {actionLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowRejectForm(false)}>Hủy</Button>
          </div>
        </Card>
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
      </div>

      {/* TAB: Thông tin */}
      {activeTab === 'info' && (
      <div className={styles.contentGrid}>
        <div className={styles.mainCol}>
          <Card variant="bordered">
            <h3 className={styles.sectionTitle}><FileText size={18} /> Mô tả công việc</h3>
            {editing ? (
              <textarea className={styles.textarea} value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={8} placeholder="Mô tả chi tiết công việc..." />
            ) : (
              <p className={styles.description}>{job.description}</p>
            )}
          </Card>

          {/* Project Scale */}
          {(editing || job.projectScale) && (
            <Card variant="bordered">
              <h3 className={styles.sectionTitle}><Ruler size={18} /> Quy mô dự án</h3>
              {editing ? (
                <textarea className={styles.textarea} value={editProjectScale} onChange={e => setEditProjectScale(e.target.value)} rows={3} placeholder="VD: 8 tầng, 3000m² sàn..." />
              ) : (
                <p className={styles.description}>{job.projectScale}</p>
              )}
            </Card>
          )}

          {/* Project Images */}
          {(editing || (job.projectImages && job.projectImages.length > 0)) && (
            <Card variant="bordered">
              <h3 className={styles.sectionTitle}><FolderOpen size={18} /> File thông tin</h3>
              {editing ? (
                <>
                  <div className={styles.imageGallery}>
                    {editProjectImages.map((url, i) => (
                      <div key={i} className={styles.galleryItem}>
                        <img src={url} alt={`Project ${i + 1}`} className={styles.galleryImg} />
                        <button className={styles.removeImgBtn} onClick={() => removeProjectImage(i)}><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                  <div className={styles.addImageRow}>
                    <input type="url" className={styles.input} value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} placeholder="Nhập URL hình ảnh..." />
                    <Button variant="outline" size="sm" onClick={addProjectImage} disabled={!newImageUrl.trim()}>Thêm ảnh</Button>
                  </div>
                </>
              ) : (
                <div className={styles.imageGallery}>
                  {(job.projectImages || []).map((url: string, i: number) => (
                    <FileItem key={i} url={url} index={i} className={styles.galleryItem} />
                  ))}
                </div>
              )}
            </Card>
          )}

          <Card variant="bordered">
            <h3 className={styles.sectionTitle}>Yêu cầu năng lực</h3>
            {editing ? (
              <div className={styles.editFormGrid}>
                <div className={styles.editField}>
                  <label>Lĩnh vực</label>
                  <select className={styles.input} value={editCategory} onChange={e => setEditCategory(e.target.value)}>
                    {specialties.map(s => <option key={s.id} value={s.label}>{s.label}</option>)}
                  </select>
                </div>
                <div className={styles.editField}>
                  <label>Cấp độ</label>
                  <select className={styles.input} value={editLevel} onChange={e => setEditLevel(e.target.value)}>
                    {levels.map(l => <option key={l.id} value={l.label}>{l.label}</option>)}
                  </select>
                </div>
                <div className={styles.editField}>
                  <label>Ngân sách (VND)</label>
                  <input type="text" className={styles.input} value={editTotalFee} onChange={e => setEditTotalFee(formatCurrencyInput(e.target.value))} placeholder="120.000.000" />
                </div>
                <div className={styles.editField}>
                  <label>Thời gian (ngày)</label>
                  <input type="number" className={styles.input} value={editDuration} onChange={e => setEditDuration(e.target.value)} />
                </div>
              </div>
            ) : (
              <div className={styles.reqGrid}>
                {requirements.experience && <div className={styles.reqItem}><strong>Kinh nghiệm:</strong> {requirements.experience}</div>}
                {requirements.certifications && <div className={styles.reqItem}><strong>Chứng chỉ:</strong> {requirements.certifications}</div>}
                {requirements.software && <div className={styles.reqItem}><strong>Phần mềm:</strong> {requirements.software.join(', ')}</div>}
                {requirements.standards && <div className={styles.reqItem}><strong>Tiêu chuẩn:</strong> {requirements.standards.join(', ')}</div>}
              </div>
            )}
          </Card>
        </div>

        <div className={styles.sideCol}>
          <Card variant="bordered">
            <h3 className={styles.sectionTitle}>Thông tin dự án</h3>
            <div className={styles.infoList}>
              <div className={styles.infoRow}><span>Người tạo:</span><strong>{job.jobMasterName || job.createdBy || '-'}</strong></div>
              <div className={styles.infoRow}><span>Ngày tạo:</span><strong>{formatDate(job.createdAt)}</strong></div>
              <div className={styles.infoRow}><span>Hạn nộp:</span><strong>{formatDate(job.deadline)}</strong></div>
              <div className={styles.infoRow}><span>Hình thức:</span><strong>{job.workMode === 'remote' ? 'Từ xa' : job.workMode === 'on-site' ? 'Tại chỗ' : 'Kết hợp'}</strong></div>
              {job.assignedWorkerName && <div className={styles.infoRow}><span>Freelancer:</span><strong>{job.assignedWorkerName}</strong></div>}
              {job.projectScale && <div className={styles.infoRow}><span>Quy mô:</span><strong>{job.projectScale}</strong></div>}
            </div>
          </Card>

          {/* Internal Info - chỉ admin thấy */}
          {job.internalInfo && (
            <Card variant="bordered">
              <h3 className={styles.sectionTitle}><DollarSign size={18} /> Thông tin nội bộ</h3>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12, fontStyle: 'italic' }}>Chỉ admin/jobmaster thấy — không hiển thị cho freelancer.</p>
              <div className={styles.infoList}>
                {job.internalInfo.internalCost != null && (
                  <div className={styles.infoRow}><span>Chi phí nội bộ:</span><strong>{formatCurrency(job.internalInfo.internalCost)}</strong></div>
                )}
                {job.internalInfo.expectedProfit != null && (
                  <div className={styles.infoRow}><span>Lợi nhuận dự kiến:</span><strong>{formatCurrency(job.internalInfo.expectedProfit)}</strong></div>
                )}
                {job.internalInfo.reason && (
                  <div className={styles.infoRow}><span>Lý do tạo job:</span><strong>{job.internalInfo.reason}</strong></div>
                )}
                {job.internalInfo.notes && (
                  <div className={styles.infoRow}><span>Ghi chú nội bộ:</span><strong>{job.internalInfo.notes}</strong></div>
                )}
              </div>
            </Card>
          )}

          <Card variant="bordered" className={styles.notesCard}>
            <h3 className={styles.sectionTitle}><MessageSquare size={18} /> Ghi chú nội bộ</h3>
            <p className={styles.notesHint}>Chỉ admin thấy — không hiển thị cho freelancer.</p>
            <div className={styles.notesList}>
              {notes.map((note, i) => (
                <div key={i} className={styles.noteItem}>
                  <div className={styles.noteHeader}><strong>{note.author}</strong> <span>{note.date}</span></div>
                  <p>{note.content}</p>
                </div>
              ))}
              {notes.length === 0 && <div className={styles.emptySmall}>Chưa có ghi chú nội bộ.</div>}
            </div>
            <div className={styles.noteInput}>
              <textarea className={styles.textarea} value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Thêm ghi chú nội bộ..." rows={2} />
              <Button variant="outline" size="sm" icon={<Send size={14} />} onClick={handleAddNote}>Gửi</Button>
            </div>
          </Card>
        </div>
      </div>
      )}

      {/* TAB: Tiến độ */}
      {activeTab === 'progress' && (
      <div className={styles.contentGrid}>
        <div className={styles.mainCol}>
          <Card variant="bordered">
            <h3 className={styles.sectionTitle}><DollarSign size={18} /> Giai đoạn & Nghiệm thu</h3>

            {/* Progress bar for active jobs */}
            {showMilestoneReview && (
              <div className={styles.progressSection}>
                <div className={styles.progressLabel}>
                  <span>Tiến độ tổng</span>
                  <span>{totalProgress}%</span>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${totalProgress}%` }} />
                </div>
              </div>
            )}

            {showMilestoneReview ? (
              <div className={styles.milestoneTimeline}>
                {milestones.map((ms, index) => {
                  const isDone = ms.status === 'released' || ms.status === 'paid' || ms.status === 'approved';
                  const isReview = ms.status === 'review';
                  const isInProgress = ms.status === 'in_progress';
                  const isActive = isInProgress || isReview;

                  const pendingSub = getPendingSubForMilestone(ms.id);
                  const latestSub = getLatestSubForMilestone(ms.id);

                  return (
                    <div key={ms.id || index} className={`${styles.milestoneRow} ${!isActive && !isDone ? styles.op50 : ''}`}>
                      <div className={styles.msDot}>
                        {isDone ? (
                          <CheckCircle size={20} color="var(--color-success)"/>
                        ) : isActive ? (
                          <span className={styles.msDotActive}></span>
                        ) : (
                          <span className={styles.msDotEmpty}></span>
                        )}
                      </div>
                      <div className={`${styles.msContent} ${isActive ? styles.msContentActive : ''}`}>
                        <div className={styles.msHead}>
                          <h4>{index + 1}. {ms.name} ({ms.percentage}%)</h4>
                          <span>{formatCurrency(ms.amount)}</span>
                        </div>
                        {ms.condition && <p className={styles.msDesc}>{ms.condition}</p>}

                        {/* Pending submission from freelancer */}
                        {isInProgress && pendingSub && (
                          <div className={`${styles.submissionBox} ${styles.submissionBoxPending}`}>
                            <h5><FileText size={14}/> Freelancer đã nộp báo cáo — chờ xem xét</h5>
                            {pendingSub.note && (
                              <p className={styles.msDesc} style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                                <strong>Ghi chú:</strong> {pendingSub.note}
                              </p>
                            )}
                            {pendingSub.links.filter(Boolean).length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '0.5rem' }}>
                                <strong style={{ fontSize: '13px' }}>Link kết quả:</strong>
                                {pendingSub.links.filter(Boolean).map((link, li) => (
                                  <a key={li} href={link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: 'var(--color-primary)', wordBreak: 'break-all' }}>
                                    <Paperclip size={12} style={{display:'inline',marginRight:4}}/>{link}
                                  </a>
                                ))}
                              </div>
                            )}
                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                              Nộp bởi: {pendingSub.freelancerName} — {pendingSub.submittedAt instanceof Date ? pendingSub.submittedAt.toLocaleString('vi-VN') : new Date(pendingSub.submittedAt).toLocaleString('vi-VN')}
                            </p>
                            <div className={styles.msActions}>
                              <Button size="sm" onClick={() => handleAcceptSubmission(ms, pendingSub)}>
                                <CheckCircle size={14}/> Chấp nhận báo cáo
                              </Button>
                              <Button variant="outline" size="sm" className={styles.rejectBtn} onClick={() => setRejectModal({ open: true, ms, sub: pendingSub })}>
                                <AlertTriangle size={14}/> Yêu cầu sửa đổi
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Milestone in review — ready for payment */}
                        {isReview && (
                          <div className={`${styles.submissionBox} ${styles.submissionBoxReview}`}>
                            <h5><CheckCircle size={14}/> Báo cáo đã chấp nhận — sẵn sàng nghiệm thu</h5>
                            {latestSub && latestSub.note && (
                              <p className={styles.msDesc} style={{ marginTop: '0.5rem' }}>
                                <strong>Ghi chú:</strong> {latestSub.note}
                              </p>
                            )}
                            {latestSub && latestSub.links.filter(Boolean).length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '0.25rem' }}>
                                <strong style={{ fontSize: '13px' }}>Link kết quả:</strong>
                                {latestSub.links.filter(Boolean).map((link, li) => (
                                  <a key={li} href={link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: 'var(--color-primary)', wordBreak: 'break-all' }}>
                                    <Paperclip size={12} style={{display:'inline',marginRight:4}}/>{link}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className={styles.msActions}>
                          {isDone ? (
                            <Badge variant="success">Đã nghiệm thu & Thanh toán</Badge>
                          ) : isReview ? (
                            <Button size="sm" onClick={() => setPaymentModal({ open: true, ms })}>
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
                {milestones.length === 0 && <div className={styles.emptySmall}>Chưa thiết lập đợt thanh toán.</div>}
              </div>
            ) : (
              /* Static milestone list for draft/pending jobs */
              <div className={styles.milestoneList}>
                {milestones.map((ms, i) => (
                  <div key={i} className={styles.milestoneItem}>
                    <div className={styles.msName}>{ms.name}</div>
                    <div className={styles.msDetail}>
                      <span>{ms.percentage}%</span>
                      <span className={styles.msAmount}>{formatCurrency(ms.amount)}</span>
                      <span className={styles.msCondition}>{ms.condition}</span>
                    </div>
                  </div>
                ))}
                {milestones.length === 0 && <div className={styles.emptySmall}>Chưa thiết lập đợt thanh toán.</div>}
              </div>
            )}
          </Card>
        </div>

        <div className={styles.sideCol}>
          <Card variant="bordered">
            <h3 className={styles.sectionTitle}>Thông tin dự án</h3>
            <div className={styles.infoList}>
              <div className={styles.infoRow}><span>Người tạo:</span><strong>{job.jobMasterName || job.createdBy || '-'}</strong></div>
              <div className={styles.infoRow}><span>Ngày tạo:</span><strong>{formatDate(job.createdAt)}</strong></div>
              <div className={styles.infoRow}><span>Hạn nộp:</span><strong>{formatDate(job.deadline)}</strong></div>
              <div className={styles.infoRow}><span>Hình thức:</span><strong>{job.workMode === 'remote' ? 'Từ xa' : job.workMode === 'on-site' ? 'Tại chỗ' : 'Kết hợp'}</strong></div>
              {job.assignedWorkerName && <div className={styles.infoRow}><span>Freelancer:</span><strong>{job.assignedWorkerName}</strong></div>}
              {job.projectScale && <div className={styles.infoRow}><span>Quy mô:</span><strong>{job.projectScale}</strong></div>}
            </div>
          </Card>
        </div>
      </div>
      )}

      <PaymentConfirmModal
        isOpen={paymentModal.open}
        onClose={() => setPaymentModal({ open: false, ms: null })}
        milestoneName={paymentModal.ms?.name || ''}
        amount={formatCurrency(paymentModal.ms?.amount || 0)}
        onConfirm={handleConfirmPayment}
        loading={approving}
      />

      <RejectReasonModal
        isOpen={rejectModal.open}
        onClose={() => setRejectModal({ open: false, ms: null, sub: null })}
        milestoneName={rejectModal.ms?.name || ''}
        onConfirm={handleConfirmReject}
        loading={rejecting}
      />
    </div>
  );
}
