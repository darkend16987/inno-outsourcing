import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import styles from './layout.module.css';

export default function FreelancerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.roleLayout}>
      <Sidebar role="freelancer" />
      <div className={styles.mainContent}>
        {/* We can add a Topbar here for mobile menu or notifications later */}
        <header className={styles.topbar}>
          <h2 className={styles.routeDesc}>Freelancer Portal</h2>
        </header>
        <main className={styles.contentArea}>
          {children}
        </main>
      </div>
    </div>
  );
}
