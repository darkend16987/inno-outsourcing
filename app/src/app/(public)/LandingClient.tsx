'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Briefcase, Users, TrendingUp, Award,
  ArrowRight, Search, Building2, Zap,
  Shield, Clock, Star, ChevronRight
} from 'lucide-react';
import { Button, Badge, Card, MetricCard, Avatar, LevelBadge } from '@/components/ui';
import styles from './page.module.css';

// Mock data for demo
const MOCK_STATS = [
  { label: 'Dự án đang mở', value: '42', icon: <Briefcase size={20} /> },
  { label: 'Freelancers', value: '186', icon: <Users size={20} /> },
  { label: 'Tổng giá trị HĐ', value: '2.8 tỷ', icon: <TrendingUp size={20} /> },
  { label: 'Hoàn thành đúng hạn', value: '94%', icon: <Clock size={20} /> },
];

const MOCK_JOBS = [
  { id: '1', title: 'Thiết kế kiến trúc Nhà xưởng KCN Bình Dương', category: 'Kiến trúc', level: 'L3' as const, fee: '48,000,000₫', duration: '45 ngày', status: 'open' as const },
  { id: '2', title: 'BIM Modeling tổ hợp văn phòng 12 tầng Q7', category: 'BIM', level: 'L4' as const, fee: '65,000,000₫', duration: '60 ngày', status: 'open' as const },
  { id: '3', title: 'Thiết kế kết cấu Bệnh viện Đa khoa Cần Thơ', category: 'Kết cấu', level: 'L5' as const, fee: '120,000,000₫', duration: '90 ngày', status: 'open' as const },
  { id: '4', title: 'Hệ thống MEP chung cư cao cấp Thủ Đức', category: 'MEP', level: 'L3' as const, fee: '55,000,000₫', duration: '50 ngày', status: 'open' as const },
  { id: '5', title: 'Dự toán công trình trường học TPHCM', category: 'Dự toán', level: 'L2' as const, fee: '25,000,000₫', duration: '20 ngày', status: 'open' as const },
  { id: '6', title: 'Thẩm tra PCCC tòa nhà hỗn hợp Hà Nội', category: 'Thẩm tra', level: 'L4' as const, fee: '38,000,000₫', duration: '30 ngày', status: 'open' as const },
];

const MOCK_TOP_WORKERS = [
  { rank: 1, name: 'Nguyễn Thanh Hùng', level: 'L5' as const, specialty: 'BIM', rating: 4.9, jobs: 32, earnings: '680M' },
  { rank: 2, name: 'Trần Minh Tuấn', level: 'L4' as const, specialty: 'Kết cấu', rating: 4.8, jobs: 28, earnings: '520M' },
  { rank: 3, name: 'Lê Thị Hoa', level: 'L4' as const, specialty: 'MEP', rating: 4.9, jobs: 25, earnings: '480M' },
  { rank: 4, name: 'Phạm Đức Anh', level: 'L3' as const, specialty: 'Kiến trúc', rating: 4.7, jobs: 21, earnings: '350M' },
];

const CATEGORIES = [
  { name: 'Kiến trúc', icon: Building2, count: 12, color: '#0d7c66' },
  { name: 'Kết cấu', icon: Shield, count: 8, color: '#6c5ce7' },
  { name: 'MEP', icon: Zap, count: 10, color: '#f49d25' },
  { name: 'BIM', icon: Building2, count: 6, color: '#c93b28' },
  { name: 'Dự toán', icon: TrendingUp, count: 4, color: '#1a8a3e' },
  { name: 'Giám sát', icon: Clock, count: 3, color: '#c47a0a' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] } }),
};

export default function LandingClient() {
  return (
    <div className={styles.page}>
      {/* ── Hero Section ── */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroContent}>
          <motion.div initial="hidden" animate="visible" className={styles.heroText}>
            <motion.span className={styles.heroPill} variants={fadeUp} custom={0}>
              <Zap size={12} /> Nền tảng #1 cho Outsourcing Xây dựng
            </motion.span>
            <motion.h1 className={styles.heroTitle} variants={fadeUp} custom={1}>
              Kết nối <span className={styles.heroHighlight}>Tài năng</span> với{' '}
              <span className={styles.heroHighlight}>Dự án</span> Thiết kế Xây dựng
            </motion.h1>
            <motion.p className={styles.heroDesc} variants={fadeUp} custom={2}>
              Kiến trúc · Kết cấu · MEP · BIM · Dự toán · Giám sát — Tìm kiếm freelancer chuyên nghiệp
              hoặc ứng tuyển các dự án hấp dẫn ngay hôm nay.
            </motion.p>
            <motion.div className={styles.heroActions} variants={fadeUp} custom={3}>
              <Link href="/jobs">
                <Button size="lg" icon={<Search size={18} />}>Tìm việc ngay</Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" size="lg" icon={<ArrowRight size={18} />}>Đăng ký Freelancer</Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className={styles.statsSection}>
        <div className={styles.container}>
          <div className={styles.statsGrid}>
            {MOCK_STATS.map((stat, i) => (
              <motion.div key={stat.label} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
                <MetricCard label={stat.label} value={stat.value} icon={stat.icon} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Lĩnh vực chuyên môn</h2>
              <p className={styles.sectionDesc}>Đa dạng dự án theo từng chuyên ngành thiết kế xây dựng</p>
            </div>
          </div>
          <div className={styles.catGrid}>
            {CATEGORIES.map((cat, i) => (
              <motion.div key={cat.name} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
                <Card hover className={styles.catCard}>
                  <div className={styles.catIcon} style={{ background: `${cat.color}15`, color: cat.color }}>
                    <cat.icon size={22} />
                  </div>
                  <h3 className={styles.catName}>{cat.name}</h3>
                  <span className={styles.catCount}>{cat.count} dự án</span>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Latest Jobs ── */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Việc làm mới nhất</h2>
              <p className={styles.sectionDesc}>Cơ hội hợp tác hấp dẫn đang chờ bạn</p>
            </div>
            <Link href="/jobs">
              <Button variant="ghost" size="sm" iconRight={<ChevronRight size={16} />}>Xem tất cả</Button>
            </Link>
          </div>
          <div className={styles.jobsGrid}>
            {MOCK_JOBS.map((job, i) => (
              <motion.div key={job.id} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
                <Link href={`/jobs/${job.id}`} style={{ textDecoration: 'none' }}>
                  <Card hover className={styles.jobCard}>
                    <div className={styles.jobTop}>
                      <Badge variant="default">{job.category}</Badge>
                      <LevelBadge level={job.level} />
                    </div>
                    <h3 className={styles.jobTitle}>{job.title}</h3>
                    <div className={styles.jobMeta}>
                      <span className={styles.jobFee}>{job.fee}</span>
                      <span className={styles.jobDuration}>
                        <Clock size={12} /> {job.duration}
                      </span>
                    </div>
                    <div className={styles.jobCta}>
                      <span>Xem chi tiết</span>
                      <ArrowRight size={14} />
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Leaderboard Preview ── */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Vinh danh tháng này</h2>
              <p className={styles.sectionDesc}>Top freelancers xuất sắc nhất tháng 4/2026</p>
            </div>
            <Link href="/leaderboard">
              <Button variant="ghost" size="sm" iconRight={<ChevronRight size={16} />}>Xem bảng xếp hạng</Button>
            </Link>
          </div>
          <div className={styles.honorGrid}>
            {MOCK_TOP_WORKERS.map((worker, i) => (
              <motion.div key={worker.rank} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
                <Card variant={worker.rank === 1 ? 'accent' : 'default'} hover className={styles.honorCard}>
                  {worker.rank <= 3 && (
                    <span className={`${styles.rankBadge} ${styles[`rank${worker.rank}`]}`}>
                      {worker.rank === 1 ? '🥇' : worker.rank === 2 ? '🥈' : '🥉'}
                    </span>
                  )}
                  <Avatar name={worker.name} size="lg" level={worker.level} />
                  <h4 className={styles.honorName}>{worker.name}</h4>
                  <Badge variant="default">{worker.specialty}</Badge>
                  <div className={styles.honorStats}>
                    <div>
                      <Star size={12} className={styles.starIcon} />
                      <span>{worker.rating}</span>
                    </div>
                    <div>
                      <Briefcase size={12} />
                      <span>{worker.jobs} jobs</span>
                    </div>
                  </div>
                  <span className={styles.honorEarnings}>{worker.earnings} VND</span>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <motion.div className={styles.ctaCard} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className={styles.ctaTitle}>Sẵn sàng bắt đầu?</h2>
            <p className={styles.ctaDesc}>
              Đăng ký ngay để ứng tuyển các dự án thiết kế xây dựng hấp dẫn hoặc tìm kiếm freelancer chuyên nghiệp cho dự án của bạn.
            </p>
            <div className={styles.ctaActions}>
              <Link href="/register">
                <Button size="lg" variant="warning" icon={<ArrowRight size={18} />}>Đăng ký miễn phí</Button>
              </Link>
              <Link href="/jobs">
                <Button size="lg" variant="ghost" style={{ color: '#fff' }}>Khám phá việc làm →</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
