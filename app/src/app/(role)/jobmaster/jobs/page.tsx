'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, FolderKanban, Clock, Users, ArrowRight } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import styles from './page.module.css';

const MOCK_PROJECTS = [
  { id: '1', title: 'Thiết kế kiến trúc Nhà xưởng KCN Bình Dương', status: 'in_progress', freelancers: 2, progress: 45, deadline: '15/05/2026', totalFee: '120,000,000₫' },
  { id: '2', title: 'BIM Modeling tổ hợp văn phòng 12 tầng Q7', status: 'recruiting', freelancers: 0, progress: 0, deadline: '01/05/2026', totalFee: '65,000,000₫' },
  { id: '3', title: 'Dự toán công trình trường học TPHCM', status: 'completed', freelancers: 1, progress: 100, deadline: '10/04/2026', totalFee: '25,000,000₫' },
];

const STATUS_MAP: Record<string, { label: string, color: string }> = {
  in_progress: { label: 'Đang thực hiện', color: 'info' },
  recruiting: { label: 'Đang tuyển (3 Apply)', color: 'warning' },
  completed: { label: 'Hoàn thành', color: 'success' },
};

export default function JobMasterProjectsPage() {
  const [filter, setFilter] = useState('all');

  const filteredProjects = MOCK_PROJECTS.filter(p => filter === 'all' || p.status === filter);

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
        <button className={`${styles.tab} ${filter === 'all' ? styles.activeTab : ''}`} onClick={() => setFilter('all')}>Tất cả</button>
        <button className={`${styles.tab} ${filter === 'in_progress' ? styles.activeTab : ''}`} onClick={() => setFilter('in_progress')}>Đang chạy</button>
        <button className={`${styles.tab} ${filter === 'recruiting' ? styles.activeTab : ''}`} onClick={() => setFilter('recruiting')}>Đang tuyển</button>
        <button className={`${styles.tab} ${filter === 'completed' ? styles.activeTab : ''}`} onClick={() => setFilter('completed')}>Đã xong</button>
      </div>

      <div className={styles.list}>
        {filteredProjects.map(proj => (
          <Card key={proj.id} className={styles.projectCard}>
            <div className={styles.pMain}>
              <div className={styles.pTags}>
                {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                {/* @ts-ignore */}
                <Badge variant={STATUS_MAP[proj.status].color} size="sm">{STATUS_MAP[proj.status].label}</Badge>
              </div>
              <h3 className={styles.pTitle}>{proj.title}</h3>
              <div className={styles.pMeta}>
                <span><Users size={14}/> {proj.freelancers} Freelancers</span>
                <span className={styles.sep}>•</span>
                <span><Clock size={14}/> Hạn hoàn thành: {proj.deadline}</span>
              </div>
            </div>

            <div className={styles.pAction}>
              <div className={styles.progressBlock}>
                <div className={styles.pHeader}>
                  <span>Tiến độ tổng</span>
                  <span>{proj.progress}%</span>
                </div>
                <div className={styles.pBar}>
                  <div className={styles.pFill} style={{ width: `${proj.progress}%`, background: proj.progress === 100 ? 'var(--color-success)' : 'var(--color-primary)' }} />
                </div>
              </div>
              <Link href={`/jobmaster/jobs/${proj.id}`}>
                <Button variant="outline" size="sm">Quản lý <ArrowRight size={14}/></Button>
              </Link>
            </div>
          </Card>
        ))}
        {filteredProjects.length === 0 && (
          <div className={styles.empty}>Không có dự án nào phù hợp.</div>
        )}
      </div>
    </div>
  );
}
