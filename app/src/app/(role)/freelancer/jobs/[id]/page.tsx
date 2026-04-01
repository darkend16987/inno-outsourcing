'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, MessageSquare, UploadCloud, CheckCircle2, X, FileText } from 'lucide-react';
import { Button, Badge, Card, LevelBadge, Avatar } from '@/components/ui';
import styles from './page.module.css';

const MOCK_JOB = {
  id: '3',
  title: 'Thiết kế kết cấu Bệnh viện Đa khoa Cần Thơ',
  category: 'Kết cấu',
  level: 'L5',
  fee: '120,000,000₫',
  duration: '90 ngày',
  workMode: 'on-site',
  deadline: '2026-04-15',
  status: 'in_progress',
  progress: 10,
  jobMaster: {
    name: 'Trần Văn Hoàng',
    role: 'Trưởng phòng Kết cấu',
    level: 'L5',
  },
  milestones: [
    { id: 'm1', name: 'Thiết kế cơ sở & Thống nhất phương án', percentage: 20, amount: '24,000,000₫', status: 'completed' },
    { id: 'm2', name: 'Bản vẽ Thiết kế Kỹ thuật (TKKT)', percentage: 40, amount: '48,000,000₫', status: 'in_progress' },
    { id: 'm3', name: 'Bản vẽ Thi công (BVTC) & Bóc khối lượng', percentage: 30, amount: '36,000,000₫', status: 'pending' },
    { id: 'm4', name: 'Bảo hành thiết kế (sau khi ra giấy phép)', percentage: 10, amount: '12,000,000₫', status: 'pending' },
  ],
  deliverables: [
    { id: 'd1', name: 'BanVe_KetCau_PA1.pdf', date: '02/04/2026', status: 'uploaded' }
  ]
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

export default function FreelancerJobDetail() {
  const params = useParams();
  const [job, setJob] = useState({ ...MOCK_JOB, id: params.id as string });
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submittingMilestone, setSubmittingMilestone] = useState<string | null>(null);

  const handleSubmitClick = (milestoneId: string) => {
    setSubmittingMilestone(milestoneId);
    setIsSubmitModalOpen(true);
  };

  const handleConfirmSubmit = () => {
    if (!submittingMilestone) return;
    
    // Simulate updating status to 'review' for Job Master to see
    const newMilestones = job.milestones.map(ms => 
      ms.id === submittingMilestone ? { ...ms, status: 'review' as any } : ms
    );
    setJob({ ...job, milestones: newMilestones });
    setIsSubmitModalOpen(false);
    alert('Báo cáo hoàn thành đã được gửi đến Job Master!');
  };

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
              {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
              {/* @ts-ignore */}
              <LevelBadge level={job.level} />
              <Badge variant="info">Đang thực hiện</Badge>
            </div>
            <h1 className={styles.title}>{job.title}</h1>
            <div className={styles.meta}>
              <span className={styles.mItem}><Clock size={16}/> Hạn cuối: <strong>{job.deadline}</strong></span>
              <span className={styles.mItem}>Ngân sách: <strong className={styles.fee}>{job.fee}</strong></span>
            </div>
          </Card>

          <Card className={styles.progressCard}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Tiến độ tổng thể ({job.progress}%)</h3>
              <Button size="sm" variant="outline">Cập nhật tiến độ</Button>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${job.progress}%` }} />
            </div>
          </Card>

          <Card className={styles.tasksCard}>
            <h3 className={styles.sectionTitle}>Giai đoạn & Thanh toán</h3>
            <div className={styles.milestones}>
              {job.milestones.map((ms, index) => (
                <div key={ms.id} className={`${styles.milestone} ${ms.status === 'in_progress' ? styles.mActive : ''} ${ms.status === 'review' ? styles.mReview : ''}`}>
                  <div className={styles.mLeft}>
                    <div className={styles.mNum}>{index + 1}</div>
                    <div className={styles.mInfo}>
                      <div className={styles.mName}>{ms.name}</div>
                      <div className={styles.mSub}>{ms.percentage}% • {ms.amount}</div>
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
            </div>
          </Card>

          <Card className={styles.filesCard}>
            <h3 className={styles.sectionTitle}>Tài liệu đã nộp</h3>
            {job.deliverables.map(file => (
              <div key={file.id} className={styles.fileItem}>
                <div className={styles.fName}>{file.name}</div>
                <div className={styles.fMeta}>
                  <span>{file.date}</span>
                  <Badge size="sm" variant="outline">Đã nộp</Badge>
                </div>
              </div>
            ))}
          </Card>
        </motion.div>

        <motion.div className={styles.sidebar} initial="hidden" animate="visible" variants={fadeUp}>
          <Card className={styles.contactCard}>
            <h3 className={styles.sTitle}>Job Master Quản lý</h3>
            <div className={styles.mProfile}>
              {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
              {/* @ts-ignore */}
              <Avatar name={job.jobMaster.name} level={job.jobMaster.level} size="md" />
              <div className={styles.mDetails}>
                <div className={styles.mName}>{job.jobMaster.name}</div>
                <div className={styles.mRole}>{job.jobMaster.role}</div>
              </div>
            </div>
            <Button fullWidth variant="outline" className={styles.msgBtn}>
              <MessageSquare size={16} /> Nhắn tin trao đổi
            </Button>
          </Card>

          <Card className={styles.linksCard}>
            <h3 className={styles.sTitle}>Liên kết nhanh</h3>
            <ul className={styles.quickLinks}>
              <li><Link href={`/freelancer/contracts`}>Xem hợp đồng giao khoán</Link></li>
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
