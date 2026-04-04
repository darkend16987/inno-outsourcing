'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Building2, Users, Target, Award, ArrowRight,
  CheckCircle, Briefcase, Star, Shield, Zap
} from 'lucide-react';
import { Button } from '@/components/ui';
import styles from './page.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
  }),
};

const MILESTONES = [
  { year: '2007', title: 'Thành lập VAA', desc: 'Công ty TNHH Tư vấn kiến trúc Việt Nam được thành lập với sứ mệnh nâng tầm chất lượng tư vấn thiết kế Việt Nam.' },
  { year: '2012', title: 'Mở rộng dịch vụ', desc: 'Bổ sung các lĩnh vực kết cấu, MEP, BIM và quản lý dự án. Đội ngũ vượt 50 chuyên gia.' },
  { year: '2018', title: 'Chuyển đổi số', desc: 'Đầu tư vào công nghệ BIM và các công cụ thiết kế hiện đại, nâng cao năng lực cạnh tranh quốc tế.' },
  { year: '2023', title: 'Ra mắt VAA JOB', desc: 'Xây dựng nền tảng kết nối cộng đồng freelancer ngành tư vấn thiết kế xây dựng, mở rộng mô hình outsourcing chuyên nghiệp.' },
];

const VALUES = [
  { icon: Shield, title: 'Uy tín & Chuyên nghiệp', desc: 'Hơn 17 năm kinh nghiệm trong ngành tư vấn thiết kế xây dựng. Mỗi dự án là một cam kết về chất lượng.' },
  { icon: Users, title: 'Cộng đồng vững mạnh', desc: 'Xây dựng môi trường làm việc linh hoạt, nơi các KTS và KS trẻ phát triển sự nghiệp theo cách của mình.' },
  { icon: Zap, title: 'Đổi mới liên tục', desc: 'Luôn cập nhật xu hướng công nghệ mới nhất: BIM, parametric design, sustainable architecture.' },
  { icon: Target, title: 'Hướng đến mục tiêu', desc: 'Giúp freelancer có thu nhập bền vững từ công việc đúng chuyên môn, dù làm việc từ bất kỳ đâu.' },
];

const STATS = [
  { value: '17+', label: 'Năm kinh nghiệm' },
  { value: '500+', label: 'Dự án hoàn thành' },
  { value: '200+', label: 'Đối tác doanh nghiệp' },
  { value: '1000+', label: 'Freelancer trong mạng lưới' },
];

export default function AboutPage() {
  return (
    <div className={styles.page}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroContent}>
          <motion.div initial="hidden" animate="visible" className={styles.heroText}>
            <motion.span className={styles.heroPill} variants={fadeUp} custom={0}>
              <Building2 size={14} /> Về chúng tôi
            </motion.span>
            <motion.h1 className={styles.heroTitle} variants={fadeUp} custom={1}>
              Công ty TNHH<br />
              <span className={styles.heroHighlight}>Tư vấn Kiến trúc</span><br />
              Việt Nam
            </motion.h1>
            <motion.p className={styles.heroDesc} variants={fadeUp} custom={2}>
              Thành lập năm 2007 với sứ mệnh phát triển ngành tư vấn thiết kế xây dựng Việt Nam.
              Qua hơn 17 năm hoạt động, VAA đã trở thành cầu nối tin cậy giữa các nhà đầu tư và
              những chuyên gia kiến trúc, kỹ thuật hàng đầu.
            </motion.p>
          </motion.div>

          {/* ── Unsplash architectural images ── */}
          <motion.div className={styles.heroImages} variants={fadeUp} custom={3} initial="hidden" animate="visible">
            <div className={styles.imgCard} style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop)' }}>
              <div className={styles.imgOverlay}><span>KTS đang làm việc</span></div>
            </div>
            <div className={styles.imgCardTall} style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=400&h=500&fit=crop)' }}>
              <div className={styles.imgOverlay}><span>Thiết kế từ xa</span></div>
            </div>
            <div className={styles.imgCard} style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1574180566232-aaad1b5b8450?w=400&h=300&fit=crop)' }}>
              <div className={styles.imgOverlay}><span>Cộng đồng chuyên nghiệp</span></div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className={styles.statsSection}>
        <div className={styles.container}>
          <div className={styles.statsGrid}>
            {STATS.map((s, i) => (
              <motion.div key={s.label} className={styles.statCard} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
                <div className={styles.statValue}>{s.value}</div>
                <div className={styles.statLabel}>{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission ── */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.missionBlock}>
            <motion.div className={styles.missionText} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <span className={styles.sectionLabel}>Sứ mệnh</span>
              <h2 className={styles.sectionTitle}>
                Xây dựng cộng đồng<br />freelancer <span className={styles.highlight}>chuyên nghiệp nhất</span><br />ngành TVTK xây dựng
              </h2>
              <p className={styles.missionDesc}>
                VAA JOB ra đời từ niềm tin rằng các Kiến trúc sư, Kỹ sư trẻ Việt Nam hoàn toàn
                có thể xây dựng sự nghiệp tự do nhưng vẫn bài bản, chuyên nghiệp. Chúng tôi
                tạo ra nền tảng để họ:
              </p>
              <ul className={styles.missionList}>
                {[
                  'Tìm được công việc phù hợp chuyên môn, thu nhập tốt',
                  'Làm việc linh hoạt — từ nhà, văn phòng hay bất kỳ đâu',
                  'Được thanh toán nhanh chóng, minh bạch',
                  'Xây dựng hồ sơ năng lực và uy tín trong ngành',
                  'Học hỏi và phát triển qua mạng lưới chuyên gia',
                ].map((item, i) => (
                  <li key={i}><CheckCircle size={16} className={styles.checkIcon} />{item}</li>
                ))}
              </ul>
            </motion.div>
            <motion.div className={styles.missionImage} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
              <div
                className={styles.bigImage}
                style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1521737852567-6949f3f9f2b5?w=600&h=700&fit=crop)' }}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Giá trị cốt lõi</span>
            <h2 className={styles.sectionTitle}>Những gì chúng tôi tin tưởng</h2>
          </div>
          <div className={styles.valuesGrid}>
            {VALUES.map((v, i) => (
              <motion.div key={v.title} className={styles.valueCard} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
                <div className={styles.valueIcon}><v.icon size={24} /></div>
                <h3 className={styles.valueTitle}>{v.title}</h3>
                <p className={styles.valueDesc}>{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Timeline ── */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Hành trình</span>
            <h2 className={styles.sectionTitle}>Lịch sử phát triển</h2>
          </div>
          <div className={styles.timeline}>
            {MILESTONES.map((m, i) => (
              <motion.div key={m.year} className={`${styles.timelineItem} ${i % 2 === 1 ? styles.timelineRight : ''}`} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
                <div className={styles.timelineYear}>{m.year}</div>
                <div className={styles.timelineDot} />
                <div className={styles.timelineCard}>
                  <h4 className={styles.timelineTitle}>{m.title}</h4>
                  <p className={styles.timelineDesc}>{m.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team image block ── */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.container}>
          <div className={styles.teamBlock}>
            <motion.div className={styles.teamImages} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <div className={styles.teamImg} style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500&h=350&fit=crop)' }} />
              <div className={styles.teamImg} style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=500&h=350&fit=crop)' }} />
            </motion.div>
            <motion.div className={styles.teamText} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
              <span className={styles.sectionLabel}>Đội ngũ</span>
              <h2 className={styles.sectionTitle}>Con người là <span className={styles.highlight}>tài sản quý giá nhất</span></h2>
              <p className={styles.teamDesc}>
                Đội ngũ VAA gồm hơn 50 chuyên gia kiến trúc, kỹ thuật và quản lý dự án giàu kinh nghiệm.
                Thông qua VAA JOB, chúng tôi mở rộng mạng lưới hợp tác với hàng nghìn freelancer
                trên cả nước — những người đang làm việc linh hoạt nhưng vẫn đảm bảo tiêu chuẩn
                chuyên môn cao nhất.
              </p>
              <div className={styles.teamFeatures}>
                <div className={styles.teamFeature}><Briefcase size={16} /><span>Chuyên môn đa lĩnh vực</span></div>
                <div className={styles.teamFeature}><Star size={16} /><span>Kinh nghiệm thực chiến</span></div>
                <div className={styles.teamFeature}><Award size={16} /><span>Cam kết chất lượng</span></div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <motion.div className={styles.ctaCard} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className={styles.ctaTitle}>Bạn là KTS hay KS đang tìm việc tự do?</h2>
            <p className={styles.ctaDesc}>
              Gia nhập cộng đồng VAA JOB — nơi bạn nhận job chất lượng, làm việc bài bản và
              được thanh toán nhanh chóng.
            </p>
            <div className={styles.ctaActions}>
              <Link href="/register">
                <Button size="lg" icon={<ArrowRight size={18} />}>Đăng ký ngay — Miễn phí</Button>
              </Link>
              <Link href="/jobs">
                <Button size="lg" variant="outline">Xem việc làm →</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
