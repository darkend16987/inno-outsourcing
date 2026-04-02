'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, MessageSquare, Clock, User, DollarSign, FileText, Send, Loader2, Inbox } from 'lucide-react';
import { Button, Card, Badge, StatusBadge, LevelBadge } from '@/components/ui';
import { getJobById } from '@/lib/firebase/firestore';
import type { Job } from '@/types';
import styles from './page.module.css';

const formatDate = (d: unknown): string => {
  if (!d) return '-';
  if (typeof d === 'object' && d !== null && 'toDate' in d) return (d as { toDate: () => Date }).toDate().toLocaleDateString('vi-VN');
  if (d instanceof Date) return d.toLocaleDateString('vi-VN');
  return String(d);
};

const formatCurrency = (amount: number) => {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)}M ₫`;
  return `${amount.toLocaleString('vi-VN')}₫`;
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Nháp', pending_approval: 'Chờ duyệt', open: 'Đang mở', assigned: 'Chốt kèo',
  in_progress: 'Đang thực hiện', review: 'Nghiệm thu', completed: 'Hoàn thành', paid: 'Đã TT', cancelled: 'Đã hủy',
};

export default function AdminJobReviewPage() {
  const params = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [notes, setNotes] = useState<Array<{ author: string; content: string; date: string }>>([]);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      if (!params.id) return;
      const result = await getJobById(params.id as string);
      setJob(result);
      // @ts-expect-error internalNotes is dynamic field not in Job type
      if (result?.internalNotes) {
        // @ts-expect-error internalNotes is dynamic field
        setNotes(result.internalNotes as Array<{ author: string; content: string; date: string }>);
      }
      setLoading(false);
    };
    fetchJob().catch(() => setLoading(false));
  }, [params.id]);

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    setNotes(prev => [...prev, { author: 'Admin', content: newNote, date: new Date().toLocaleDateString('vi-VN') }]);
    setNewNote('');
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}><Loader2 size={24} className={styles.spin} /> Đang tải chi tiết job...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className={styles.page}>
        <Link href="/admin/jobs" className={styles.backLink}><ArrowLeft size={16} /> Quay lại</Link>
        <div className={styles.loadingWrap}><Inbox size={24} /> Không tìm thấy job này.</div>
      </div>
    );
  }

  const milestones = (job.milestones || []) as Array<{
    name: string; percentage: number; amount: number; condition: string;
  }>;

  const requirements = (job.requirements || {}) as {
    experience?: string; certifications?: string; software?: string[]; standards?: string[];
  };

  return (
    <div className={styles.page}>
      <Link href="/admin/jobs" className={styles.backLink}>
        <ArrowLeft size={16} /> Quay lại danh sách
      </Link>

      <div className={styles.pageHeader}>
        <div>
          <div className={styles.titleRow}>
            <h1 className={styles.pageTitle}>{job.title}</h1>
            <StatusBadge status={job.status} label={STATUS_LABELS[job.status] || job.status} />
          </div>
          <div className={styles.metaRow}>
            <span><Badge variant="default">{job.category}</Badge></span>
            <span><LevelBadge level={job.level} /></span>
            <span className={styles.metaItem}><Clock size={14} /> {job.duration || '-'} ngày</span>
            <span className={styles.metaItem}><DollarSign size={14} /> {formatCurrency(job.totalFee || 0)}</span>
            <span className={styles.metaItem}><User size={14} /> JM: {job.jobMasterName || '-'}</span>
          </div>
        </div>

        {job.status === 'pending_approval' && (
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
            <p className={styles.description}>{job.description}</p>
          </Card>

          <Card variant="bordered">
            <h3 className={styles.sectionTitle}>Yêu cầu năng lực</h3>
            <div className={styles.reqGrid}>
              {requirements.experience && <div className={styles.reqItem}><strong>Kinh nghiệm:</strong> {requirements.experience}</div>}
              {requirements.certifications && <div className={styles.reqItem}><strong>Chứng chỉ:</strong> {requirements.certifications}</div>}
              {requirements.software && <div className={styles.reqItem}><strong>Phần mềm:</strong> {requirements.software.join(', ')}</div>}
              {requirements.standards && <div className={styles.reqItem}><strong>Tiêu chuẩn:</strong> {requirements.standards.join(', ')}</div>}
            </div>
          </Card>

          <Card variant="bordered">
            <h3 className={styles.sectionTitle}><DollarSign size={18} /> Đợt thanh toán</h3>
            <div className={styles.milestoneList}>
              {milestones.map((ms, i) => (
                <div key={i} className={styles.milestoneItem}>
                  <div className={styles.msName}>{ms.name}</div>
                  <div className={styles.msDetail}>
                    <span>{ms.percentage}%</span>
                    <span className={styles.msAmount}>{formatCurrency(ms.amount)}</span>
                    <span className={styles.msCondition}>{ms.condition}</span>
                  </div>
                </div>
              ))}
              {milestones.length === 0 && <div className={styles.emptySmall}>Chưa thiết lập đợt thanh toán.</div>}
            </div>
          </Card>
        </div>

        <div className={styles.sideCol}>
          <Card variant="bordered">
            <h3 className={styles.sectionTitle}>Thông tin dự án</h3>
            <div className={styles.infoList}>
              <div className={styles.infoRow}><span>Người tạo:</span><strong>{job.createdBy || '-'}</strong></div>
              <div className={styles.infoRow}><span>Ngày tạo:</span><strong>{formatDate(job.createdAt)}</strong></div>
              <div className={styles.infoRow}><span>Hạn nộp:</span><strong>{formatDate(job.deadline)}</strong></div>
              <div className={styles.infoRow}><span>Hình thức:</span><strong>{job.workMode === 'remote' ? 'Từ xa' : job.workMode === 'on-site' ? 'Tại chỗ' : 'Kết hợp'}</strong></div>
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
              {notes.length === 0 && <div className={styles.emptySmall}>Chưa có ghi chú nội bộ.</div>}
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
