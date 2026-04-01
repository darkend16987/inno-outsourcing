'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, Clock, ArrowRight, MapPin, ChevronDown } from 'lucide-react';
import { Button, Badge, Card, LevelBadge } from '@/components/ui';
import { JOB_CATEGORIES, JOB_LEVELS } from '@/types';
import styles from './page.module.css';

const MOCK_JOBS = [
  { id: '1', title: 'Thiết kế kiến trúc Nhà xưởng KCN Bình Dương', category: 'Kiến trúc', level: 'L3' as const, fee: '48,000,000₫', duration: '45 ngày', workMode: 'remote', desc: 'Thiết kế kiến trúc nhà xưởng sản xuất diện tích 5000m2, bao gồm văn phòng điều hành và khu sản xuất.' },
  { id: '2', title: 'BIM Modeling tổ hợp văn phòng 12 tầng Q7', category: 'BIM', level: 'L4' as const, fee: '65,000,000₫', duration: '60 ngày', workMode: 'hybrid', desc: 'Modeling 3D BIM Revit đầy đủ hệ Kiến trúc, Kết cấu cho tòa nhà văn phòng hạng A.' },
  { id: '3', title: 'Thiết kế kết cấu Bệnh viện Đa khoa Cần Thơ', category: 'Kết cấu', level: 'L5' as const, fee: '120,000,000₫', duration: '90 ngày', workMode: 'on-site', desc: 'Thiết kế kết cấu BTCT, thép cho bệnh viện 200 giường, 8 tầng + 2 tầng hầm.' },
  { id: '4', title: 'Hệ thống MEP chung cư cao cấp Thủ Đức', category: 'MEP', level: 'L3' as const, fee: '55,000,000₫', duration: '50 ngày', workMode: 'remote', desc: 'Thiết kế hệ thống Cơ Điện (M&E) bao gồm HVAC, cấp thoát nước, PCCC, điện cho chung cư 25 tầng.' },
  { id: '5', title: 'Dự toán công trình trường học TPHCM', category: 'Dự toán', level: 'L2' as const, fee: '25,000,000₫', duration: '20 ngày', workMode: 'remote', desc: 'Lập dự toán chi tiết theo đơn giá TPHCM cho công trình trường THCS 3 tầng.' },
  { id: '6', title: 'Thẩm tra PCCC tòa nhà hỗn hợp Hà Nội', category: 'Thẩm tra', level: 'L4' as const, fee: '38,000,000₫', duration: '30 ngày', workMode: 'remote', desc: 'Thẩm tra hồ sơ PCCC cho tòa nhà hỗn hợp thương mại-residential 30 tầng theo QCVN 06.' },
  { id: '7', title: 'Giám sát thi công Resort Phú Quốc', category: 'Giám sát', level: 'L4' as const, fee: '80,000,000₫', duration: '120 ngày', workMode: 'on-site', desc: 'Giám sát thi công phần thô và hoàn thiện resort 4 sao, 120 phòng tại Phú Quốc.' },
  { id: '8', title: 'Thiết kế Kiến trúc Biệt thự hiện đại Q2', category: 'Kiến trúc', level: 'L2' as const, fee: '30,000,000₫', duration: '25 ngày', workMode: 'remote', desc: 'Thiết kế kiến trúc biệt thự 3 tầng phong cách hiện đại tropical, diện tích 200m2.' },
  { id: '9', title: 'BIM Coordination dự án bệnh viện', category: 'BIM', level: 'L5' as const, fee: '95,000,000₫', duration: '75 ngày', workMode: 'hybrid', desc: 'Coordination clash detection cho dự án bệnh viện 500 giường, hệ MEP + Kiến trúc + Kết cấu.' },
];

const WORK_MODE_LABELS: Record<string, string> = {
  remote: 'Từ xa',
  'on-site': 'Tại công trường',
  hybrid: 'Kết hợp',
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.4 } }),
};

export default function JobsPage() {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');

  const filtered = MOCK_JOBS.filter(job => {
    const matchSearch = job.title.toLowerCase().includes(search.toLowerCase()) ||
                        job.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || job.category === catFilter;
    const matchLevel = levelFilter === 'all' || job.level === levelFilter;
    return matchSearch && matchCat && matchLevel;
  });

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.container}>
          <h1 className={styles.pageTitle}>Danh sách việc làm</h1>
          <p className={styles.pageDesc}>Tìm kiếm cơ hội hợp tác phù hợp với chuyên môn của bạn</p>
        </div>
      </div>

      <div className={styles.container}>
        {/* Filter Bar */}
        <div className={styles.filterBar}>
          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên việc, chuyên ngành..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.filters}>
            <select className={styles.select} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="all">Tất cả lĩnh vực</option>
              {JOB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className={styles.select} value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
              <option value="all">Tất cả level</option>
              {JOB_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* Results */}
        <p className={styles.resultCount}>{filtered.length} kết quả</p>

        <div className={styles.jobsList}>
          {filtered.map((job, i) => (
            <motion.div key={job.id} initial="hidden" animate="visible" custom={i} variants={fadeUp}>
              <Link href={`/jobs/${job.id}`} className={styles.jobLink}>
                <Card hover className={styles.jobCard}>
                  <div className={styles.jobLeft}>
                    <div className={styles.jobTags}>
                      <Badge variant="default">{job.category}</Badge>
                      <LevelBadge level={job.level} />
                      <Badge size="sm">{WORK_MODE_LABELS[job.workMode]}</Badge>
                    </div>
                    <h3 className={styles.jobTitle}>{job.title}</h3>
                    <p className={styles.jobDesc}>{job.desc}</p>
                  </div>
                  <div className={styles.jobRight}>
                    <span className={styles.jobFee}>{job.fee}</span>
                    <span className={styles.jobDuration}><Clock size={13} /> {job.duration}</span>
                    <span className={styles.jobCta}>Xem chi tiết <ArrowRight size={14} /></span>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
