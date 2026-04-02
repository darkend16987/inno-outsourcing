'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Clock, Briefcase, Calendar, 
  Sparkles, Zap, Star, Target, Send,
  FileText, MessageSquare, Info
} from 'lucide-react';
import { Button, Badge, Card, LevelBadge, Avatar, Skeleton } from '@/components/ui';
import type { Job } from '@/types';
import { getJobById } from '@/lib/firebase/firestore';
import { formatFriendlyMoney, formatDate } from '@/lib/formatters';
import styles from './page.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    async function fetchJob() {
      try {
        setLoading(true);
        const data = await getJobById(jobId);
        setJob(data);
      } catch (error) {
        console.error('Error fetching job:', error);
      } finally {
        setLoading(false);
      }
    }
    if (jobId) fetchJob();
  }, [jobId]);

  const handleApply = () => {
    setIsApplying(true);
    // Simulate application process
    setTimeout(() => {
      setIsApplying(false);
      alert('Đã gửi yêu cầu nhận việc thành công! Hệ thống sẽ thông báo kết quả cho bạn sớm nhất.');
    }, 1500);
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
                  {job.workMode === 'remote' ? 'Từ xa 🏠' : job.workMode === 'on-site' ? 'Tại công trường 🏗️' : 'Kết hợp 🏢'}
                </Badge>
                {job.highlightTags?.map(tag => (
                  <Badge key={tag} size="sm" variant="secondary">#{tag}</Badge>
                ))}
              </div>
              <h1 className={styles.title}>{job.title}</h1>
              
              <div className={styles.meta}>
                <div className={styles.metaItem}><Clock size={16} color="var(--color-primary)"/> Đăng ngày: {formatDate(job.createdAt)}</div>
                <div className={styles.metaItem}><Calendar size={16} color="var(--color-warning)"/> Hạn nộp: {formatDate(job.deadline)}</div>
                <div className={styles.metaItem}><Target size={16} color="var(--color-success)"/> Bắt đầu: {job.startDate ? formatDate(job.startDate) : 'Thỏa thuận'}</div>
              </div>
            </div>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}><Briefcase size={20} /> Mô tả công việc</h2>
              <div className={styles.content}>
                {job.description.split('\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}><Zap size={20} /> Yêu cầu công việc</h2>
              <ul className={styles.reqList}>
                <li><strong>Kinh nghiệm:</strong> {job.requirements.experience}</li>
                <li><strong>Chứng chỉ:</strong> {job.requirements.certifications}</li>
                <li><strong>Phần mềm:</strong> 
                  <div className={styles.softwareGrid}>
                    {job.requirements.software.map(sw => <Badge key={sw} size="sm" variant="outline" className={styles.swBadge}>{sw}</Badge>)}
                  </div>
                </li>
                <li><strong>Tiêu chuẩn:</strong> {job.requirements.standards.join(', ')}</li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}><Star size={20} /> Giai đoạn thanh toán (Milestones)</h2>
              <div className={styles.milestones}>
                {job.milestones.map((ms, index) => (
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

            {job.attachments && job.attachments.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}><FileText size={20} /> File đính kèm</h2>
                <div className={styles.chipRow}>
                  {job.attachments.map((file, idx) => (
                    <Badge key={idx} variant="outline" className={styles.fileChip}>
                      {file.type.toUpperCase()} | {file.name}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}><MessageSquare size={20} /> Bình luận (4)</h2>
              <div className={styles.commentBox}>
                <div className={styles.commentTop}>
                  <Avatar name="Me" size="md" />
                  <div className={styles.commentBody}>
                    <strong>Bạn</strong>
                    <textarea className={styles.commentInput} placeholder="Đặt câu hỏi về công việc này..." />
                  </div>
                </div>
                <div className={styles.commentActions}>
                  <Button size="sm" icon={<Send size={14}/>}>Gửi câu hỏi</Button>
                </div>
              </div>
              
              {/* Note: In real app, these would be fetched from a comments collection */}
              <div className={styles.commentStream}>
                <Card className={styles.commentCard} padding="sm">
                  <div className={styles.commentTop}>
                    <Avatar name={job.jobMasterName} size="md" />
                    <div className={styles.commentBody}>
                      <div className={styles.metaRow}>
                        <strong className={styles.commentName}>{job.jobMasterName}</strong>
                        <Badge variant="status" status="in_progress" size="sm">Quản lý</Badge>
                      </div>
                      <span className={styles.commentTime}>Vừa xong</span>
                      <p className={styles.commentText}>Mốc 50% được xác nhận khi hoàn thành toàn bộ model core, façade và coordination sheet tầng điển hình.</p>
                      <div className={styles.commentFooter}>
                        <span>Thích</span><span>Trả lời</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </section>
          </motion.div>

          {/* Sidebar */}
          <motion.div className={styles.sidebar} initial="hidden" animate="visible" variants={fadeUp}>
            <Card className={styles.actionCard} glow>
              <div className={styles.feeBlock}>
                <span className={styles.feeLabel}>Ngân sách dự kiến</span>
                <div className={styles.feeVal}>{formatFriendlyMoney(job.totalFee)}</div>
                <div className={styles.duration}>Thời gian: <strong>{job.duration} ngày</strong></div>
              </div>

              <div className={styles.actionBlock}>
                <Button 
                  fullWidth 
                  size="lg" 
                  onClick={handleApply} 
                  loading={isApplying}
                  icon={<Sparkles size={18} />}
                >
                  Nộp hồ sơ ứng tuyển
                </Button>
                <div className={styles.actionHint}>
                  Yêu cầu Level {job.level} để tối ưu cơ hội trúng tuyển.
                </div>
              </div>

              <div className={styles.masterInfo}>
                <div className={styles.mLabel}>Người quản lý công việc</div>
                <div className={styles.mProfile}>
                  <Avatar name={job.jobMasterName} level={job.level} size="md" />
                  <div className={styles.mDetails}>
                    <div className={styles.mName}>{job.jobMasterName}</div>
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
    </div>
  );
}
