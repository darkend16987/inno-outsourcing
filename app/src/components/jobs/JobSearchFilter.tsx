'use client';

import React, { useState, useCallback } from 'react';
import type { JobCategory, JobLevel } from '@/types';
import { JOB_CATEGORIES, JOB_LEVELS } from '@/types';
import styles from './JobSearchFilter.module.css';

export interface JobSearchFilters {
  searchText: string;
  category: JobCategory | '';
  level: JobLevel | '';
  budgetMin: number | null;
  budgetMax: number | null;
  workMode: 'remote' | 'onsite' | 'hybrid' | '';
  deadlineBefore: string; // ISO date string
  status: string;
}

interface JobSearchFilterProps {
  onFilterChange: (filters: JobSearchFilters) => void;
  initialFilters?: Partial<JobSearchFilters>;
}

const DEFAULT_FILTERS: JobSearchFilters = {
  searchText: '',
  category: '',
  level: '',
  budgetMin: null,
  budgetMax: null,
  workMode: '',
  deadlineBefore: '',
  status: '',
};

export function JobSearchFilter({ onFilterChange, initialFilters }: JobSearchFilterProps) {
  const [filters, setFilters] = useState<JobSearchFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = useCallback(<K extends keyof JobSearchFilters>(
    key: K, value: JobSearchFilters[K]
  ) => {
    setFilters(prev => {
      const updated = { ...prev, [key]: value };
      onFilterChange(updated);
      return updated;
    });
  }, [onFilterChange]);

  const clearAll = () => {
    setFilters(DEFAULT_FILTERS);
    onFilterChange(DEFAULT_FILTERS);
  };

  const hasActiveFilters = Object.entries(filters).some(([key, val]) => {
    if (key === 'searchText') return false; // search is always visible
    return val !== '' && val !== null;
  });

  return (
    <div className={styles.container}>
      {/* Search Bar */}
      <div className={styles.searchRow}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Tìm kiếm công việc..."
            className={styles.searchInput}
            value={filters.searchText}
            onChange={e => updateFilter('searchText', e.target.value)}
          />
          {filters.searchText && (
            <button className={styles.clearSearch} onClick={() => updateFilter('searchText', '')}>&times;</button>
          )}
        </div>
        <button
          className={`${styles.filterToggle} ${showAdvanced ? styles.filterToggleActive : ''}`}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="20" y2="12" /><line x1="12" y1="18" x2="20" y2="18" />
            <circle cx="6" cy="12" r="2" /><circle cx="10" cy="18" r="2" /><circle cx="8" cy="6" r="2" />
          </svg>
          Bộ lọc
          {hasActiveFilters && <span className={styles.filterBadge} />}
        </button>
      </div>

      {/* Quick Filters */}
      <div className={styles.quickFilters}>
        <select className={styles.quickSelect} value={filters.category} onChange={e => updateFilter('category', e.target.value as JobCategory)}>
          <option value="">Tất cả chuyên ngành</option>
          {JOB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={styles.quickSelect} value={filters.level} onChange={e => updateFilter('level', e.target.value as JobLevel)}>
          <option value="">Tất cả cấp độ</option>
          {JOB_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className={styles.advancedFilters}>
          <div className={styles.filterGrid}>
            <div className={styles.filterItem}>
              <label className={styles.filterLabel}>Ngân sách tối thiểu</label>
              <input
                type="number"
                className={styles.filterInput}
                placeholder="VNĐ"
                value={filters.budgetMin ?? ''}
                onChange={e => updateFilter('budgetMin', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div className={styles.filterItem}>
              <label className={styles.filterLabel}>Ngân sách tối đa</label>
              <input
                type="number"
                className={styles.filterInput}
                placeholder="VNĐ"
                value={filters.budgetMax ?? ''}
                onChange={e => updateFilter('budgetMax', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div className={styles.filterItem}>
              <label className={styles.filterLabel}>Hình thức</label>
              <select className={styles.filterSelect} value={filters.workMode} onChange={e => updateFilter('workMode', e.target.value as 'remote' | 'onsite' | 'hybrid' | '')}>
                <option value="">Tất cả</option>
                <option value="remote">Remote</option>
                <option value="onsite">Onsite</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div className={styles.filterItem}>
              <label className={styles.filterLabel}>Deadline trước</label>
              <input
                type="date"
                className={styles.filterInput}
                value={filters.deadlineBefore}
                onChange={e => updateFilter('deadlineBefore', e.target.value)}
              />
            </div>
          </div>

          {hasActiveFilters && (
            <button className={styles.clearAllBtn} onClick={clearAll}>
              Xoá tất cả bộ lọc
            </button>
          )}
        </div>
      )}
    </div>
  );
}
