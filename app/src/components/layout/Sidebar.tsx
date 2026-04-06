'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Briefcase, FileSignature, User, LogOut, Settings, Users, FolderKanban, CheckSquare, DollarSign, FileSpreadsheet, Activity, MessageSquare, Mail, FolderOpen } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { useAuth } from '@/lib/firebase/auth-context';
import styles from './Sidebar.module.css';

interface SidebarProps {
  role: 'freelancer' | 'admin' | 'jobmaster' | 'accountant';
}

const NAV_CONFIG = {
  freelancer: [
    { label: 'Tổng quan', href: '/freelancer', icon: LayoutDashboard },
    { label: 'Việc của tôi', href: '/freelancer/jobs', icon: Briefcase },
    { label: 'Lời mời', href: '/freelancer/invitations', icon: Mail },
    { label: 'Tin nhắn', href: '/freelancer/chat', icon: MessageSquare },
    { label: 'Hợp đồng', href: '/freelancer/contracts', icon: FileSignature },
    { label: 'Portfolio', href: '/freelancer/portfolio', icon: FolderOpen },
    { label: 'Hồ sơ năng lực', href: '/freelancer/profile', icon: User },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Quản lý Jobs', href: '/admin/jobs', icon: FolderKanban },
    { label: 'Duyệt ứng tuyển', href: '/admin/applications', icon: CheckSquare },
    { label: 'Theo dõi tiến độ', href: '/admin/progress', icon: Activity },
    { label: 'Hợp đồng', href: '/admin/contracts', icon: FileSignature },
    { label: 'Quản lý Users', href: '/admin/users', icon: Users },
    { label: 'Báo cáo', href: '/admin/reports', icon: FileSpreadsheet },
    { label: 'Cấu hình hệ thống', href: '/admin/settings', icon: Settings },
  ],
  jobmaster: [
    { label: 'Tổng quan', href: '/jobmaster', icon: LayoutDashboard },
    { label: 'Dự án của tôi', href: '/jobmaster/jobs', icon: FolderKanban },
    { label: 'Duyệt ứng viên', href: '/jobmaster/applications', icon: CheckSquare },
    { label: 'Freelancer', href: '/jobmaster/freelancers', icon: Users },
    { label: 'Tin nhắn', href: '/jobmaster/chat', icon: MessageSquare },
    { label: 'Portfolio', href: '/jobmaster/portfolio', icon: FolderOpen },
  ],
  accountant: [
    { label: 'Tổng quan', href: '/accountant', icon: LayoutDashboard },
    { label: 'Hợp đồng', href: '/accountant/contracts', icon: FileSignature },
    { label: 'Lệnh thanh toán', href: '/accountant/payments', icon: DollarSign },
  ],
};

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { userProfile, signOut } = useAuth();
  const navItems = NAV_CONFIG[role] || NAV_CONFIG.freelancer;

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <aside className={styles.sidebar}>
      {/* Brand */}
      <div className={styles.brand}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="VAA Job" className={styles.logoImg} />
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
        <button
          className={`${styles.navItem} ${styles.logoutBtn}`}
          onClick={handleSignOut}
        >
          <LogOut size={18} /> Đăng xuất
        </button>
        
        <div className={styles.profile}>
          <Avatar
            src={userProfile?.photoURL}
            name={userProfile?.displayName || role.toUpperCase()}
            level={userProfile?.currentLevel || 'L1'}
            size="sm"
          />
          <div className={styles.pInfo}>
            <div className={styles.pName}>{userProfile?.displayName || 'Người dùng'}</div>
            <div className={styles.pRole}>{role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
