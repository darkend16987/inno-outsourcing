'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Menu, X, LogOut, ChevronDown, LayoutDashboard, User, Bell } from 'lucide-react';
import { Button, Avatar } from '@/components/ui';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/lib/firebase/auth-context';
import styles from './Header.module.css';
import { NotificationHub } from '@/components/notifications/NotificationHub';
import { subscribeToNotifications, markNotificationRead } from '@/lib/firebase/firestore';
import type { Notification as AppNotification } from '@/types';

const ROLE_DASHBOARD: Record<string, string> = {
  admin: '/admin',
  jobmaster: '/jobmaster',
  freelancer: '/freelancer',
  accountant: '/accountant',
};

const ROLE_LABEL: Record<string, string> = {
  admin: 'Quản trị viên',
  jobmaster: 'Job Master',
  freelancer: 'Freelancer',
  accountant: 'Kế toán',
};

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notiRef = useRef<HTMLDivElement>(null);

  const { userProfile, signOut, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setDropdownOpen(false);
      router.push('/');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const dashboardPath = userProfile ? ROLE_DASHBOARD[userProfile.role] || '/freelancer' : '/';

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link href="/" className={styles.brand}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>V</span>
          </div>
          <div className={styles.brandText}>
            <strong className={styles.brandName}>VAA JOB</strong>
            <span className={styles.brandTag}>Construction Outsourcing</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className={styles.nav}>
          <Link href="/jobs" className={styles.navLink}>Việc làm</Link>
          <Link href="/vinh-danh" className={styles.navLink}>Bảng xếp hạng</Link>
          <Link href="/huy-hieu" className={styles.navLink}>Huy hiệu</Link>
        </nav>

        {/* Actions */}
        <div className={styles.actions}>
          <Button variant="ghost" size="sm" className={styles.searchBtn}>
            <Search size={18} />
          </Button>
          <ThemeToggle />

          {/* Notification Bell (logged-in only) */}
          {!loading && userProfile && (
            <NotificationBellWrapper userId={userProfile.uid} notiRef={notiRef} />
          )}

          {!loading && userProfile ? (
            /* ── Logged-in state ── */
            <div className={styles.userMenu} ref={dropdownRef}>
              <button
                className={styles.userMenuBtn}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <Avatar src={userProfile.photoURL} name={userProfile.displayName || userProfile.email} size="sm" />
                <div className={styles.userMenuInfo}>
                  <span className={styles.userName}>{userProfile.displayName || 'Người dùng'}</span>
                  <span className={styles.userRole}>{ROLE_LABEL[userProfile.role] || userProfile.role}</span>
                </div>
                <ChevronDown size={14} className={`${styles.chevron} ${dropdownOpen ? styles.chevronOpen : ''}`} />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    className={styles.dropdown}
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Link
                      href={dashboardPath}
                      className={styles.dropdownItem}
                      onClick={() => setDropdownOpen(false)}
                    >
                      <LayoutDashboard size={16} /> Dashboard
                    </Link>
                    <Link
                      href={`${dashboardPath}/profile`}
                      className={styles.dropdownItem}
                      onClick={() => setDropdownOpen(false)}
                    >
                      <User size={16} /> Hồ sơ
                    </Link>
                    <div className={styles.dropdownDivider} />
                    <button className={styles.dropdownItem} onClick={handleSignOut}>
                      <LogOut size={16} /> Đăng xuất
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : !loading ? (
            /* ── Logged-out state ── */
            <>
              <Link href="/login">
                <Button variant="outline" size="sm">Đăng nhập</Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm">Đăng ký</Button>
              </Link>
            </>
          ) : null}

          <button className={styles.hamburger} onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <motion.div
          className={styles.mobileMenu}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <Link href="/jobs" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>Việc làm</Link>
          <Link href="/vinh-danh" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>Bảng xếp hạng</Link>
          <Link href="/huy-hieu" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>Huy hiệu</Link>
          <div className={styles.mobileCta}>
            {userProfile ? (
              <>
                <Link href={dashboardPath}><Button variant="outline" fullWidth>Dashboard</Button></Link>
                <Button variant="danger" fullWidth onClick={handleSignOut}>Đăng xuất</Button>
              </>
            ) : (
              <>
                <Link href="/login"><Button variant="outline" fullWidth>Đăng nhập</Button></Link>
                <Link href="/register"><Button variant="primary" fullWidth>Đăng ký</Button></Link>
              </>
            )}
          </div>
        </motion.div>
      )}
    </header>
  );
}

// ── Notification Bell Sub-component ──
function NotificationBellWrapper({ userId, notiRef }: { userId: string; notiRef: React.RefObject<HTMLDivElement | null> }) {
  const [notiOpen, setNotiOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const unsub = subscribeToNotifications(userId, (notis) => {
      setNotifications(notis.slice(0, 20));
    });
    return unsub;
  }, [userId]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notiRef.current && !notiRef.current.contains(e.target as Node)) {
        setNotiOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notiRef]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = (id: string) => {
    markNotificationRead(id).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = () => {
    notifications.filter(n => !n.read).forEach(n => {
      markNotificationRead(n.id).catch(() => {});
    });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div className={styles.notiWrap} ref={notiRef}>
      <button
        className={styles.notiBtn}
        onClick={() => setNotiOpen(!notiOpen)}
        aria-label="Thông báo"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className={styles.notiBadge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>
      {notiOpen && (
        <div className={styles.notiDropdown}>
          <NotificationHub
            notifications={notifications}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
          />
        </div>
      )}
    </div>
  );
}
