'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowLeft, ArrowRight, AlertTriangle, Loader2, Inbox } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { getJobById, applyForJob, checkExistingApplication } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/firebase/auth-context';
import { formatFriendlyMoney } from '@/lib/formatters';
import type { Job } from '@/types';
import styles from './page.module.css';

const TOTAL_STEPS = 3;

export default function ApplyPage() {
  const router = useRouter();
  const params = useParams();
  const { userProfile } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [feeWarning, setFeeWarning] = useState('');
  const [feeBlocked, setFeeBlocked] = useState(false);

  // Form state
  const [expectedFee, setExpectedFee] = useState('');
  const [estimatedDays, setEstimatedDays] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [portfolioLink, setPortfolioLink] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!params.id) return;
      try {
        const result = await getJobById(params.id as string);
        setJob(result);

        // Check if user already applied
        if (result && userProfile) {
          const existing = await checkExistingApplication(result.id, userProfile.uid);
          if (existing) setAlreadyApplied(true);
        }
      } catch (err) {
        console.error('Error loading job:', err);
      }
      setLoading(false);
    };
    fetchData();
  }, [params.id, userProfile]);

  // Fee validation logic
  const validateFee = (feeStr: string) => {
    if (!job || !feeStr) {
      setFeeWarning('');
      setFeeBlocked(false);
      return;
    }
    const feeNum = parseInt(feeStr.replace(/\D/g, ''), 10);
    if (isNaN(feeNum) || feeNum <= 0) {
      setFeeWarning('');
      setFeeBlocked(false);
      return;
    }

    const budget = job.totalFee || 0;
    // maxFeeLimit is set by jobmaster, defaults to budget * 1.2 (120%)
    const maxLimit = job.maxFeeLimit || Math.round(budget * 1.2);
    const warningThreshold = budget; // Warn if exceeds budget

    if (feeNum > maxLimit) {
      setFeeWarning(`⛔ Mức phí ${formatFriendlyMoney(feeNum)} vượt quá giới hạn cho phép (${formatFriendlyMoney(maxLimit)}). Bạn không thể ứng tuyển với mức phí này.`);
      setFeeBlocked(true);
    } else if (feeNum > warningThreshold) {
      setFeeWarning(`⚠️ Mức phí ${formatFriendlyMoney(feeNum)} cao hơn ngân sách (${formatFriendlyMoney(budget)}). Giới hạn tối đa: ${formatFriendlyMoney(maxLimit)}.`);
      setFeeBlocked(false);
    } else {
      setFeeWarning('');
      setFeeBlocked(false);
    }
  };

  const handleFeeChange = (val: string) => {
    setExpectedFee(val);
    validateFee(val);
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep(s => s + 1);
  };
  const handlePrev = () => {
    if (step > 1) setStep(s => s - 1);
    else router.back();
  };

  const handleSubmit = async () => {
    if (!job || !userProfile) return;
    setSubmitError('');

    // Validate fee limit
    if (feeBlocked) {
      setSubmitError('Mức phí vượt giới hạn cho phép. Vui lòng điều chỉnh.');
      setStep(1);
      return;
    }

    // Basic validation
    if (!coverLetter || coverLetter.length < 50) {
      setSubmitError('Thư ứng tuyển cần ít nhất 50 ký tự.');
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    try {
      await applyForJob({
        jobId: job.id,
        jobTitle: job.title,
        applicantId: userProfile.uid,
        applicantName: userProfile.displayName || '',
        applicantLevel: userProfile.currentLevel || userProfile.selfAssessedLevel || 'L1',
        applicantSpecialties: userProfile.specialties || [],
        availableDate: new Date().toISOString().split('T')[0],
        expectedFee: expectedFee ? parseInt(expectedFee.replace(/\D/g, ''), 10) : undefined,
        coverLetter,
        portfolioLink: portfolioLink || '',
      });
      router.push('/freelancer/jobs');
    } catch (err) {
      console.error('Submit error:', err);
      setSubmitError('Có lỗi xảy ra khi nộp hồ sơ. Vui lòng thử lại.');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Card className={styles.wizardCard}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '4rem', color: 'var(--text-secondary)' }}>
            <Loader2 size={24} /> Đang tải thông tin dự án...
          </div>
        </Card>
      </div>
    );
  }

  if (!job) {
    return (
      <div className={styles.page}>
        <Card className={styles.wizardCard}>
          <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '4rem', color: 'var(--text-secondary)' }}>
            <Inbox size={32} />
            <p>Không tìm thấy dự án.</p>
            <Button variant="outline" onClick={() => router.push('/freelancer/jobs')}>Quay lại danh sách</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (alreadyApplied) {
    return (
      <div className={styles.page}>
        <Card className={styles.wizardCard}>
          <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '4rem', color: 'var(--text-secondary)' }}>
            <CheckCircle2 size={40} style={{ color: 'var(--color-success)' }} />
            <h3 style={{ color: 'var(--text-primary)' }}>Bạn đã ứng tuyển dự án này rồi</h3>
            <p>Hồ sơ của bạn đang được xem xét</p>
            <Button variant="outline" onClick={() => router.push('/freelancer/jobs')}>Quay lại danh sách việc</Button>
          </div>
        </Card>
      </div>
    );
  }

  const budget = job.totalFee || 0;
  const maxLimit = job.maxFeeLimit || Math.round(budget * 1.2);

  return (
    <div className={styles.page}>
      <Card className={styles.wizardCard}>
        <div className={styles.header}>
          <div className={styles.hTop}>
            <button className={styles.backBtn} onClick={handlePrev}>
              <ArrowLeft size={16} /> Quay lại
            </button>
            <div className={styles.stepInfo}>Bước {step} / {TOTAL_STEPS}</div>
          </div>
          <h1 className={styles.title}>Nộp hồ sơ ứng tuyển</h1>
          <p className={styles.subtitle}>{job.title}</p>

          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>

        <div className={styles.content}>
          {submitError && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(220,38,38,0.1)', color: '#dc2626', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
              {submitError}
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className={styles.stepTitle}>Đề xuất ngân sách & Thời gian</h2>

                {/* Budget info card */}
                <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Ngân sách Job Master:</span>
                    <strong>{formatFriendlyMoney(budget)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Mức phí tối đa cho phép:</span>
                    <strong style={{ color: 'var(--color-warning)' }}>{formatFriendlyMoney(maxLimit)}</strong>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Mức phí đề xuất (VND)</label>
                  <input
                    type="text"
                    placeholder={`Ví dụ: ${budget.toLocaleString('vi-VN')}`}
                    className={`${styles.input} ${feeBlocked ? styles.inputError || '' : ''}`}
                    value={expectedFee}
                    onChange={e => handleFeeChange(e.target.value)}
                    style={feeBlocked ? { borderColor: '#dc2626' } : undefined}
                  />
                  {feeWarning && (
                    <div style={{ 
                      padding: '0.5rem 0.75rem', 
                      borderRadius: '0.375rem', 
                      fontSize: '0.8125rem', 
                      marginTop: '0.5rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.375rem',
                      background: feeBlocked ? 'rgba(220,38,38,0.08)' : 'rgba(234,179,8,0.08)',
                      color: feeBlocked ? '#dc2626' : '#b45309',
                      border: `1px solid ${feeBlocked ? 'rgba(220,38,38,0.2)' : 'rgba(234,179,8,0.2)'}`,
                    }}>
                      <AlertTriangle size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span>{feeWarning}</span>
                    </div>
                  )}
                  {!feeWarning && (
                    <span className={styles.hint}>Để trống để chấp nhận ngân sách của Job Master ({formatFriendlyMoney(budget)})</span>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label>Thời gian hoàn thành dự kiến (Ngày)</label>
                  <input
                    type="number"
                    placeholder={`Ví dụ: ${job.duration || 90}`}
                    className={styles.input}
                    value={estimatedDays}
                    onChange={e => setEstimatedDays(e.target.value)}
                  />
                  <span className={styles.hint}>Thời gian yêu cầu: {job.duration ? `${job.duration} ngày` : 'Không xác định'}</span>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className={styles.stepTitle}>Thư tự giới thiệu (Cover Letter)</h2>
                <div className={styles.formGroup}>
                  <label>Hãy mô tả vì sao bạn phù hợp với dự án này</label>
                  <textarea 
                    rows={6} 
                    placeholder="Viết đôi dòng về kinh nghiệm của bạn với các dự án tương tự..." 
                    className={styles.textarea}
                    value={coverLetter}
                    onChange={e => setCoverLetter(e.target.value)}
                  />
                  <span className={styles.hint}>{coverLetter.length}/2000 ký tự (tối thiểu 50)</span>
                </div>
                <div className={styles.formGroup}>
                  <label>Link Portfolio (không bắt buộc)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    className={styles.input}
                    value={portfolioLink}
                    onChange={e => setPortfolioLink(e.target.value)}
                  />
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className={styles.stepTitle}>Xác nhận thông tin</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem' }}>
                    <strong>Dự án:</strong> {job.title}
                  </div>
                  <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem' }}>
                    <strong>Mức phí đề xuất:</strong> {expectedFee ? `${parseInt(expectedFee.replace(/\D/g, ''), 10).toLocaleString('vi-VN')}₫` : `Theo ngân sách (${formatFriendlyMoney(budget)})`}
                  </div>
                  <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem' }}>
                    <strong>Thời gian dự kiến:</strong> {estimatedDays ? `${estimatedDays} ngày` : `Theo yêu cầu (${job.duration || '-'} ngày)`}
                  </div>
                  <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem' }}>
                    <strong>Cover Letter:</strong>
                    <p style={{ marginTop: '0.25rem', color: 'var(--text-secondary)' }}>{coverLetter || '(Chưa nhập)'}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={styles.footer}>
          <Button variant="outline" onClick={handlePrev} disabled={isSubmitting}>
            Quay lại
          </Button>
          {step < TOTAL_STEPS ? (
            <Button onClick={handleNext} disabled={step === 1 && feeBlocked}>
              {step === 1 && feeBlocked ? 'Vui lòng điều chỉnh mức phí' : 'Tiếp tục'} <ArrowRight size={16} />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Đang nộp...' : 'Nộp hồ sơ'} <CheckCircle2 size={16} />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
