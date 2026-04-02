'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FolderKanban, Clock, Users, ArrowRight, Loader2, Inbox } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { useAuth } from '@/lib/firebase/auth-context';
import { getJobs } from '@/lib/firebase/firestore';
import { cache, TTL } from '@/lib/cache/swr-cache';
import type { Job } from '@/types';
import styles from './page.module.css';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  in_progress: { label: 'Đang thực hiện', color: 'info' },
  open: { label: 'Đang tuyển', color: 'warning' },
  assigned: { label: 'Đã giao', color: 'accent' },
  review: { label: 'Nghiệm thu', color: 'accent' },
  completed: { label: 'Hoàn thành', color: 'success' },
  draft: { label: 'Nháp', color: 'default' },
};

const formatDate = (d: unknown): string => {
  if (!d) return '-';
  if (typeof d === 'object' && d !== null && 'toDate' in d) return (d as { toDate: () => Date }).toDate().toLocaleDateString('vi-VN');
  if (d instanceof Date) return d.toLocaleDateString('vi-VN');
  return String(d);
};

export default function JobMasterProjectsPage() {
  const { userProfile } = useAuth();
  const [filter, setFilter] = useState('all');
  const [projects, setProjects] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.uid) return;
    const fetchProjects = async () => {
      const result = await cache.get(`jm:projects:${userProfile.uid}`, () => getJobs({}, 100), TTL.MEDIUM);
      const managed = result.items.filter(j => j.jobMaster === userProfile.uid || j.createdBy === userProfile.uid);
      setProjects(managed);
      setLoading(false);
    };
    fetchProjects().catch(() => setLoading(false));
  }, [userProfile?.uid]);

  const filteredProjects = projects.filter(p => filter === 'all' || p.status === filter);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}><Loader2 size={24} className={styles.spin} /> Đang tải...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dự án của tôi</h1>
          <p className={styles.subtitle}>Quản lý tiến độ các dự án bạn phụ trách.</p>
        </div>
        <Link href="/jobmaster/jobs/create">
          <Button><FolderKanban size={16}/> Tạo dự án mới</Button>
        </Link>
      </div>

      <div className={styles.filterTabs}>
        <button className={`${styles.tab} ${filter === 'all' ? styles.activeTab : ''}`} onClick={() => setFilter('all')}>Tất cả ({projects.length})</button>
        <button className={`${styles.tab} ${filter === 'in_progress' ? styles.activeTab : ''}`} onClick={() => setFilter('in_progress')}>Đang chạy</button>
        <button className={`${styles.tab} ${filter === 'open' ? styles.activeTab : ''}`} onClick={() => setFilter('open')}>Đang tuyển</button>
        <button className={`${styles.tab} ${filter === 'completed' ? styles.activeTab : ''}`} onClick={() => setFilter('completed')}>Đã xong</button>
      </div>

      <div className={styles.list}>
        {filteredProjects.map(proj => (
          <Card key={proj.id} className={styles.projectCard}>
            <div className={styles.pMain}>
              <div className={styles.pTags}>
                {/* @ts-expect-error dynamic badge variant */}
                <Badge variant={STATUS_MAP[proj.status]?.color || 'default'} size="sm">
                  {STATUS_MAP[proj.status]?.label || proj.status}
                </Badge>
              </div>
              <h3 className={styles.pTitle}>{proj.title}</h3>
              <div className={styles.pMeta}>
                <span><Users size={14}/> {proj.assignedWorkerName || 'Chưa có freelancer'}</span>
                <span className={styles.sep}>•</span>
                <span><Clock size={14}/> Hạn: {formatDate(proj.deadline)}</span>
              </div>
            </div>

            <div className={styles.pAction}>
              <div className={styles.progressBlock}>
                <div className={styles.pHeader}>
                  <span>Tiến độ tổng</span>
                  <span>{proj.progress ?? 0}%</span>
                </div>
                <div className={styles.pBar}>
                  <div className={styles.pFill} style={{ width: `${proj.progress ?? 0}%`, background: (proj.progress ?? 0) === 100 ? 'var(--color-success)' : 'var(--color-primary)' }} />
                </div>
              </div>
              <Link href={`/jobmaster/jobs/${proj.id}`}>
                <Button variant="outline" size="sm">Quản lý <ArrowRight size={14}/></Button>
              </Link>
            </div>
          </Card>
        ))}
        {filteredProjects.length === 0 && (
          <div className={styles.empty}><Inbox size={24}/> Không có dự án nào phù hợp.</div>
        )}
      </div>
    </div>
  );
}
