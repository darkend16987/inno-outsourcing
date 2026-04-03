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
import { getJobs, getLeaderboard } from '@/lib/firebase/firestore';
import { getTestimonials, type TestimonialItem } from '@/lib/firebase/system-config';
import type { LeaderboardEntry, Job } from '@/types';
import { getJobUrl } from '@/lib/seo/slug';
import styles from './page.module.css';

// Category icons using distinct Lucide icons with playful colors
const CATEGORIES = [
  { name: 'Kiến trúc', icon: Building2, color: '#0d7c66', emoji: '🏛️' },
  { name: 'Kết cấu', icon: Shield, color: '#6c5ce7', emoji: '🏗️' },
  { name: 'MEP', icon: Cable, color: '#f49d25', emoji: '⚡' },
  { name: 'BIM', icon: Sparkles, color: '#c93b28', emoji: '🧊' },
  { name: 'Dự toán', icon: FileSpreadsheet, color: '#1a8a3e', emoji: '📊' },
  { name: 'Giám sát', icon: Eye, color: '#c47a0a', emoji: '👁️' },
  { name: 'Thẩm tra', icon: Ruler, color: '#d63384', emoji: '📐' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }),
};

function getJobFee(job: Job): number {
  return job.totalFee || 0;
}

function getJobDuration(job: Job): string {
  if (typeof job.duration === 'number') return `${job.duration} ngày`;
  return '';
}

export default function LandingClient() {
  const [jobTab, setJobTab] = useState<'latest' | 'hot'>('latest');
  const [liveJobs, setLiveJobs] = useState<Job[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>([]);
  const [topWorkers, setTopWorkers] = useState<LeaderboardEntry[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  // Computed stats from real data
  const [stats, setStats] = useState([
    { label: 'Dự án đang mở', value: '…', icon: <Briefcase size={20} /> },
    { label: 'Freelancers', value: '…', icon: <Users size={20} /> },
    { label: 'Tổng giá trị HĐ', value: '…', icon: <TrendingUp size={20} /> },
    { label: 'Top Rating', value: '…', icon: <Star size={20} /> },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobResult, testResult, leaderboardResult] = await Promise.allSettled([
          getJobs({ status: 'open' }),
          getTestimonials(),
          getLeaderboard(),
        ]);

        const jobs = jobResult.status === 'fulfilled' ? (jobResult.value.items || []) : [];
        const testRes = testResult.status === 'fulfilled' ? testResult.value : [];
        const leaderboardRes = leaderboardResult.status === 'fulfilled' ? leaderboardResult.value : [];

        if (jobResult.status === 'rejected') console.warn('Landing: getJobs failed:', jobResult.reason);
        if (testResult.status === 'rejected') console.warn('Landing: getTestimonials failed:', testResult.reason);
        if (leaderboardResult.status === 'rejected') console.warn('Landing: getLeaderboard failed:', leaderboardResult.reason);

        setLiveJobs(jobs);
        setTestimonials(testRes.filter(t => t.isActive));
        setTopWorkers(leaderboardRes.slice(0, 4));

        // Compute stats from real data
        const openJobs = jobs.filter(j => j.status === 'draft' || j.status === 'pending_approval' || !j.assignedTo).length;
        const totalValue = jobs.reduce((sum, j) => sum + getJobFee(j), 0);
        const topRating = leaderboardRes.length > 0
          ? Math.max(...leaderboardRes.map(w => w.rating || 0)).toFixed(1)
          : '-';
        setStats([
          { label: 'Dự án đang mở', value: String(openJobs), icon: <Briefcase size={20} /> },
          { label: 'Tổng dự án', value: String(jobs.length), icon: <Users size={20} /> },
          { label: 'Tổng giá trị', value: formatFriendlyMoney(totalValue), icon: <TrendingUp size={20} /> },
          { label: 'Top Rating', value: `${topRating}⭐`, icon: <Star size={20} /> },
        ]);
      } catch (err) {
        console.error('Error fetching landing data:', err);
      }
      setJobsLoading(false);
    };
    fetchData();
  }, []);

  // Compute category counts from real jobs
  const categoryCounts: Record<string, number> = {};
  liveJobs.forEach(j => {
    const cat = j.category;
    if (cat) categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  // Split jobs: "Latest" = sorted by createdAt desc, "Hot" = jobs with highlight tags
  const latestJobs = [...liveJobs].sort((a, b) => {
    const aDate = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
    const bDate = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
    return bDate - aDate;
  }).slice(0, 6);

  const hotJobs = liveJobs.filter(j =>
    j.highlightTags?.some(t => ['HOT', 'Siêu tốc'].includes(t)) || getJobFee(j) >= 50_000_000
  ).slice(0, 6);

  const displayJobs = jobTab === 'hot' ? hotJobs : latestJobs;

  // Build recent activities from real jobs
  const recentActivities = liveJobs
    .filter(j => j.assignedWorkerName || j.status === 'pending_approval')
    .slice(0, 5)
    .map((j, idx) => ({
      id: idx + 1,
      type: !j.assignedTo ? 'new' as const : j.status === 'completed' ? 'complete' as const : 'assign' as const,
      user: j.assignedWorkerName || '',
      job: j.title || '',
      time: 'Gần đây',
      note: j.status === 'completed' ? 'đã hoàn thành' : !j.assignedTo ? 'vừa được đăng tải' : '',
    }));

  // Current month string
  const now = new Date();
  const monthStr = `${now.getMonth() + 1}/${now.getFullYear()}`;

  return (
    <div className={styles.page}>
      {/* ── Activity Feed ── */}
      {recentActivities.length > 0 && (
        <section className={styles.activityFeedWrapper}>
          <div className={styles.activityFeedLabel}>
            <Zap size={16} /> Hoạt động mới:
          </div>
          <div className={styles.activityMarquee}>
            <div className={styles.activityTrack}>
              {[...recentActivities, ...recentActivities].map((activity, idx) => (
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
      )}

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
            {stats.map((stat, i) => (
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
                    <span className={styles.catCount}>{categoryCounts[cat.name] || 0} dự án</span>
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
                  <Link href={getJobUrl(job)} style={{ textDecoration: 'none' }}>
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
          <div className={styles.container}>
            <div className={styles.bannerFlex}>
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
          </div>
        </div>
      </section>

      {/* ── Leaderboard Preview ── */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Vinh danh tháng này</h2>
              <p className={styles.sectionDesc}>Top freelancers xuất sắc nhất tháng {monthStr}</p>
            </div>
            <Link href="/vinh-danh">
              <Button variant="ghost" size="sm" iconRight={<ChevronRight size={16} />}>Xem bảng xếp hạng</Button>
            </Link>
          </div>
          <div className={styles.honorGrid}>
            {topWorkers.length > 0 ? (
              topWorkers.map((worker, i) => (
                <motion.div key={worker.uid || i} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
                  <Card variant={i === 0 ? 'accent' : 'default'} hover className={styles.honorCard}>
                    {i < 3 && (
                      <span className={`${styles.rankBadge} ${styles[`rank${i + 1}`]}`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                      </span>
                    )}
                    <Avatar name={worker.name} size="lg" level={worker.level} />
                    <h4 className={styles.honorName}>{worker.name}</h4>
                    <Badge variant="default">{worker.specialty}</Badge>
                    <div className={styles.honorStats}>
                      <div>
                        <Star size={12} className={styles.starIcon} />
                        <span>{worker.rating?.toFixed(1) || '-'}</span>
                      </div>
                      <div>
                        <Briefcase size={12} />
                        <span>{worker.completedJobs || 0} jobs</span>
                      </div>
                    </div>
                    <span className={styles.honorEarnings}>{formatFriendlyMoney(worker.earnings || 0)}</span>
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className={styles.noJobs}>
                <p>Bảng xếp hạng sẽ được cập nhật khi có dữ liệu.</p>
              </div>
            )}
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
