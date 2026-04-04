'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, Clock, ArrowRight, LayoutGrid, List as ListIcon } from 'lucide-react';
import { Button, Badge, Card, LevelBadge } from '@/components/ui';
import { SaveButton } from '@/components/ui/SaveButton';
import { useAuth } from '@/lib/firebase/auth-context';
import { JOB_CATEGORIES, JOB_LEVELS } from '@/types';
import { getConfigItems, type SystemConfigItem } from '@/lib/firebase/system-config';
import { formatFriendlyMoney } from '@/lib/formatters';
import { getJobUrl } from '@/lib/seo/slug';
import { toggleSavedJob, getSavedJobs } from '@/lib/firebase/firestore-extended';
import styles from './page.module.css';

import { getJobs } from '@/lib/firebase/firestore';

const WORK_MODE_LABELS: Record<string, string> = {
  remote: 'Từ xa',
  'on-site': 'Tại công trường',
  hybrid: 'Kết hợp',
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.4 } }),
};

/**
 * Safely extract fee from Firestore data.
 * Firestore seed uses `fee` (number), but Job type expects `totalFee`.
 */
function getJobFee(job: Record<string, unknown>): number {
  if (typeof job.totalFee === 'number') return job.totalFee;
  if (typeof job.fee === 'number') return job.fee;
  return 0;
}

function getJobDescription(job: Record<string, unknown>): string {
  if (typeof job.description === 'string') return job.description;
  if (typeof job.desc === 'string') return job.desc;
  return '';
}

function getJobDuration(job: Record<string, unknown>): string {
  if (typeof job.duration === 'number') return `${job.duration} ngày`;
  if (typeof job.duration === 'string') return job.duration;
  return '';
}

function JobsPageContent() {
  const searchParams = useSearchParams();
  const { userProfile } = useAuth();
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [catFilter, setCatFilter] = useState<string>(() => searchParams.get('category') || 'all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [workModeFilter, setWorkModeFilter] = useState<string>('all');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const [durationMax, setDurationMax] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Dynamic config-driven filters (with hardcoded fallbacks)
  const [categories, setCategories] = useState<string[]>(JOB_CATEGORIES);
  const [levels, setLevels] = useState<string[]>(JOB_LEVELS);

  // Load saved jobs for logged-in freelancer
  useEffect(() => {
    if (userProfile?.uid && userProfile.role === 'freelancer') {
      getSavedJobs(userProfile.uid).then(setSavedJobIds).catch(() => {});
    }
  }, [userProfile?.uid, userProfile?.role]);

  useEffect(() => {
    async function fetchJobs() {
      setLoading(true);
      try {
        const res = await getJobs({ status: 'open' });
        setJobs(res.items);
      } catch (err) {
        console.error('Error fetching jobs:', err);
      }
      setLoading(false);
    }
    fetchJobs();
  }, []);

  // Load dynamic categories/levels from system_config
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [sp, lv] = await Promise.all([
          getConfigItems('specialties'),
          getConfigItems('levels'),
        ]);
        const activeSp = sp.filter(i => i.isActive).map(i => i.label);
        const activeLv = lv.filter(i => i.isActive).map(i => i.label);
        if (activeSp.length > 0) setCategories(activeSp);
        if (activeLv.length > 0) setLevels(activeLv);
      } catch (err) {
        console.error('Failed to load filter config, using fallbacks:', err);
      }
    };
    loadFilters();
  }, []);

  const filtered = jobs.filter(job => {
    const title = job.title || '';
    const category = job.category || '';
    const matchSearch = title.toLowerCase().includes(search.toLowerCase()) ||
                        category.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || category === catFilter;
    const matchLevel = levelFilter === 'all' || job.level === levelFilter;
    const matchWorkMode = workModeFilter === 'all' || job.workMode === workModeFilter;

    // Budget range filter
    const fee = getJobFee(job);
    const bMin = budgetMin ? parseInt(budgetMin.replace(/\D/g, ''), 10) : 0;
    const bMax = budgetMax ? parseInt(budgetMax.replace(/\D/g, ''), 10) : Infinity;
    const matchBudget = fee >= bMin && fee <= bMax;

    // Duration range filter
    const dur = typeof job.duration === 'number' ? job.duration : parseInt(job.duration || '0', 10);
    const dMin = durationMin ? parseInt(durationMin, 10) : 0;
    const dMax = durationMax ? parseInt(durationMax, 10) : Infinity;
    const matchDuration = dur >= dMin && dur <= dMax;
    
    return matchSearch && matchCat && matchLevel && matchWorkMode && matchBudget && matchDuration;
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
        {/* Category pills */}
        <div className={styles.catFilters}>
          <button 
            className={styles.catPill} 
            data-active={catFilter === 'all'}
            onClick={() => setCatFilter('all')}
          >
            Tất cả lĩnh vực
          </button>
          {categories.map(c => (
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
              size="sm"
              icon={<SlidersHorizontal size={14} />}
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              Bộ lọc
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
                {levels.map(l => <option key={l} value={l}>{l}</option>)}
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
            <div className={styles.filterGroup}>
              <label>Ngân sách (VNĐ)</label>
              <div className={styles.rangeInputs}>
                <input
                  type="text"
                  className={styles.rangeInput}
                  placeholder="Từ"
                  value={budgetMin}
                  onChange={e => setBudgetMin(e.target.value)}
                />
                <span className={styles.rangeSep}>—</span>
                <input
                  type="text"
                  className={styles.rangeInput}
                  placeholder="Đến"
                  value={budgetMax}
                  onChange={e => setBudgetMax(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.filterGroup}>
              <label>Thời gian thực hiện (ngày)</label>
              <div className={styles.rangeInputs}>
                <input
                  type="number"
                  className={styles.rangeInput}
                  placeholder="Từ"
                  min="0"
                  value={durationMin}
                  onChange={e => setDurationMin(e.target.value)}
                />
                <span className={styles.rangeSep}>—</span>
                <input
                  type="number"
                  className={styles.rangeInput}
                  placeholder="Đến"
                  min="0"
                  value={durationMax}
                  onChange={e => setDurationMax(e.target.value)}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Results */}
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Đang tải danh sách việc...</p>
          </div>
        ) : (
          <>
            <p className={styles.resultCount}>{filtered.length} kết quả phù hợp</p>

            <div className={viewMode === 'grid' ? styles.jobsGrid : styles.jobsList}>
              {filtered.map((job, i) => (
                <motion.div key={job.id} initial="hidden" animate="visible" custom={i} variants={fadeUp}>
                  <Link href={getJobUrl(job)} className={styles.jobLink}>
                    <Card hover className={`${styles.jobCard} ${viewMode === 'grid' ? styles.jobCardGrid : ''}`}>
                      <div className={styles.jobLeft}>
                        <div className={styles.jobTags}>
                          {job.highlightTags?.map((tag: string) => (
                            <Badge key={tag} variant="error" size="sm">{tag}</Badge>
                          ))}
                          <Badge variant="default">{job.category}</Badge>
                          <LevelBadge level={job.level} />
                          <Badge size="sm">{WORK_MODE_LABELS[job.workMode] || job.workMode}</Badge>
                        </div>
                        <h3 className={styles.jobTitle}>{job.title}</h3>
                        <p className={styles.jobDesc}>{getJobDescription(job)}</p>
                      </div>
                      <div className={styles.jobRight}>
                        {userProfile?.role === 'freelancer' && (
                          <SaveButton
                            isSaved={savedJobIds.includes(job.id)}
                            onToggle={async (save) => {
                              if (!userProfile?.uid) return;
                              await toggleSavedJob(userProfile.uid, job.id, save);
                              setSavedJobIds(prev => save ? [...prev, job.id] : prev.filter(id => id !== job.id));
                            }}
                            size="sm"
                          />
                        )}
                        <span className={styles.jobFee}>{formatFriendlyMoney(getJobFee(job))}</span>
                        <span className={styles.jobDuration}><Clock size={13} /> {getJobDuration(job)}</span>
                        <span className={styles.jobCta}>Xem chi tiết <ArrowRight size={14} /></span>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}

              {filtered.length === 0 && (
                <div className={styles.emptyState}>
                  <Search size={48} strokeWidth={1} />
                  <p>Không tìm thấy việc phù hợp</p>
                  <span>Thử thay đổi tiêu chí tìm kiếm hoặc bộ lọc</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '4rem', textAlign: 'center' }}>Đang tải...</div>}>
      <JobsPageContent />
    </Suspense>
  );
}
