'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, MessageSquare, Clock, User, DollarSign, FileText, Send } from 'lucide-react';
import { Button, Card, Badge, StatusBadge, LevelBadge } from '@/components/ui';
import styles from './page.module.css';

const MOCK_JOB = {
  id: '1',
  title: 'Thiết kế kiến trúc Nhà xưởng KCN Bình Dương',
  description: 'Thiết kế kiến trúc nhà xưởng sản xuất diện tích 5000m2, bao gồm văn phòng điều hành và khu sản xuất. Yêu cầu tuân thủ tiêu chuẩn PCCC, thiết kế theo TCVN.',
  category: 'Kiến trúc',
  level: 'L3' as const,
  status: 'pending_approval' as const,
  totalFee: 48000000,
  duration: 45,
  workMode: 'remote',
  jobMaster: 'Nguyễn Văn A',
  createdBy: 'Admin System',
  createdAt: '02/04/2026',
  deadline: '17/05/2026',
  milestones: [
    { name: 'Đợt 1 — Phương án sơ bộ', percentage: 30, amount: 14400000, condition: 'Khi đạt 30% tiến độ' },
    { name: 'Đợt 2 — Thiết kế chi tiết', percentage: 70, amount: 19200000, condition: 'Khi đạt 70% tiến độ' },
    { name: 'Đợt 3 — Hoàn thiện', percentage: 100, amount: 14400000, condition: 'Nghiệm thu hoàn thành' },
  ],
  requirements: { experience: 'Ít nhất 3 năm thiết kế kiến trúc công nghiệp', certifications: 'CCHN Kiến trúc sư hạng II trở lên', software: ['AutoCAD', 'Revit', 'SketchUp'], standards: ['TCVN 2748', 'QCVN 06'] },
  internalNotes: [
    { author: 'Admin', content: 'Khách hàng yêu cầu gấp, ưu tiên duyệt sớm.', date: '02/04/2026' },
  ],
};

export default function AdminJobReviewPage() {
  const params = useParams();
  const router = useRouter();
  const [newNote, setNewNote] = useState('');
  const [notes, setNotes] = useState(MOCK_JOB.internalNotes);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    setNotes(prev => [...prev, { author: 'Admin', content: newNote, date: new Date().toLocaleDateString('vi-VN') }]);
    setNewNote('');
  };

  return (
    <div className={styles.page}>
      <Link href="/admin/jobs" className={styles.backLink}>
        <ArrowLeft size={16} /> Quay lại danh sách
      </Link>

      <div className={styles.pageHeader}>
        <div>
          <div className={styles.titleRow}>
            <h1 className={styles.pageTitle}>{MOCK_JOB.title}</h1>
            <StatusBadge status={MOCK_JOB.status} label="Chờ duyệt" />
          </div>
          <div className={styles.metaRow}>
            <span><Badge variant="default">{MOCK_JOB.category}</Badge></span>
            <span><LevelBadge level={MOCK_JOB.level} /></span>
            <span className={styles.metaItem}><Clock size={14} /> {MOCK_JOB.duration} ngày</span>
            <span className={styles.metaItem}><DollarSign size={14} /> {(MOCK_JOB.totalFee / 1000000).toFixed(0)}M ₫</span>
            <span className={styles.metaItem}><User size={14} /> JM: {MOCK_JOB.jobMaster}</span>
          </div>
        </div>

        {MOCK_JOB.status === 'pending_approval' && (
          <div className={styles.actionButtons}>
            <Button variant="success" size="md" icon={<CheckCircle size={16} />}>Duyệt Job</Button>
            <Button variant="danger" size="md" icon={<XCircle size={16} />} onClick={() => setShowRejectForm(!showRejectForm)}>Từ chối</Button>
          </div>
        )}
      </div>

      {showRejectForm && (
        <Card variant="bordered" className={styles.rejectForm}>
          <h3>Lý do từ chối</h3>
          <textarea
            className={styles.textarea}
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Nhập lý do từ chối để gửi lại cho người tạo..."
            rows={3}
          />
          <div className={styles.rejectActions}>
            <Button variant="danger" size="sm" icon={<Send size={14} />}>Xác nhận từ chối</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowRejectForm(false)}>Hủy</Button>
          </div>
        </Card>
      )}

      <div className={styles.contentGrid}>
        <div className={styles.mainCol}>
          <Card variant="bordered">
            <h3 className={styles.sectionTitle}><FileText size={18} /> Mô tả công việc</h3>
            <p className={styles.description}>{MOCK_JOB.description}</p>
          </Card>

          <Card variant="bordered">
            <h3 className={styles.sectionTitle}>Yêu cầu năng lực</h3>
            <div className={styles.reqGrid}>
              <div className={styles.reqItem}><strong>Kinh nghiệm:</strong> {MOCK_JOB.requirements.experience}</div>
              <div className={styles.reqItem}><strong>Chứng chỉ:</strong> {MOCK_JOB.requirements.certifications}</div>
              <div className={styles.reqItem}><strong>Phần mềm:</strong> {MOCK_JOB.requirements.software.join(', ')}</div>
              <div className={styles.reqItem}><strong>Tiêu chuẩn:</strong> {MOCK_JOB.requirements.standards.join(', ')}</div>
            </div>
          </Card>

          <Card variant="bordered">
            <h3 className={styles.sectionTitle}><DollarSign size={18} /> Đợt thanh toán</h3>
            <div className={styles.milestoneList}>
              {MOCK_JOB.milestones.map((ms, i) => (
                <div key={i} className={styles.milestoneItem}>
                  <div className={styles.msName}>{ms.name}</div>
                  <div className={styles.msDetail}>
                    <span>{ms.percentage}%</span>
                    <span className={styles.msAmount}>{(ms.amount / 1000000).toFixed(1)}M ₫</span>
                    <span className={styles.msCondition}>{ms.condition}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className={styles.sideCol}>
          <Card variant="bordered">
            <h3 className={styles.sectionTitle}>Thông tin dự án</h3>
            <div className={styles.infoList}>
              <div className={styles.infoRow}><span>Người tạo:</span><strong>{MOCK_JOB.createdBy}</strong></div>
              <div className={styles.infoRow}><span>Ngày tạo:</span><strong>{MOCK_JOB.createdAt}</strong></div>
              <div className={styles.infoRow}><span>Hạn nộp:</span><strong>{MOCK_JOB.deadline}</strong></div>
              <div className={styles.infoRow}><span>Hình thức:</span><strong>{MOCK_JOB.workMode === 'remote' ? 'Từ xa' : MOCK_JOB.workMode === 'on-site' ? 'Tại chỗ' : 'Kết hợp'}</strong></div>
            </div>
          </Card>

          <Card variant="bordered" className={styles.notesCard}>
            <h3 className={styles.sectionTitle}><MessageSquare size={18} /> Ghi chú nội bộ</h3>
            <p className={styles.notesHint}>Chỉ admin thấy — không hiển thị cho freelancer.</p>
            <div className={styles.notesList}>
              {notes.map((note, i) => (
                <div key={i} className={styles.noteItem}>
                  <div className={styles.noteHeader}><strong>{note.author}</strong> <span>{note.date}</span></div>
                  <p>{note.content}</p>
                </div>
              ))}
            </div>
            <div className={styles.noteInput}>
              <textarea
                className={styles.textarea}
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Thêm ghi chú nội bộ..."
                rows={2}
              />
              <Button variant="outline" size="sm" icon={<Send size={14} />} onClick={handleAddNote}>Gửi</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
