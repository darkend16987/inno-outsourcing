'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowLeft, ArrowRight, UploadCloud, FileText } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import styles from './page.module.css';

const JOB_TITLE = 'Thiết kế kết cấu Bệnh viện Đa khoa Cần Thơ';
const TOTAL_STEPS = 3;

export default function ApplyPage() {
  const router = useRouter();
  const params = useParams();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep(s => s + 1);
  };
  const handlePrev = () => {
    if (step > 1) setStep(s => s - 1);
    else router.back();
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      // Giả lập nộp thành công, quay về danh sách việc
      router.push('/freelancer/jobs');
    }, 1500);
  };

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
          <p className={styles.subtitle}>{JOB_TITLE}</p>

          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>

        <div className={styles.content}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className={styles.stepTitle}>Đề xuất ngân sách & Thời gian</h2>
                <div className={styles.formGroup}>
                  <label>Mức phí đề xuất (VND)</label>
                  <input type="text" placeholder="Ví dụ: 120,000,000" className={styles.input} />
                  <span className={styles.hint}>Ngân sách của Job Master: 120,000,000₫</span>
                </div>
                <div className={styles.formGroup}>
                  <label>Thời gian hoàn thành dự kiến (Ngày)</label>
                  <input type="number" placeholder="Ví dụ: 90" className={styles.input} />
                  <span className={styles.hint}>Vui lòng đề xuất thời gian thực tế bạn cần.</span>
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
                  />
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className={styles.stepTitle}>Tài liệu đính kèm (CV / Portfolio)</h2>
                <div className={styles.uploadBox}>
                  <UploadCloud size={40} className={styles.upIcon} />
                  <h4>Kéo thả file vào đây hoặc nhấn để tải lên</h4>
                  <p>Hỗ trợ PDF, DOCX, định dạng ảnh (Tối đa 10MB)</p>
                  <Button variant="outline" size="sm" className={styles.upBtn}>Tải tệp lên</Button>
                </div>
                <div className={styles.fileList}>
                  <div className={styles.fileItem}>
                    <FileText size={16} /> PROFILE_NguyenVanA_KetCau.pdf 
                    <button className={styles.delBtn}>Xóa</button>
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
            <Button onClick={handleNext}>Tiếp tục <ArrowRight size={16} /></Button>
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
