'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, MapPin, Clock, Briefcase, Calendar, 
  CheckCircle2, FileText, UploadCloud, ChevronRight 
} from 'lucide-react';
import { Button, Badge, Card, LevelBadge, Avatar } from '@/components/ui';
import type { JobLevel, WorkMode } from '@/types';
import styles from './page.module.css';

// Extended mock job data for detail page
const MOCK_JOB = {
  id: '3',
  title: 'Thiết kế kết cấu Bệnh viện Đa khoa Cần Thơ',
  category: 'Kết cấu',
  level: 'L5' as JobLevel,
  fee: '120,000,000₫',
  duration: '90 ngày',
  workMode: 'on-site' as WorkMode,
  createdAt: '2026-04-01',
  deadline: '2026-04-15',
  startDate: '2026-05-01',
  status: 'open',
  jobMaster: {
    name: 'Trần Văn Hoàng',
    role: 'Trưởng phòng Kết cấu',
    level: 'L5' as JobLevel,
  },
  desc: `Thiết kế kết cấu BTCT, thép cho bệnh viện 200 giường, 8 tầng + 2 tầng hầm.
Dự án trọng điểm yêu cầu độ chính xác cao và xử lý móng phức tạp do địa chất nền đất yếu tại khu vực đồng bằng sông Cửu Long. Khối lượng công việc bao gồm tính toán kết cấu toàn công trình, bóc tách khối lượng và ra bản vẽ thi công.`,
  requirements: {
    experience: 'Ít nhất 7 năm kinh nghiệm thiết kế kết cấu nhà cao tầng hoặc công trình công cộng lớn.',
    certifications: 'Chứng chỉ hành nghề Thiết kế Kết cấu hạng I.',
    software: ['Etabs', 'Safe', 'Revit Structure', 'AutoCAD'],
    standards: ['TCVN 5574:2018', 'TCVN 2737:2023', 'QCVN 06:2022'],
  },
  milestones: [
    { id: 'm1', name: 'Thiết kế cơ sở & Thống nhất phương án', percentage: 20, amount: '24,000,000₫' },
    { id: 'm2', name: 'Bản vẽ Thiết kế Kỹ thuật (TKKT)', percentage: 40, amount: '48,000,000₫' },
    { id: 'm3', name: 'Bản vẽ Thi công (BVTC) & Bóc khối lượng', percentage: 30, amount: '36,000,000₫' },
    { id: 'm4', name: 'Bảo hành thiết kế (sau khi ra giấy phép)', percentage: 10, amount: '12,000,000₫' },
  ]
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export default function JobDetailPage() {
  const params = useParams();
  const [isApplying, setIsApplying] = useState(false);

  // In real app, fetch job based on params.id
  const job = { ...MOCK_JOB, id: params.id as string };

  const handleApply = () => {
    setIsApplying(true);
    // Simulate application process
    setTimeout(() => {
      setIsApplying(false);
      alert('Đã gửi yêu cầu nhận việc thành công!');
    }, 1500);
  };

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
                <Badge variant="default">{job.category}</Badge>
                <LevelBadge level={job.level} />
                <Badge size="sm">{job.workMode === 'remote' ? 'Từ xa' : job.workMode === 'on-site' ? 'Tại công trường' : 'Kết hợp'}</Badge>
              </div>
              <h1 className={styles.title}>{job.title}</h1>
              
              <div className={styles.meta}>
                <div className={styles.metaItem}><Clock size={16}/> Đăng ngày: {job.createdAt}</div>
                <div className={styles.metaItem}><Calendar size={16}/> Hạn nộp: {job.deadline}</div>
                <div className={styles.metaItem}><Briefcase size={16}/> Bắt đầu: {job.startDate}</div>
              </div>
            </div>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Mô tả công việc</h2>
              <div className={styles.content}>
                {job.desc.split('\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Yêu cầu công việc</h2>
              <ul className={styles.reqList}>
                <li><strong>Kinh nghiệm:</strong> {job.requirements.experience}</li>
                <li><strong>Chứng chỉ:</strong> {job.requirements.certifications}</li>
                <li><strong>Phần mềm:</strong> 
                  <div className={styles.softwareGrid}>
                    {job.requirements.software.map(sw => <Badge key={sw} size="sm" variant="outline">{sw}</Badge>)}
                  </div>
                </li>
                <li><strong>Tiêu chuẩn:</strong> {job.requirements.standards.join(', ')}</li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Giai đoạn thanh toán (Milestones)</h2>
              <div className={styles.milestones}>
                {job.milestones.map((ms, index) => (
                  <div key={ms.id} className={styles.milestone}>
                    <div className={styles.mLeft}>
                      <div className={styles.mNum}>{index + 1}</div>
                      <div className={styles.mName}>{ms.name}</div>
                    </div>
                    <div className={styles.mRight}>
                      <div className={styles.mPercent}>{ms.percentage}%</div>
                      <div className={styles.mAmount}>{ms.amount}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </motion.div>

          {/* Sidebar */}
          <motion.div className={styles.sidebar} initial="hidden" animate="visible" variants={fadeUp}>
            <Card className={styles.actionCard}>
              <div className={styles.feeBlock}>
                <span className={styles.feeLabel}>Ngân sách dự kiến</span>
                <div className={styles.feeVal}>{job.fee}</div>
                <div className={styles.duration}>Thời gian: <strong>{job.duration}</strong></div>
              </div>

              <div className={styles.actionBlock}>
                <Button fullWidth size="lg" onClick={handleApply} isLoading={isApplying}>Nộp hồ sơ ứng tuyển</Button>
                <div className={styles.actionHint}>Bạn cần có hồ sơ đạt level {job.level} để ứng tuyển.</div>
              </div>

              <div className={styles.masterInfo}>
                <div className={styles.mLabel}>Job Master</div>
                <div className={styles.mProfile}>
                  <Avatar name={job.jobMaster.name} level={job.jobMaster.level} size="md" />
                  <div className={styles.mDetails}>
                    <div className={styles.mName}>{job.jobMaster.name}</div>
                    <div className={styles.mRole}>{job.jobMaster.role}</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className={styles.infoCard}>
              <h3 className={styles.infoTitle}>Quy trình làm việc</h3>
              <ul className={styles.checklist}>
                <li><CheckCircle2 size={16} /> Ứng tuyển & Xét duyệt hồ sơ</li>
                <li><CheckCircle2 size={16} /> Phỏng vấn & Chốt hợp đồng</li>
                <li><CheckCircle2 size={16} /> Nhận việc & Báo cáo tiến độ</li>
                <li><CheckCircle2 size={16} /> Nghiệm thu & Thanh toán</li>
              </ul>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
