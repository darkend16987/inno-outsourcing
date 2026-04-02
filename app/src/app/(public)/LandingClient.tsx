'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Briefcase, Users, TrendingUp,
  ArrowRight, Search, Building2, Zap,
  Shield, Clock, Star, ChevronRight
} from 'lucide-react';
import { Button, Badge, Card, MetricCard, Avatar, LevelBadge } from '@/components/ui';
import { formatFriendlyMoney } from '@/lib/formatters';
import styles from './page.module.css';

// Mock data for demo
const MOCK_ACTIVITIES = [
  { id: 1, type: 'assign', user: 'Trần Minh Tuấn', job: 'BIM Modeling tổ hợp văn phòng', time: '10 phút trước' },
  { id: 2, type: 'payment', user: 'Lê Thị Hoa', job: 'Hệ thống MEP chung cư', time: '1 giờ trước', note: 'nhận thanh toán 100%' },
  { id: 3, type: 'complete', user: 'Nguyễn Thanh Hùng', job: 'Thiết kế kiến trúc Nhà xưởng', time: '3 giờ trước', note: 'vừa hoàn thành xuất sắc' },
  { id: 4, type: 'assign', user: 'Phạm Đức Anh', job: 'Dự toán công trình trường học', time: '5 giờ trước' },
  { id: 5, type: 'new', job: 'Thẩm tra PCCC tòa nhà hỗn hợp Hà Nội', time: 'Vừa xong', note: 'mới được đăng tải' },
];

const MOCK_STATS = [
  { label: 'Dự án đang mở', value: '42', icon: <Briefcase size={20} /> },
  { label: 'Freelancers', value: '186', icon: <Users size={20} /> },
  { label: 'Tổng giá trị HĐ', value: '2.8 tỏi', icon: <TrendingUp size={20} /> },
  { label: 'Hoàn thành đúng hạn', value: '94%', icon: <Clock size={20} /> },
];

const MOCK_JOBS = [
  { id: '1', title: 'Thiết kế kiến trúc Nhà xưởng KCN Bình Dương', category: 'Kiến trúc', level: 'L3' as const, fee: 48000000, duration: '45 ngày', status: 'open' as const },
  { id: '2', title: 'BIM Modeling tổ hợp văn phòng 12 tầng Q7', category: 'BIM', level: 'L4' as const, fee: 65000000, duration: '60 ngày', status: 'open' as const },
  { id: '3', title: 'Thiết kế kết cấu Bệnh viện Đa khoa Cần Thơ', category: 'Kết cấu', level: 'L5' as const, fee: 120000000, duration: '90 ngày', status: 'open' as const },
  { id: '4', title: 'Hệ thống MEP chung cư cao cấp Thủ Đức', category: 'MEP', level: 'L3' as const, fee: 55000000, duration: '50 ngày', status: 'open' as const },
  { id: '5', title: 'Dự toán công trình trường học TPHCM', category: 'Dự toán', level: 'L2' as const, fee: 25000000, duration: '20 ngày', status: 'open' as const },
  { id: '6', title: 'Thẩm tra PCCC tòa nhà hỗn hợp Hà Nội', category: 'Thẩm tra', level: 'L4' as const, fee: 38000000, duration: '30 ngày', status: 'open' as const },
];

const MOCK_TOP_WORKERS = [
  { rank: 1, name: 'Nguyễn Thanh Hùng', level: 'L5' as const, specialty: 'BIM', rating: 4.9, jobs: 32, earnings: 680000000 },
  { rank: 2, name: 'Trần Minh Tuấn', level: 'L4' as const, specialty: 'Kết cấu', rating: 4.8, jobs: 28, earnings: 520000000 },
  { rank: 3, name: 'Lê Thị Hoa', level: 'L4' as const, specialty: 'MEP', rating: 4.9, jobs: 25, earnings: 480000000 },
  { rank: 4, name: 'Phạm Đức Anh', level: 'L3' as const, specialty: 'Kiến trúc', rating: 4.7, jobs: 21, earnings: 350000000 },
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
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }),
};

export default function LandingClient() {
  return (
    <div className={styles.page}>
      {/* ── Activity Feed ── */}
      <section className={styles.activityFeedWrapper}>
        <div className={styles.activityFeedLabel}>
          <Zap size={16} /> Hoạt động mới:
        </div>
        <div className={styles.activityMarquee}>
          {/* Double track to create seamless infinite loop */}
          <div className={styles.activityTrack}>
            {[...MOCK_ACTIVITIES, ...MOCK_ACTIVITIES].map((activity, idx) => (
              <div key={`${activity.id}-${idx}`} className={styles.activityItem}>
                <span className={styles.activityTime}>{activity.time}</span>
                {activity.type === 'new' ? (
                  <>
                    Dự án <span className={styles.activityHighlight}>{activity.job}</span> {activity.note}
                  </>
                ) : activity.type === 'assign' ? (
                  <>
                    <span className={styles.activityHighlight}>{activity.user}</span> đã nhận dự án <span className={styles.activityHighlight}>{activity.job}</span>
                  </>
                ) : (
                  <>
                    <span className={styles.activityHighlight}>{activity.user}</span> {activity.note} dự án <span className={styles.activityHighlight}>{activity.job}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

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
                <Link href={`/jobs?category=${encodeURIComponent(cat.name)}`} style={{ textDecoration: 'none' }}>
                  <Card hover className={styles.catCard}>
                    <div className={styles.catIcon} style={{ background: `${cat.color}15`, color: cat.color }}>
                      <cat.icon size={22} />
                    </div>
                    <h3 className={styles.catName}>{cat.name}</h3>
                    <span className={styles.catCount}>{cat.count} dự án</span>
                    <span className={styles.catArrow}><ArrowRight size={14} /></span>
                  </Card>
                </Link>
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
                      <span className={styles.jobFee}>{formatFriendlyMoney(job.fee)}</span>
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
            <Link href="/vinh-danh">
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
                  <span className={styles.honorEarnings}>{formatFriendlyMoney(worker.earnings)}</span>
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
