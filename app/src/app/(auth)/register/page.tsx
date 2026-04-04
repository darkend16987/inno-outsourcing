'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Phone, ArrowRight, HardHat, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/lib/firebase/auth-context';
import styles from './page.module.css';

const SPECIALTIES = ['Kiến trúc', 'Kết cấu', 'MEP', 'BIM', 'Dự toán', 'Giám sát', 'Thẩm tra'];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [showPw, setShowPw] = useState(false);
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [experience, setExperience] = useState('');
  const [bio, setBio] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const router = useRouter();

  const toggleSpec = (spec: string) => {
    setSelectedSpecs(prev =>
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );
  };

  const handleGoogleRegister = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await signInWithGoogle();
      // Google users always get 'freelancer' role (set by ensureUserProfile in auth-context)
      router.push('/');
    } catch (err: unknown) {
      if (err instanceof Error) {
        // Provide user-friendly error messages
        const error = err as Error & { code?: string };
        if (error.code === 'auth/unauthorized-domain') {
          setErrorMsg('Domain chưa được cấu hình. Vui lòng liên hệ quản trị viên.');
        } else if (error.code === 'auth/popup-closed-by-user') {
          setErrorMsg('Bạn đã đóng cửa sổ đăng nhập Google.');
        } else {
          setErrorMsg(error.message || 'Lỗi đăng ký bằng Google');
        }
      } else {
        setErrorMsg('Lỗi đăng ký bằng Google');
      }
      setIsSubmitting(false);
    }
  };

  const handleFinalSubmit = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg('');

      // SECURITY: Public registration ALWAYS creates freelancer accounts only.
      // Admin, jobmaster, accountant roles must be assigned via Firebase Console
      // or the admin user management panel.
      const extraData = {
        displayName: name,
        phone,
        role: 'freelancer' as const,
        specialties: selectedSpecs,
        experience: experience ? parseInt(experience) : 0,
        bio,
      };

      await signUpWithEmail(email, password, extraData);
      router.push('/');
    } catch (err: unknown) {
      if (err instanceof Error) {
        const error = err as Error & { code?: string };
        if (error.code === 'auth/email-already-in-use') {
          setErrorMsg('Email đã được sử dụng');
        } else if (error.code === 'auth/weak-password') {
          setErrorMsg('Mật khẩu quá yếu, tối thiểu 6 ký tự');
        } else {
          setErrorMsg(error.message || 'Có lỗi xảy ra khi đăng ký');
        }
      } else {
        setErrorMsg('Có lỗi xảy ra khi đăng ký');
      }
      setIsSubmitting(false);
      setStep(1);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <div className={styles.leftContent}>
          <div className={styles.brand}>
            <div className={styles.logo}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="VAA Job" className={styles.logoImg} />
            </div>
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
            {['Thông tin cơ bản', 'Chuyên môn'].map((s, i) => (
              <div key={i} className={`${styles.stepItem} ${step > i ? styles.stepDone : ''} ${step === i + 1 ? styles.stepActive : ''}`}>
                <div className={styles.stepNum}>{step > i + 1 ? '✓' : i + 1}</div>
                <span>{s}</span>
              </div>
            ))}
          </div>

          {/* Freelancer badge */}
          <div className={styles.roleBadge}>
            <HardHat size={18} />
            <div>
              <strong>Đăng ký Freelancer</strong>
              <span>Nhận việc thiết kế, thi công chuyên nghiệp</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.right}>
        <motion.div className={styles.formContainer} key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }}>
          <h2 className={styles.formTitle}>Đăng ký tài khoản Freelancer</h2>
          
          {errorMsg && (
            <div style={{ color: 'var(--color-error)', backgroundColor: '#FEE2E2', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
              {errorMsg}
            </div>
          )}

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <>
              <p className={styles.formDesc}>Điền thông tin cơ bản</p>

              <Button variant="secondary" fullWidth size="lg" disabled={isSubmitting} onClick={handleGoogleRegister} icon={
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              }>Đăng ký với Google</Button>

              <div className={styles.divider}><span>hoặc</span></div>

              <form className={styles.form} onSubmit={e => { e.preventDefault(); setStep(2); }}>
                <div className={styles.field}>
                  <label className={styles.label}>Họ và tên</label>
                  <div className={styles.inputWrap}>
                    <User size={16} className={styles.inputIcon} />
                    <input type="text" placeholder="Nguyễn Văn A" className={styles.input} required value={name} onChange={e => setName(e.target.value)} />
                  </div>
                </div>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label className={styles.label}>Email</label>
                    <div className={styles.inputWrap}>
                      <Mail size={16} className={styles.inputIcon} />
                      <input type="email" placeholder="email@example.com" className={styles.input} required value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Số điện thoại</label>
                    <div className={styles.inputWrap}>
                      <Phone size={16} className={styles.inputIcon} />
                      <input type="tel" placeholder="0901 234 567" className={styles.input} value={phone} onChange={e => setPhone(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Mật khẩu</label>
                  <div className={styles.inputWrap}>
                    <Lock size={16} className={styles.inputIcon} />
                    <input type={showPw ? 'text' : 'password'} placeholder="Tối thiểu 6 ký tự" className={styles.input} required value={password} onChange={e => setPassword(e.target.value)} />
                    <button type="button" className={styles.eyeBtn} onClick={() => setShowPw(!showPw)}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <Button variant="primary" fullWidth size="lg" type="submit" iconRight={<ArrowRight size={16} />}>Tiếp tục</Button>
              </form>
            </>
          )}

          {/* Step 2: Specialty */}
          {step === 2 && (
            <>
              <p className={styles.formDesc}>Chọn lĩnh vực chuyên môn của bạn</p>
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
                  <input type="number" placeholder="VD: 5" className={styles.input} style={{ paddingLeft: 14 }} min={0} value={experience} onChange={e => setExperience(e.target.value)} />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Giới thiệu ngắn</label>
                <textarea placeholder="Mô tả kinh nghiệm và năng lực của bạn..." className={styles.textarea} rows={3} value={bio} onChange={e => setBio(e.target.value)} />
              </div>
              <div className={styles.btnRow}>
                <Button variant="ghost" onClick={() => setStep(1)}>← Quay lại</Button>
                <Button variant="primary" size="lg" disabled={isSubmitting} onClick={handleFinalSubmit} iconRight={<ArrowRight size={16} />}>
                  {isSubmitting ? 'Đang xử lý...' : 'Hoàn tất đăng ký'}
                </Button>
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
