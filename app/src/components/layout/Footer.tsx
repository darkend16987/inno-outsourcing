'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin } from 'lucide-react';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          {/* Brand Column */}
          <div className={styles.brandCol}>
            <div className={styles.brand}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-white.png" alt="VAA Job" className={styles.logoImg} />
              <div>
                <strong className={styles.brandName}>VAA JOB</strong>
                <p className={styles.brandTag}>Construction Outsourcing Platform</p>
              </div>
            </div>
            <p className={styles.brandDesc}>
              Nền tảng kết nối freelancer với các dự án thiết kế xây dựng chuyên nghiệp.
              Kiến trúc · Kết cấu · MEP · BIM
            </p>
          </div>

          {/* Links */}
          <div className={styles.linkCol}>
            <h4 className={styles.colTitle}>Nền tảng</h4>
            <Link href="/jobs" className={styles.link}>Việc làm</Link>
            <Link href="/vinh-danh" className={styles.link}>Bảng xếp hạng</Link>
            <Link href="/badges" className={styles.link}>Huy hiệu</Link>
            <Link href="/register" className={styles.link}>Đăng ký</Link>
          </div>

          <div className={styles.linkCol}>
            <h4 className={styles.colTitle}>Hỗ trợ</h4>
            <Link href="#" className={styles.link}>Hướng dẫn sử dụng</Link>
            <Link href="#" className={styles.link}>Chính sách bảo mật</Link>
            <Link href="#" className={styles.link}>Điều khoản sử dụng</Link>
            <Link href="#" className={styles.link}>FAQ</Link>
          </div>

          {/* Contact */}
          <div className={styles.linkCol}>
            <h4 className={styles.colTitle}>Liên hệ</h4>
            <div className={styles.contactItem}>
              <Mail size={14} />
              <span>contact@vaajob.vn</span>
            </div>
            <div className={styles.contactItem}>
              <Phone size={14} />
              <span>(028) 1234 5678</span>
            </div>
            <div className={styles.contactItem}>
              <MapPin size={14} />
              <span>TP. Hồ Chí Minh, Việt Nam</span>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copy}>© 2026 VAA JOB. All rights reserved.</p>
          <p className={styles.powered}>Powered by INNO Design & Build</p>
        </div>
      </div>
    </footer>
  );
}
