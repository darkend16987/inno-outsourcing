'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Clock, Briefcase, Calendar, 
  Sparkles, Zap, Star, Target, Send,
  FileText, MessageSquare, Info, X,
  CheckCircle, ExternalLink, AlertCircle
} from 'lucide-react';
import { Button, Badge, Card, LevelBadge, Avatar, Skeleton } from '@/components/ui';
import { CommentSection } from '@/components/comments/CommentSection';
import { CompletionChecklist, ChecklistItemData } from '@/components/checklist/CompletionChecklist';
import { getJobById, applyForJob, checkExistingApplication } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/firebase/auth-context';
import { formatFriendlyMoney, formatDate } from '@/lib/formatters';
import styles from './page.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const WORK_MODE_LABELS: Record<string, string> = {
  remote: 'Từ xa 🏠',
  'on-site': 'Tại công trường 🏗️',
  hybrid: 'Kết hợp 🏢',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeJob(raw: any) {
  return {
    ...raw,
    description: raw.description || raw.desc || '',
    totalFee: raw.totalFee || raw.fee || 0,
    duration: typeof raw.duration === 'number' ? raw.duration : parseInt(raw.duration) || 0,
    durationDisplay: typeof raw.duration === 'string' ? raw.duration : `${raw.duration} ngày`,
    requirements: raw.requirements || null,
    milestones: raw.milestones || [],
    attachments: raw.attachments || [],
    jobMasterName: raw.jobMasterName || 'INNO Team',
    highlightTags: raw.highlightTags || [],
    status: raw.status || 'open',
  };
}

// =====================
// APPLY MODAL COMPONENT
// =====================
interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  job: any;
  onSuccess: () => void;
}

function ApplyModal({ isOpen, onClose, job, onSuccess }: ApplyModalProps) {
  const { userProfile } = useAuth();
  const [availableDate, setAvailableDate] = useState('');
  const [expectedFee, setExpectedFee] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [portfolioLink, setPortfolioLink] = useState('');
  const [agreedScope, setAgreedScope] = useState(false);
  const [agreedProfile, setAgreedProfile] = useState(false);
  const [agreedContract, setAgreedContract] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const canSubmit = agreedScope && agreedProfile && agreedContract && coverLetter.trim().length > 10 && availableDate;

  const handleSubmit = async () => {
    if (!userProfile || !canSubmit) return;
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await applyForJob({
        jobId: job.id,
        jobTitle: job.title,
        applicantId: userProfile.uid,
        applicantName: userProfile.displayName || userProfile.email,
        applicantLevel: userProfile.currentLevel || 'L1',
        applicantSpecialties: userProfile.specialties || [],
        availableDate,
        expectedFee: expectedFee ? parseInt(expectedFee.replace(/\D/g, '')) : undefined,
        coverLetter,
        portfolioLink,
      });
      onSuccess();
    } catch (err) {
      console.error('Apply error:', err);
      setErrorMsg('Có lỗi xảy ra khi gửi đơn. Vui lòng thử lại.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className={styles.modalOverlay} onClick={onClose}>
        <motion.div 
          className={styles.modal}
          onClick={e => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
        >
          {/* Modal Header */}
          <div className={styles.modalHeader}>
            <div>
              <h2 className={styles.modalTitle}>Ứng tuyển nhận việc</h2>
              <p className={styles.modalSubtitle}>Gửi hồ sơ ứng tuyển đến Job Master</p>
            </div>
            <button className={styles.modalClose} onClick={onClose}><X size={20} /></button>
          </div>

          <div className={styles.modalBody}>
            {/* Job Summary */}
            <div className={styles.jobSummaryCard}>
              <div className={styles.jobSummaryTop}>
                <div>
                  <h3 className={styles.jobSummaryTitle}>{job.title}</h3>
                  <div className={styles.jobSummaryTags}>
                    <Badge variant="default" size="sm">{job.category}</Badge>
                    <LevelBadge level={job.level} />
                    <Badge variant="outline" size="sm">{WORK_MODE_LABELS[job.workMode] || job.workMode}</Badge>
                  </div>
                </div>
                <div className={styles.jobSummaryFee}>{formatFriendlyMoney(job.totalFee)}</div>
              </div>
              <div className={styles.jobSummaryMeta}>
                {job.deadline && <span><Calendar size={14} /> Hạn nộp: {formatDate(job.deadline)}</span>}
                <span><Clock size={14} /> Thời hạn: {job.durationDisplay}</span>
              </div>
            </div>

            {/* Applicant Info (auto-filled from profile) */}
            <div className={styles.formSection}>
              <div className={styles.formSectionHeader}>
                <h3>Thông tin ứng viên</h3>
                <Link href="/freelancer/profile" className={styles.editProfileLink}><ExternalLink size={14} /> Chỉnh sửa hồ sơ</Link>
              </div>
              <div className={styles.applicantGrid}>
                <div className={styles.applicantItem}>
                  <span className={styles.applicantLabel}>Họ tên</span>
                  <strong>{userProfile?.displayName || 'Chưa cập nhật'}</strong>
                </div>
                <div className={styles.applicantItem}>
                  <span className={styles.applicantLabel}>Level</span>
                  <strong><LevelBadge level={(userProfile?.currentLevel || 'L1') as 'L1'|'L2'|'L3'|'L4'|'L5'} /></strong>
                </div>
                <div className={styles.applicantItem}>
                  <span className={styles.applicantLabel}>Chuyên môn</span>
                  <strong>{(userProfile?.specialties || []).join(', ') || 'Chưa cập nhật'}</strong>
                </div>
                <div className={styles.applicantItem}>
                  <span className={styles.applicantLabel}>Kinh nghiệm</span>
                  <strong>{userProfile?.experience || 0} năm · {userProfile?.stats?.completedJobs || 0} job</strong>
                </div>
              </div>
              <p className={styles.profileNote}>Thông tin lấy từ hồ sơ năng lực. Admin sẽ xem toàn bộ khi xét duyệt.</p>
            </div>

            {/* Additional Info Form */}
            <div className={styles.formSection}>
              <h3>Thông tin bổ sung cho Admin</h3>
              
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Ngày có thể bắt đầu <span className={styles.required}>*</span></label>
                  <input 
                    type="date" 
                    className={styles.formInput} 
                    value={availableDate} 
                    onChange={e => setAvailableDate(e.target.value)} 
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Mức thù lao kỳ vọng (VND)</label>
                  <input 
                    type="text" 
                    className={styles.formInput} 
                    placeholder={`Đồng ý: ${formatFriendlyMoney(job.totalFee)}`}
                    value={expectedFee}
                    onChange={e => setExpectedFee(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Lý do ứng tuyển / giới thiệu ngắn <span className={styles.required}>*</span></label>
                <textarea 
                  className={styles.formTextarea} 
                  rows={4}
                  placeholder="Mô tả kinh nghiệm liên quan, lý do phù hợp với công việc này..."
                  value={coverLetter}
                  onChange={e => setCoverLetter(e.target.value)}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Portfolio liên quan (link)</label>
                <input 
                  type="url" 
                  className={styles.formInput} 
                  placeholder="https://drive.google.com/..."
                  value={portfolioLink}
                  onChange={e => setPortfolioLink(e.target.value)}
                />
              </div>
            </div>

            {/* Confirmation Checkboxes */}
            <div className={styles.formSection}>
              <h3>Xác nhận trước khi gửi</h3>
              <div className={styles.checkboxList}>
                <label className={styles.checkboxRow}>
                  <input type="checkbox" checked={agreedScope} onChange={e => setAgreedScope(e.target.checked)} />
                  <span>Tôi đã đọc kỹ phạm vi công việc, yêu cầu năng lực và các điều khoản thanh toán</span>
                </label>
                <label className={styles.checkboxRow}>
                  <input type="checkbox" checked={agreedProfile} onChange={e => setAgreedProfile(e.target.checked)} />
                  <span>Tôi xác nhận thông tin hồ sơ năng lực là trung thực và cập nhật</span>
                </label>
                <label className={styles.checkboxRow}>
                  <input type="checkbox" checked={agreedContract} onChange={e => setAgreedContract(e.target.checked)} />
                  <span>Tôi hiểu rằng việc được chọn sẽ yêu cầu ký hợp đồng điện tử trước khi bắt đầu</span>
                </label>
              </div>
            </div>

            {errorMsg && (
              <div className={styles.errorBar}>
                <AlertCircle size={16} /> {errorMsg}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className={styles.modalFooter}>
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Hủy, quay lại</Button>
            <Button 
              variant="primary" 
              size="lg" 
              disabled={!canSubmit || isSubmitting}
              loading={isSubmitting}
              onClick={handleSubmit}
              icon={<Send size={16} />}
            >
              Gửi đơn ứng tuyển
            </Button>
          </div>

          <p className={styles.modalDisclaimer}>
            Sau khi gửi, đơn sẽ xuất hiện trong tab &quot;Đã ứng tuyển&quot; của mục Việc của tôi. Admin sẽ thông báo kết quả qua email và in-app.
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// =====================
// MAIN PAGE COMPONENT
// =====================
export default function JobDetailPage() {
  const params = useParams();
  const { userProfile, firebaseUser } = useAuth();
  const jobId = params.id as string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [checkingApplication, setCheckingApplication] = useState(false);

  useEffect(() => {
    async function fetchJob() {
      try {
        setLoading(true);
        const data = await getJobById(jobId);
        if (data) {
          setJob(normalizeJob(data));
        } else {
          setJob(null);
        }
      } catch (error) {
        console.error('Error fetching job:', error);
      } finally {
        setLoading(false);
      }
    }
    if (jobId) fetchJob();
  }, [jobId]);

  // Inject OG meta tags for social sharing
  useEffect(() => {
    if (!job) return;
    const fee = formatFriendlyMoney(job.totalFee);
    const ogTitle = `${job.category} — ${job.title} | VAA JOB`;
    const ogDesc = `💰 ${fee} · ⏱ ${job.durationDisplay} · Lĩnh vực: ${job.category} · Level: ${job.level}. Ứng tuyển ngay trên VAA JOB!`;
    const ogUrl = typeof window !== 'undefined' ? window.location.href : '';

    document.title = ogTitle;

    const setMeta = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    setMeta('og:title', ogTitle);
    setMeta('og:description', ogDesc);
    setMeta('og:type', 'website');
    setMeta('og:url', ogUrl);
    setMeta('og:site_name', 'VAA JOB — Outsourcing Xây dựng');

    return () => {
      // Cleanup: restore generic title
      document.title = 'VAA JOB';
    };
  }, [job]);

  // Check if user has already applied
  const checkApplication = useCallback(async () => {
    if (!firebaseUser?.uid || !jobId) return;
    try {
      setCheckingApplication(true);
      const existing = await checkExistingApplication(jobId, firebaseUser.uid);
      if (existing) {
        setHasApplied(true);
        setApplicationStatus(existing.status);
      }
    } catch (err) {
      console.error('Error checking application:', err);
    } finally {
      setCheckingApplication(false);
    }
  }, [firebaseUser?.uid, jobId]);

  useEffect(() => {
    checkApplication();
  }, [checkApplication]);

  const handleApplyClick = () => {
    if (!firebaseUser) {
      // Not logged in - redirect to login
      window.location.href = '/login';
      return;
    }
    if (userProfile?.role !== 'freelancer') {
      alert('Chỉ tài khoản Freelancer mới có thể ứng tuyển.');
      return;
    }
    setShowApplyModal(true);
  };

  const handleApplySuccess = () => {
    setShowApplyModal(false);
    setHasApplied(true);
    setApplicationStatus('pending');
  };

  const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: 'Đã gửi — Đang chờ duyệt', color: 'var(--color-warning)', icon: <Clock size={16} /> },
    shortlisted: { label: 'Vào vòng trong', color: 'var(--color-info, #3b82f6)', icon: <Star size={16} /> },
    accepted: { label: 'Đã được chọn!', color: 'var(--color-success)', icon: <CheckCircle size={16} /> },
    rejected: { label: 'Không được chọn', color: 'var(--color-error)', icon: <AlertCircle size={16} /> },
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.breadcrumb}>
            <Skeleton width="200px" height="20px" />
          </div>
          <div className={styles.layout}>
            <div className={styles.main}>
              <Card padding="xl">
                <Skeleton width="100px" height="30px" className="mb-4" />
                <Skeleton width="80%" height="40px" className="mb-6" />
                <div className="flex gap-4 mb-8">
                  <Skeleton width="150px" height="20px" />
                  <Skeleton width="150px" height="20px" />
                  <Skeleton width="150px" height="20px" />
                </div>
                <Skeleton width="100%" height="200px" />
              </Card>
            </div>
            <div className={styles.sidebar}>
              <Card padding="xl">
                <Skeleton width="100%" height="150px" className="mb-6" />
                <Skeleton width="100%" height="50px" />
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <Info size={48} className={styles.errorIcon} />
            <h2>Không tìm thấy công việc</h2>
            <p>Công việc này có thể đã bị xóa hoặc bạn không có quyền truy cập.</p>
            <Link href="/jobs">
              <Button variant="primary">Quay lại danh sách</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        
        {/* Breadcrumb & Back */}
        <div className={styles.breadcrumb}>
          <Link href="/jobs" className={styles.backLink}>
            <ArrowLeft size={16} /> Quay lại danh sách
          </Link>
          <span className={styles.sep}>/</span>
          <span>{job.category}</span>
          <span className={styles.sep}>/</span>
          <span className={styles.current}>{job.title}</span>
        </div>

        <div className={styles.layout}>
          {/* Main Content */}
          <motion.div className={styles.main} initial="hidden" animate="visible" variants={fadeUp}>
            <div className={styles.header}>
              <div className={styles.tags}>
                <Badge variant="default" glow>{job.category}</Badge>
                <LevelBadge level={job.level} />
                <Badge size="sm" variant="outline">
                  {WORK_MODE_LABELS[job.workMode] || job.workMode}
                </Badge>
                {job.highlightTags?.map((tag: string) => (
                  <Badge key={tag} size="sm" variant="secondary">#{tag}</Badge>
                ))}
              </div>
              <h1 className={styles.title}>{job.title}</h1>
              
              <div className={styles.meta}>
                <div className={styles.metaItem}><Clock size={16} color="var(--color-primary)"/> Đăng ngày: {job.createdAt ? formatDate(job.createdAt) : 'N/A'}</div>
                {job.deadline && <div className={styles.metaItem}><Calendar size={16} color="var(--color-warning)"/> Hạn nộp: {formatDate(job.deadline)}</div>}
                {job.startDate && <div className={styles.metaItem}><Target size={16} color="var(--color-success)"/> Bắt đầu: {formatDate(job.startDate)}</div>}
              </div>
            </div>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}><Briefcase size={20} /> Mô tả công việc</h2>
              <div className={styles.content}>
                {job.description ? (
                  job.description.split('\n').map((para: string, i: number) => (
                    <p key={i}>{para}</p>
                  ))
                ) : (
                  <p className={styles.placeholder}>Mô tả chi tiết sẽ được cập nhật sớm.</p>
                )}
              </div>
            </section>

            {job.requirements && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}><Zap size={20} /> Yêu cầu công việc</h2>
                <ul className={styles.reqList}>
                  {job.requirements.experience && <li><strong>Kinh nghiệm:</strong> {job.requirements.experience}</li>}
                  {job.requirements.certifications && <li><strong>Chứng chỉ:</strong> {job.requirements.certifications}</li>}
                  {job.requirements.software?.length > 0 && (
                    <li><strong>Phần mềm:</strong> 
                      <div className={styles.softwareGrid}>
                        {job.requirements.software.map((sw: string) => <Badge key={sw} size="sm" variant="outline" className={styles.swBadge}>{sw}</Badge>)}
                      </div>
                    </li>
                  )}
                  {job.requirements.standards?.length > 0 && <li><strong>Tiêu chuẩn:</strong> {job.requirements.standards.join(', ')}</li>}
                </ul>
              </section>
            )}

            {job.milestones.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}><Star size={20} /> Giai đoạn thanh toán (Milestones)</h2>
                <div className={styles.milestones}>
                  {job.milestones.map((ms: { id: string; name: string; percentage: number; amount: number }, index: number) => (
                    <div key={ms.id} className={styles.milestone}>
                      <div className={styles.mLeft}>
                        <div className={styles.mNum}>{index + 1}</div>
                        <div className={styles.mName}>{ms.name}</div>
                      </div>
                      <div className={styles.mRight}>
                        <div className={styles.mPercent}>{ms.percentage}%</div>
                        <div className={styles.mAmount}>{formatFriendlyMoney(ms.amount)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {job.attachments.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}><FileText size={20} /> File đính kèm</h2>
                <div className={styles.chipRow}>
                  {job.attachments.map((file: { type: string; name: string }, idx: number) => (
                    <Badge key={idx} variant="outline" className={styles.fileChip}>
                      {file.type.toUpperCase()} | {file.name}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Completion Checklist — visible when job has checklist items */}
            {job.checklist && job.checklist.length > 0 && (
              <section className={styles.section}>
                <CompletionChecklist
                  items={job.checklist}
                  role={userProfile?.role === 'admin' ? 'admin' : userProfile?.role === 'jobmaster' ? 'jobmaster' : 'freelancer'}
                  onFreelancerSubmit={(items: ChecklistItemData[]) => {
                    console.log('Freelancer submitted checklist:', items);
                  }}
                  onMasterApprove={(items: ChecklistItemData[]) => {
                    console.log('Master approved checklist:', items);
                  }}
                  onMasterReject={(itemId: string, note: string) => {
                    console.log('Master rejected item:', itemId, note);
                  }}
                  disabled={!firebaseUser}
                />
              </section>
            )}

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}><MessageSquare size={20} /> Bình luận & Trao đổi</h2>
              <CommentSection jobId={jobId} />
            </section>
          </motion.div>

          {/* Sidebar */}
          <motion.div className={styles.sidebar} initial="hidden" animate="visible" variants={fadeUp}>
            <Card className={styles.actionCard} glow>
              <div className={styles.feeBlock}>
                <span className={styles.feeLabel}>Ngân sách dự kiến</span>
                <div className={styles.feeVal}>{formatFriendlyMoney(job.totalFee)}</div>
                <div className={styles.duration}>Thời gian: <strong>{job.durationDisplay}</strong></div>
              </div>

              <div className={styles.actionBlock}>
                {hasApplied && applicationStatus ? (
                  <div className={styles.appliedStatus} style={{ borderColor: STATUS_MAP[applicationStatus]?.color }}>
                    <div className={styles.appliedIcon} style={{ color: STATUS_MAP[applicationStatus]?.color }}>
                      {STATUS_MAP[applicationStatus]?.icon}
                    </div>
                    <div>
                      <div className={styles.appliedLabel} style={{ color: STATUS_MAP[applicationStatus]?.color }}>
                        {STATUS_MAP[applicationStatus]?.label}
                      </div>
                      <div className={styles.appliedHint}>Bạn đã ứng tuyển công việc này</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Button 
                      fullWidth 
                      size="lg" 
                      onClick={handleApplyClick} 
                      loading={checkingApplication}
                      icon={<Sparkles size={18} />}
                    >
                      Nộp hồ sơ ứng tuyển
                    </Button>
                    <div className={styles.actionHint}>
                      Yêu cầu Level {job.level} để tối ưu cơ hội trúng tuyển.
                    </div>
                  </>
                )}
              </div>

              <div className={styles.masterInfo}>
                <div className={styles.masterLabel}>Người quản lý công việc</div>
                <div className={styles.mProfile}>
                  <Avatar name={job.jobMasterName} level={job.level} size="md" />
                  <div className={styles.mDetails}>
                    <div className={styles.masterName}>{job.jobMasterName}</div>
                    <div className={styles.mRole}>Job Master @ INNO</div>
                  </div>
                </div>
                <div className={styles.mContact}>
                  <div className={styles.contactRow}><span>Hỗ trợ:</span> <strong>Chat ngay</strong></div>
                  <Button variant="outline" size="sm" fullWidth className={styles.contactBtn} icon={<MessageSquare size={14}/>}>Nhắn trao đổi</Button>
                </div>
              </div>
            </Card>

            <Card className={styles.infoCard}>
              <h3 className={styles.infoTitle}><Sparkles size={18} color="var(--color-warning)"/> Quy trình làm việc</h3>
              <ul className={styles.checklist}>
                <li><Sparkles size={16} /> Ứng tuyển & Xét duyệt hồ sơ</li>
                <li><Zap size={16} /> Phỏng vấn & Chốt hợp đồng</li>
                <li><Target size={16} /> Nhận việc & Báo cáo</li>
                <li><Star size={16} /> Nghiệm thu & Thanh toán</li>
              </ul>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Apply Modal */}
      <ApplyModal 
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        job={job}
        onSuccess={handleApplySuccess}
      />
    </div>
  );
}
