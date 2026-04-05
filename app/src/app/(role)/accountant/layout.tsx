'use client';

import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { CMSNotificationBell } from '@/components/layout/CMSNotificationBell';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import styles from './layout.module.css';

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.roleLayout}>
      <Sidebar role="accountant" />
      <div className={styles.mainContent}>
        <header className={styles.topbar}>
          <h2 className={styles.routeDesc}>Accounting Portal</h2>
          <div className={styles.topbarActions}>
            <CMSNotificationBell />
          </div>
        </header>
        <main className={styles.contentArea}>
          <ErrorBoundary sectionName="Accounting Dashboard">
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
