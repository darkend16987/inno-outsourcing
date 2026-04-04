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
                <p className={styles.brandTag}>Cộng đồng chuyên nghiệp #1 dành cho freelancer ngành tư vấn thiết kế xây dựng</p>
              </div>
            </div>
            <p className={styles.brandDesc}>
              Kết nối năng lực tư vấn thiết kế với dự án thực chiến. Kiến trúc · Kết cấu · MEP · BIM · Dự toán · Giám sát
            </p>
          </div>

          {/* Links */}
          <div className={styles.linkCol}>
            <h4 className={styles.colTitle}>Nền tảng</h4>
            <Link href="/ve-chung-toi" className={styles.link}>Về chúng tôi</Link>
            <Link href="/jobs" className={styles.link}>Việc làm</Link>
            <Link href="/vinh-danh" className={styles.link}>Bảng xếp hạng</Link>
            <Link href="/huy-hieu" className={styles.link}>Huy hiệu</Link>
            <Link href="/register" className={styles.link}>Đăng ký</Link>
            <a href="https://vaadata.hkts.vn/" className={styles.link} target="_blank" rel="noopener noreferrer">VAA Data ↗</a>
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
              <span>info@vaadata.vn</span>
            </div>
            <div className={styles.contactItem}>
              <Phone size={14} />
              <span>024.38253648</span>
            </div>
            <div className={styles.contactItem}>
              <MapPin size={14} />
              <span>40 P. Tăng Bạt Hổ, Phạm Đình Hổ, Hà Nội</span>
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
