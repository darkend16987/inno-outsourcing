'use client';

import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import styles from './layout.module.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.roleLayout}>
      <Sidebar role="admin" />
      <div className={styles.mainContent}>
        <header className={styles.topbar}>
          <h2 className={styles.routeDesc}>System Administration</h2>
        </header>
        <main className={styles.contentArea}>
          <ErrorBoundary sectionName="Admin Dashboard">
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
