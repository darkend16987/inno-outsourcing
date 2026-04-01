'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Briefcase, FileSignature, User, LogOut, Settings, Users, FolderKanban, CheckSquare, DollarSign, FileSpreadsheet } from 'lucide-react';
import { Avatar } from '@/components/ui';
import styles from './Sidebar.module.css';

interface SidebarProps {
  role: 'freelancer' | 'admin' | 'jobmaster' | 'accountant';
}

const NAV_CONFIG = {
  freelancer: [
    { label: 'Tổng quan', href: '/freelancer', icon: LayoutDashboard },
    { label: 'Việc của tôi', href: '/freelancer/jobs', icon: Briefcase },
    { label: 'Hợp đồng', href: '/freelancer/contracts', icon: FileSignature },
    { label: 'Hồ sơ năng lực', href: '/freelancer/profile', icon: User },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Quản lý Users', href: '/admin/users', icon: Users },
    { label: 'Quản lý Jobs', href: '/admin/jobs', icon: FolderKanban },
    { label: 'Báo cáo', href: '/admin/reports', icon: FileSpreadsheet },
  ],
  jobmaster: [
    { label: 'Tổng quan', href: '/jobmaster', icon: LayoutDashboard },
    { label: 'Dự án của tôi', href: '/jobmaster/jobs', icon: FolderKanban },
    { label: 'Duyệt ứng viên', href: '/jobmaster/applications', icon: CheckSquare },
    { label: 'Nghiệm thu', href: '/jobmaster/reviews', icon: FileSignature },
  ],
  accountant: [
    { label: 'Tổng quan', href: '/accountant', icon: LayoutDashboard },
    { label: 'Lệnh thanh toán', href: '/accountant/payments', icon: DollarSign },
    { label: 'Hợp đồng', href: '/accountant/contracts', icon: FileSignature },
    { label: 'Báo cáo công nợ', href: '/accountant/reports', icon: FileSpreadsheet },
  ]
};

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const navItems = NAV_CONFIG[role] || NAV_CONFIG.freelancer;

  return (
    <aside className={styles.sidebar}>
      {/* Brand */}
      <div className={styles.brand}>
        <div className={styles.logo}>V</div>
        <div className={styles.brandText}>VAA JOB<br /><span>CMS Portal</span></div>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        {navItems.map(item => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`${styles.navItem} ${isActive ? styles.active : ''}`}>
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer (Profile & Settings) */}
      <div className={styles.footer}>
        <Link href={`/${role}/settings`} className={styles.navItem}>
          <Settings size={18} /> Cài đặt
        </Link>
        <button className={`${styles.navItem} ${styles.logoutBtn}`}>
          <LogOut size={18} /> Đăng xuất
        </button>
        
        <div className={styles.profile}>
          <Avatar name={role.toUpperCase()} level="L1" size="sm" />
          <div className={styles.pInfo}>
            <div className={styles.pName}>Hệ thống</div>
            <div className={styles.pRole}>{role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
