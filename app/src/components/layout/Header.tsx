'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Menu, X, Bell, User, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui';
import styles from './Header.module.css';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
          <Link href="/leaderboard" className={styles.navLink}>Bảng xếp hạng</Link>
          <Link href="/badges" className={styles.navLink}>Huy hiệu</Link>
        </nav>

        {/* Actions */}
        <div className={styles.actions}>
          <Button variant="ghost" size="sm" className={styles.searchBtn}>
            <Search size={18} />
          </Button>
          <Link href="/login">
            <Button variant="outline" size="sm">Đăng nhập</Button>
          </Link>
          <Link href="/register">
            <Button variant="primary" size="sm">Đăng ký</Button>
          </Link>
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
          <Link href="/leaderboard" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>Bảng xếp hạng</Link>
          <Link href="/badges" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>Huy hiệu</Link>
          <div className={styles.mobileCta}>
            <Link href="/login"><Button variant="outline" fullWidth>Đăng nhập</Button></Link>
            <Link href="/register"><Button variant="primary" fullWidth>Đăng ký</Button></Link>
          </div>
        </motion.div>
      )}
    </header>
  );
}
