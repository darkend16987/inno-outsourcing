'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Phone, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/lib/firebase/auth-context';
import styles from './page.module.css';

const ROLE_DASHBOARD: Record<string, string> = {
  admin: '/admin',
  jobmaster: '/jobmaster',
  freelancer: '/freelancer',
  accountant: '/accountant',
};

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false);
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signInWithEmail, signInWithGoogle, userProfile, loading } = useAuth();
  const router = useRouter();

  // Redirect when auth state settles and profile is loaded
  useEffect(() => {
    if (!loading && userProfile && isSubmitting) {
      const target = ROLE_DASHBOARD[userProfile.role] || '/freelancer';
      router.push(target);
    }
  }, [loading, userProfile, isSubmitting, router]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Vui lòng nhập email và mật khẩu');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await signInWithEmail(email, password);
      // Redirect will be handled by useEffect once userProfile loads
    } catch (err: unknown) {
      if (err instanceof Error) {
        const error = err as Error & { code?: string };
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
          setErrorMsg('Sai email hoặc mật khẩu');
        } else {
          setErrorMsg(error.message || 'Đăng nhập thất bại');
        }
      } else {
        setErrorMsg('Đăng nhập thất bại');
      }
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await signInWithGoogle();
      // Redirect will be handled by useEffect once userProfile loads
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message || 'Đã có lỗi khi đăng nhập bằng Google');
      } else {
        setErrorMsg('Đã có lỗi khi đăng nhập bằng Google');
      }
      setIsSubmitting(false);
    }
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
            Quản lý dự án<br />
            <span className={styles.highlight}>Thiết kế Xây dựng</span><br />
            chuyên nghiệp
          </h1>
          <p className={styles.leftDesc}>
            Kiến trúc · Kết cấu · MEP · BIM · Dự toán — Kết nối tài năng với cơ hội.
          </p>
        </div>
      </div>

      <div className={styles.right}>
        <motion.div className={styles.formContainer} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <h2 className={styles.formTitle}>Đăng nhập</h2>
          <p className={styles.formDesc}>Chào mừng trở lại! Đăng nhập để tiếp tục.</p>

          {/* SSO Buttons */}
          <Button 
            variant="secondary" 
            fullWidth 
            size="lg" 
            disabled={isSubmitting}
            onClick={handleGoogleLogin}
            icon={
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          }>
            Đăng nhập với Google
          </Button>

          <div className={styles.divider}>
            <span>hoặc đăng nhập bằng</span>
          </div>

          {errorMsg && (
            <div style={{ color: 'var(--color-error)', backgroundColor: '#FEE2E2', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <AlertCircle size={16} />
              {errorMsg}
            </div>
          )}

          {/* Method Tabs */}
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${method === 'email' ? styles.tabActive : ''}`}
              onClick={() => setMethod('email')}
            >
              <Mail size={14} /> Email
            </button>
            <button
              type="button"
              className={`${styles.tab} ${method === 'phone' ? styles.tabActive : ''}`}
              onClick={() => setMethod('phone')}
            >
              <Phone size={14} /> Số điện thoại
            </button>
          </div>

          <form className={styles.form} onSubmit={handleEmailLogin}>
            {method === 'email' ? (
              <>
                <div className={styles.field}>
                  <label className={styles.label}>Email</label>
                  <div className={styles.inputWrap}>
                    <Mail size={16} className={styles.inputIcon} />
                    <input 
                      type="email" 
                      placeholder="email@example.com" 
                      className={styles.input} 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className={styles.field}>
                  <div className={styles.labelRow}>
                    <label className={styles.label}>Mật khẩu</label>
                    <a href="#" className={styles.forgot}>Quên mật khẩu?</a>
                  </div>
                  <div className={styles.inputWrap}>
                    <Lock size={16} className={styles.inputIcon} />
                    <input 
                      type={showPw ? 'text' : 'password'} 
                      placeholder="••••••••" 
                      className={styles.input} 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <button type="button" className={styles.eyeBtn} onClick={() => setShowPw(!showPw)}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.field}>
                <label className={styles.label}>Số điện thoại</label>
                <div className={styles.inputWrap}>
                  <Phone size={16} className={styles.inputIcon} />
                  <input type="tel" placeholder="0901 234 567" className={styles.input} disabled={isSubmitting} />
                </div>
                <p className={styles.hint}>Chúng tôi sẽ gửi mã OTP đến số điện thoại này (Tính năng đang phát triển).</p>
              </div>
            )}

            <Button 
              variant="primary" 
              fullWidth 
              size="lg" 
              type="submit" 
              disabled={isSubmitting || (method === 'phone')}
              iconRight={<ArrowRight size={16} />}
            >
              {isSubmitting ? 'Đang xử lý...' : (method === 'email' ? 'Đăng nhập' : 'Gửi mã OTP')}
            </Button>
          </form>

          <p className={styles.footer}>
            Chưa có tài khoản? <Link href="/register" className={styles.footerLink}>Đăng ký ngay</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
