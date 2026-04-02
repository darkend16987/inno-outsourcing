'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, Clock, ArrowRight, LayoutGrid, List as ListIcon } from 'lucide-react';
import { Button, Badge, Card, LevelBadge } from '@/components/ui';
import { JOB_CATEGORIES, JOB_LEVELS } from '@/types';
import { formatFriendlyMoney } from '@/lib/formatters';
import styles from './page.module.css';

import { getJobs } from '@/lib/firebase/firestore';
import type { Job } from '@/types';

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
  const [workModeFilter, setWorkModeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function fetchJobs() {
      setLoading(true);
      const res = await getJobs();
      setJobs(res.items);
      setLoading(false);
    }
    fetchJobs();
  }, []);

  const filtered = jobs.filter(job => {
    const matchSearch = job.title.toLowerCase().includes(search.toLowerCase()) ||
                        job.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || job.category === catFilter;
    const matchLevel = levelFilter === 'all' || job.level === levelFilter;
    const matchWorkMode = workModeFilter === 'all' || job.workMode === workModeFilter;
    
    return matchSearch && matchCat && matchLevel && matchWorkMode;
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
        <div className={styles.catFilters}>
          <button 
            className={styles.catPill} 
            data-active={catFilter === 'all'}
            onClick={() => setCatFilter('all')}
          >
            Tất cả lĩnh vực
          </button>
          {JOB_CATEGORIES.map(c => (
            <button 
              key={c} 
              className={styles.catPill} 
              data-active={catFilter === c}
              onClick={() => setCatFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>

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
          
          <div className={styles.filtersWrapper}>
            <Button 
              variant={showAdvanced ? 'primary' : 'outline'} 
              icon={<SlidersHorizontal size={14} />}
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              Bộ lọc nâng cao
            </Button>
            
            <div className={styles.viewToggle}>
              <button 
                className={styles.viewBtn} 
                data-active={viewMode === 'list'}
                onClick={() => setViewMode('list')}
                title="Danh sách"
              >
                <ListIcon size={16} />
              </button>
              <button 
                className={styles.viewBtn} 
                data-active={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
                title="Lưới"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvanced && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            className={styles.advancedFilters}
          >
            <div className={styles.filterGroup}>
              <label>Level yêu cầu</label>
              <select className={styles.select} value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
                <option value="all">Tất cả level</option>
                {JOB_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Hình thức làm việc</label>
              <select className={styles.select} value={workModeFilter} onChange={e => setWorkModeFilter(e.target.value)}>
                <option value="all">Tất cả</option>
                <option value="remote">Từ xa (Remote)</option>
                <option value="hybrid">Kết hợp (Hybrid)</option>
                <option value="on-site">Tại văn phòng (On-site)</option>
              </select>
            </div>
          </motion.div>
        )}

        {/* Results */}
        {loading ? (
          <p className={styles.resultCount}>Đang tải danh sách việc...</p>
        ) : (
          <>
            <p className={styles.resultCount}>{filtered.length} kết quả phù hợp</p>

            <div className={viewMode === 'grid' ? styles.jobsGrid : styles.jobsList}>
              {filtered.map((job, i) => (
                <motion.div key={job.id} initial="hidden" animate="visible" custom={i} variants={fadeUp}>
                  <Link href={`/jobs/${job.id}`} className={styles.jobLink}>
                    <Card hover className={styles.jobCard}>
                      <div className={styles.jobLeft}>
                        <div className={styles.jobTags}>
                          {job.highlightTags?.map(tag => (
                            <Badge key={tag} variant="error" size="sm">{tag}</Badge>
                          ))}
                          <Badge variant="default">{job.category}</Badge>
                          <LevelBadge level={job.level} />
                          <Badge size="sm">{WORK_MODE_LABELS[job.workMode]}</Badge>
                        </div>
                        <h3 className={styles.jobTitle}>{job.title}</h3>
                        <p className={styles.jobDesc}>{job.description}</p>
                      </div>
                      <div className={styles.jobRight}>
                        <span className={styles.jobFee}>{formatFriendlyMoney(job.totalFee)}</span>
                        <span className={styles.jobDuration}><Clock size={13} /> {job.duration} ngày</span>
                        <span className={styles.jobCta}>Xem chi tiết <ArrowRight size={14} /></span>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
