'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, MessageSquare, UploadCloud, CheckCircle2, X, Loader2, Inbox } from 'lucide-react';
import { Button, Badge, Card, LevelBadge, Avatar } from '@/components/ui';
import { getJobById } from '@/lib/firebase/firestore';
import type { Job } from '@/types';
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
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submittingMilestone, setSubmittingMilestone] = useState<string | null>(null);

  useEffect(() => {
    const fetchJob = async () => {
      if (!params.id) return;
      const result = await getJobById(params.id as string);
      setJob(result);
      setLoading(false);
    };
    fetchJob().catch(() => setLoading(false));
  }, [params.id]);

  const handleSubmitClick = (milestoneId: string) => {
    setSubmittingMilestone(milestoneId);
    setIsSubmitModalOpen(true);
  };

  const handleConfirmSubmit = () => {
    if (!submittingMilestone || !job) return;
    const newMilestones = (job.milestones || []).map((ms) =>
      ms.id === submittingMilestone ? { ...ms, status: 'review' as unknown as typeof ms.status } : ms
    );
    setJob({ ...job, milestones: newMilestones });
    setIsSubmitModalOpen(false);
    alert('Báo cáo hoàn thành đã được gửi đến Job Master!');
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
              <Button size="sm" variant="outline">Cập nhật tiến độ</Button>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${job.progress ?? 0}%` }} />
            </div>
          </Card>

          <Card className={styles.tasksCard}>
            <h3 className={styles.sectionTitle}>Giai đoạn & Thanh toán</h3>
            <div className={styles.milestones}>
              {milestones.map((ms, index) => (
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
                      <Button size="sm" onClick={() => handleSubmitClick(ms.id)}>
                        <UploadCloud size={14}/> Nộp kết quả
                      </Button>
                    ) : ms.status === 'review' ? (
                      <Badge variant="info">Đang chờ duyệt</Badge>
                    ) : ms.status === 'completed' ? (
                      <Badge variant="success"><CheckCircle2 size={12}/> Hoàn thành</Badge>
                    ) : (
                      <span className={styles.mPending}>Chưa bắt đầu</span>
                    )}
                  </div>
                </div>
              ))}
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
            <Button fullWidth variant="outline" className={styles.msgBtn}>
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
                <div className={styles.formGroup}>
                  <label>Ghi chú gửi Job Master</label>
                  <textarea placeholder="Mô tả tóm tắt các công việc đã hoàn thành hoặc các lưu ý đặc biệt..." className={styles.textarea}></textarea>
                </div>
                <div className={styles.uploadArea}>
                  <UploadCloud size={32} className={styles.uploadIcon}/>
                  <p>Kéo thả file kết quả hoặc nhấn để chọn file</p>
                  <span>Hỗ trợ: PDF, DWG, RVT, ZIP (Max 100MB)</span>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <Button variant="outline" onClick={() => setIsSubmitModalOpen(false)}>Hủy bỏ</Button>
                <Button onClick={handleConfirmSubmit}>Xác nhận & Gửi báo cáo</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
