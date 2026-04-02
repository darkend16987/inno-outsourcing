'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Briefcase, Users, TrendingUp,
  ArrowRight, Search, Zap, Ruler,
  Shield, Clock, Star, ChevronRight, Flame,
  Sparkles, Quote, Building2, Cable, FileSpreadsheet, Eye
} from 'lucide-react';
import { Button, Badge, Card, MetricCard, Avatar, LevelBadge } from '@/components/ui';
import { formatFriendlyMoney } from '@/lib/formatters';
import { getJobs } from '@/lib/firebase/firestore';
import { getTestimonials, type TestimonialItem } from '@/lib/firebase/system-config';
import styles from './page.module.css';

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

const MOCK_TOP_WORKERS = [
  { rank: 1, name: 'Nguyễn Thanh Hùng', level: 'L5' as const, specialty: 'BIM', rating: 4.9, jobs: 32, earnings: 680000000 },
  { rank: 2, name: 'Trần Minh Tuấn', level: 'L4' as const, specialty: 'Kết cấu', rating: 4.8, jobs: 28, earnings: 520000000 },
  { rank: 3, name: 'Lê Thị Hoa', level: 'L4' as const, specialty: 'MEP', rating: 4.9, jobs: 25, earnings: 480000000 },
  { rank: 4, name: 'Phạm Đức Anh', level: 'L3' as const, specialty: 'Kiến trúc', rating: 4.7, jobs: 21, earnings: 350000000 },
];

// Category icons using distinct Lucide icons with playful colors
const CATEGORIES = [
  { name: 'Kiến trúc', icon: Building2, count: 12, color: '#0d7c66', emoji: '🏛️' },
  { name: 'Kết cấu', icon: Shield, count: 8, color: '#6c5ce7', emoji: '🏗️' },
  { name: 'MEP', icon: Cable, count: 10, color: '#f49d25', emoji: '⚡' },
  { name: 'BIM', icon: Sparkles, count: 6, color: '#c93b28', emoji: '🧊' },
  { name: 'Dự toán', icon: FileSpreadsheet, count: 4, color: '#1a8a3e', emoji: '📊' },
  { name: 'Giám sát', icon: Eye, count: 3, color: '#c47a0a', emoji: '👁️' },
  { name: 'Thẩm tra', icon: Ruler, count: 2, color: '#d63384', emoji: '📐' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }),
};

function getJobFee(job: Record<string, unknown>): number {
  if (typeof job.totalFee === 'number') return job.totalFee;
  if (typeof job.fee === 'number') return job.fee;
  return 0;
}

function getJobDuration(job: Record<string, unknown>): string {
  if (typeof job.duration === 'number') return `${job.duration} ngày`;
  if (typeof job.duration === 'string') return job.duration;
  return '';
}

export default function LandingClient() {
  const [jobTab, setJobTab] = useState<'latest' | 'hot'>('latest');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [liveJobs, setLiveJobs] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobRes, testRes] = await Promise.all([
          getJobs(),
          getTestimonials(),
        ]);
        setLiveJobs(jobRes.items || []);
        setTestimonials(testRes.filter(t => t.isActive));
      } catch (err) {
        console.error('Error fetching landing data:', err);
      }
      setJobsLoading(false);
    };
    fetchData();
  }, []);

  // Split jobs: "Latest" = sorted by createdAt desc, "Hot" = jobs with highlight tags
  const latestJobs = [...liveJobs].sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return bTime - aTime;
  }).slice(0, 6);

  const hotJobs = liveJobs.filter(j =>
    j.highlightTags?.some((t: string) => ['HOT', 'Siêu tốc'].includes(t)) || getJobFee(j) >= 50_000_000
  ).slice(0, 6);

  const displayJobs = jobTab === 'hot' ? hotJobs : latestJobs;

  return (
    <div className={styles.page}>
      {/* ── Activity Feed ── */}
      <section className={styles.activityFeedWrapper}>
        <div className={styles.activityFeedLabel}>
          <Zap size={16} /> Hoạt động mới:
        </div>
        <div className={styles.activityMarquee}>
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
                      <span className={styles.catEmoji}>{cat.emoji}</span>
                      <cat.icon size={20} />
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

      {/* ── Jobs with Tabs (Latest / Hot) ── */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Việc làm</h2>
              <p className={styles.sectionDesc}>Cơ hội hợp tác hấp dẫn đang chờ bạn</p>
            </div>
            <Link href="/jobs">
              <Button variant="ghost" size="sm" iconRight={<ChevronRight size={16} />}>Xem tất cả</Button>
            </Link>
          </div>

          {/* Tab Switch */}
          <div className={styles.jobTabs}>
            <button
              className={`${styles.jobTab} ${jobTab === 'latest' ? styles.jobTabActive : ''}`}
              onClick={() => setJobTab('latest')}
            >
              <Sparkles size={14} /> Mới nhất
            </button>
            <button
              className={`${styles.jobTab} ${jobTab === 'hot' ? styles.jobTabActive : ''}`}
              onClick={() => setJobTab('hot')}
            >
              <Flame size={14} /> Hot 🔥
            </button>
          </div>

          {jobsLoading ? (
            <div className={styles.jobsLoading}>
              <div className={styles.spinner} />
              <p>Đang tải việc làm...</p>
            </div>
          ) : (
            <div className={styles.jobsGrid}>
              {displayJobs.map((job, i) => (
                <motion.div key={job.id} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
                  <Link href={`/jobs/${job.id}`} style={{ textDecoration: 'none' }}>
                    <Card hover className={styles.jobCard}>
                      <div className={styles.jobTop}>
                        <Badge variant="default">{job.category}</Badge>
                        <LevelBadge level={job.level} />
                        {job.highlightTags?.map((tag: string) => (
                          <Badge key={tag} variant="error" size="sm">{tag}</Badge>
                        ))}
                      </div>
                      <h3 className={styles.jobTitle}>{job.title}</h3>
                      <div className={styles.jobMeta}>
                        <span className={styles.jobFee}>{formatFriendlyMoney(getJobFee(job))}</span>
                        <span className={styles.jobDuration}>
                          <Clock size={12} /> {getJobDuration(job)}
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
              {displayJobs.length === 0 && (
                <div className={styles.noJobs}>
                  <p>{jobTab === 'hot' ? 'Chưa có việc HOT nào.' : 'Chưa có việc nào.'}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Banner Section ── */}
      <section className={styles.bannerSection}>
        <div className={styles.bannerInner}>
          <div className={styles.bannerContent}>
            <h2 className={styles.bannerTitle}>🚀 Bạn là chuyên gia xây dựng?</h2>
            <p className={styles.bannerDesc}>Tham gia cộng đồng freelancer thiết kế xây dựng lớn nhất Việt Nam. Nhận dự án, tạo thu nhập bền vững.</p>
            <Link href="/register">
              <Button size="lg" variant="warning" icon={<ArrowRight size={18} />}>Đăng ký ngay — Miễn phí</Button>
            </Link>
          </div>
          <div className={styles.bannerDeco}>
            <span className={styles.bannerEmoji}>🏗️</span>
            <span className={styles.bannerEmoji}>📐</span>
            <span className={styles.bannerEmoji}>💼</span>
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

      {/* ── Testimonials Section ── */}
      {testimonials.length > 0 && (
        <section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Mọi người nói gì về chúng tôi</h2>
                <p className={styles.sectionDesc}>Phản hồi từ cộng đồng freelancer và đối tác</p>
              </div>
            </div>
            <div className={styles.testimonialsGrid}>
              {testimonials.slice(0, 4).map((t, i) => (
                <motion.div key={t.id} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
                  <Card className={styles.testimonialCard}>
                    <Quote size={20} className={styles.quoteIcon} />
                    <p className={styles.testimonialText}>{t.content}</p>
                    <div className={styles.testimonialAuthor}>
                      <div className={styles.testimonialAvatar}>
                        {t.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <strong className={styles.testimonialName}>{t.name}</strong>
                        <span className={styles.testimonialRole}>{t.role} — {t.company}</span>
                      </div>
                    </div>
                    <div className={styles.testimonialStars}>
                      {Array.from({ length: t.rating }).map((_, si) => (
                        <Star key={si} size={14} fill="#f49d25" color="#f49d25" />
                      ))}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

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
