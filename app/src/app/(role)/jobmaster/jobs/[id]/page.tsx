'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Clock, FileText, CheckCircle, MessageSquare, AlertTriangle, Zap, X, Loader2, Inbox, Pencil, Save, Send, ImageIcon } from 'lucide-react';
import { Button, Card, Badge, Avatar } from '@/components/ui';
import { EscrowStatus } from '@/components/escrow/EscrowStatus';
import { DeadlineIndicator } from '@/components/jobs/DeadlineAlert';
import { MutualReviewForm } from '@/components/reviews/MutualReview';
import { submitReview, hasUserReviewedJob } from '@/lib/firebase/firestore-extended';
import { getJobById, updateJob } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/firebase/auth-context';
import { ActivityFeed, type ActivityItem } from '@/components/jobs/ActivityFeed';
import { DisputeForm } from '@/components/disputes/DisputeForm';
import { formatFriendlyMoney, formatCurrencyInput, parseCurrencyInput } from '@/lib/formatters';
import type { Job, PaymentMilestone } from '@/types';
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

export default function JobMasterJobDetailPage() {
  const params = useParams();
  const { userProfile } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState({ name: '', amount: '' });
  const [showDispute, setShowDispute] = useState(false);
  const [now] = useState(() => Date.now());

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

  // Initialize edit form when entering edit mode
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
      // Refresh job data
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

  const handleApproveClick = (name: string, amount: string) => {
    setSelectedMilestone({ name, amount });
    setIsModalOpen(true);
  };

  const handleConfirmOrder = () => {
    setIsModalOpen(false);
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
  const canEdit = job.status === 'draft' || job.status === 'pending_approval';
  const isActiveJob = job.status === 'in_progress' || job.status === 'review';
  const statusInfo = STATUS_LABELS[job.status] || { label: job.status, variant: 'default' };

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
          </div>
          <div className={styles.hMeta}>
            <span><Clock size={14}/> Tạo: {formatDate(job.createdAt)}</span>
            <span><Clock size={14}/> Deadline: {formatDate(job.deadline)}</span>
          </div>
        </div>
        <div className={styles.hRight}>
          {/* Show different actions based on job status */}
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
              <Button>
                <CheckCircle size={16}/> Nghiệm thu toàn bộ
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Dispute Form — shown when "Báo cáo vấn đề" is clicked */}
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

          {/* Edit mode: description + fee + duration */}
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

                {/* Project Scale */}
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

                {/* Project Images */}
                <div className={styles.editField}>
                  <label>Hình ảnh công trình <span style={{fontSize:'12px',fontWeight:400,color:'var(--color-text-muted)'}}>(URL trực tiếp)</span></label>
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

          {/* Job Description (read only when not editing) */}
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

          {/* Project Scale & Images (read only) */}
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

          {/* Milestones — only show for active/completed jobs */}
          {(isActiveJob || job.status === 'completed' || job.status === 'paid') && (
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
          )}
        </div>

        <div className={styles.sideCol}>
          {/* Freelancer Info — only for assigned jobs */}
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
                  <button className={styles.chatBtn}><MessageSquare size={16}/></button>
                </div>
              </div>
            </Card>
          )}

          {/* Escrow Status */}
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
