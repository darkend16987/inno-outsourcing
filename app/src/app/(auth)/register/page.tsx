'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Phone, ArrowRight, Building2, HardHat, Briefcase, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui';
import styles from './page.module.css';

type AccountType = 'freelancer' | 'staff' | 'partner';

const ACCOUNT_TYPES = [
  { id: 'freelancer' as const, label: 'Freelancer', desc: 'Nhận việc thiết kế, thi công', icon: HardHat },
  { id: 'staff' as const, label: 'Nhân viên INNO', desc: 'Quản lý job và team', icon: Building2 },
  { id: 'partner' as const, label: 'Đối tác', desc: 'Hợp tác dài hạn', icon: Briefcase },
];

const SPECIALTIES = ['Kiến trúc', 'Kết cấu', 'MEP', 'BIM', 'Dự toán', 'Giám sát', 'Thẩm tra'];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<AccountType>('freelancer');
  const [showPw, setShowPw] = useState(false);
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);

  const toggleSpec = (spec: string) => {
    setSelectedSpecs(prev =>
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <div className={styles.leftContent}>
          <div className={styles.brand}>
            <div className={styles.logo}><span>V</span></div>
            <strong>VAA JOB</strong>
          </div>
          <h1 className={styles.leftTitle}>
            Gia nhập cộng đồng<br />
            <span className={styles.highlight}>chuyên gia xây dựng</span>
          </h1>
          <p className={styles.leftDesc}>
            Hàng trăm dự án đang chờ bạn. Đăng ký ngay để bắt đầu hành trình chuyên nghiệp.
          </p>
          <div className={styles.steps}>
            {['Loại tài khoản', 'Thông tin cơ bản', 'Chuyên môn'].map((s, i) => (
              <div key={i} className={`${styles.stepItem} ${step > i ? styles.stepDone : ''} ${step === i + 1 ? styles.stepActive : ''}`}>
                <div className={styles.stepNum}>{step > i + 1 ? '✓' : i + 1}</div>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.right}>
        <motion.div className={styles.formContainer} key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }}>
          <h2 className={styles.formTitle}>Đăng ký tài khoản</h2>

          {/* Step 1: Account Type */}
          {step === 1 && (
            <>
              <p className={styles.formDesc}>Chọn loại tài khoản phù hợp với bạn</p>
              <div className={styles.typeGrid}>
                {ACCOUNT_TYPES.map(type => (
                  <button
                    key={type.id}
                    className={`${styles.typeCard} ${accountType === type.id ? styles.typeActive : ''}`}
                    onClick={() => setAccountType(type.id)}
                  >
                    <type.icon size={24} />
                    <strong>{type.label}</strong>
                    <span>{type.desc}</span>
                  </button>
                ))}
              </div>
              <Button variant="primary" fullWidth size="lg" onClick={() => setStep(2)} iconRight={<ArrowRight size={16} />}>
                Tiếp tục
              </Button>
            </>
          )}

          {/* Step 2: Basic Info */}
          {step === 2 && (
            <>
              <p className={styles.formDesc}>Điền thông tin cơ bản</p>

              <Button variant="secondary" fullWidth size="lg" icon={
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              }>Đăng ký với Google</Button>

              <div className={styles.divider}><span>hoặc</span></div>

              <form className={styles.form} onSubmit={e => { e.preventDefault(); setStep(3); }}>
                <div className={styles.field}>
                  <label className={styles.label}>Họ và tên</label>
                  <div className={styles.inputWrap}>
                    <User size={16} className={styles.inputIcon} />
                    <input type="text" placeholder="Nguyễn Văn A" className={styles.input} required />
                  </div>
                </div>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label className={styles.label}>Email</label>
                    <div className={styles.inputWrap}>
                      <Mail size={16} className={styles.inputIcon} />
                      <input type="email" placeholder="email@example.com" className={styles.input} required />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Số điện thoại</label>
                    <div className={styles.inputWrap}>
                      <Phone size={16} className={styles.inputIcon} />
                      <input type="tel" placeholder="0901 234 567" className={styles.input} required />
                    </div>
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Mật khẩu</label>
                  <div className={styles.inputWrap}>
                    <Lock size={16} className={styles.inputIcon} />
                    <input type={showPw ? 'text' : 'password'} placeholder="Tối thiểu 8 ký tự" className={styles.input} required />
                    <button type="button" className={styles.eyeBtn} onClick={() => setShowPw(!showPw)}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className={styles.btnRow}>
                  <Button variant="ghost" onClick={() => setStep(1)}>← Quay lại</Button>
                  <Button variant="primary" type="submit" iconRight={<ArrowRight size={16} />}>Tiếp tục</Button>
                </div>
              </form>
            </>
          )}

          {/* Step 3: Specialty (Freelancer only) */}
          {step === 3 && (
            <>
              <p className={styles.formDesc}>
                {accountType === 'freelancer' ? 'Chọn lĩnh vực chuyên môn' : 'Xác nhận đăng ký'}
              </p>
              {accountType === 'freelancer' && (
                <>
                  <div className={styles.specGrid}>
                    {SPECIALTIES.map(spec => (
                      <button
                        key={spec}
                        className={`${styles.specChip} ${selectedSpecs.includes(spec) ? styles.specActive : ''}`}
                        onClick={() => toggleSpec(spec)}
                      >
                        {spec}
                      </button>
                    ))}
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Kinh nghiệm (năm)</label>
                    <div className={styles.inputWrap}>
                      <input type="number" placeholder="VD: 5" className={styles.input} style={{ paddingLeft: 14 }} min={0} />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Giới thiệu ngắn</label>
                    <textarea placeholder="Mô tả kinh nghiệm và năng lực của bạn..." className={styles.textarea} rows={3} />
                  </div>
                </>
              )}
              <div className={styles.btnRow}>
                <Button variant="ghost" onClick={() => setStep(2)}>← Quay lại</Button>
                <Button variant="primary" size="lg" iconRight={<ArrowRight size={16} />}>Hoàn tất đăng ký</Button>
              </div>
            </>
          )}

          <p className={styles.footer}>
            Đã có tài khoản? <Link href="/login" className={styles.footerLink}>Đăng nhập</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
