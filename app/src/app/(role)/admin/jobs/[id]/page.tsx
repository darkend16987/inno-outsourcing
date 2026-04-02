'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, MessageSquare, Clock, User, DollarSign, FileText, Send, Loader2, Inbox, Lock, Unlock, RotateCcw, Edit3, Save, X, ImageIcon } from 'lucide-react';
import { Button, Card, Badge, StatusBadge, LevelBadge } from '@/components/ui';
import { getJobById, updateJob } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/firebase/auth-context';
import { cache } from '@/lib/cache/swr-cache';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/formatters';
import { getConfigItems, type SystemConfigItem, type ConfigCategory } from '@/lib/firebase/system-config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
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
  const router = useRouter();
  const { userProfile } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [notes, setNotes] = useState<Array<{ author: string; content: string; date: string }>>([]);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [applicationCount, setApplicationCount] = useState(0);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTotalFee, setEditTotalFee] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editProjectScale, setEditProjectScale] = useState('');
  const [editProjectImages, setEditProjectImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');

  // Config
  const [specialties, setSpecialties] = useState<SystemConfigItem[]>([]);
  const [levels, setLevels] = useState<SystemConfigItem[]>([]);
  const [editCategory, setEditCategory] = useState('');
  const [editLevel, setEditLevel] = useState('');

  useEffect(() => {
    const fetchJob = async () => {
      if (!params.id) return;
      const [result, sp, lv] = await Promise.all([
        getJobById(params.id as string),
        getConfigItems('specialties' as ConfigCategory),
        getConfigItems('levels' as ConfigCategory),
      ]);
      setJob(result);
      setSpecialties(sp.filter(i => i.isActive));
      setLevels(lv.filter(i => i.isActive));
      // @ts-expect-error internalNotes is dynamic field not in Job type
      if (result?.internalNotes) {
        // @ts-expect-error internalNotes is dynamic field
        setNotes(result.internalNotes as Array<{ author: string; content: string; date: string }>);
      }
      // Count applications
      if (result) {
        try {
          const appSnap = await getDocs(query(collection(db, 'applications'), where('jobId', '==', result.id)));
          setApplicationCount(appSnap.size);
        } catch { setApplicationCount(0); }
      }
      setLoading(false);
    };
    fetchJob().catch(() => setLoading(false));
  }, [params.id]);

  const startEditing = () => {
    if (!job) return;
    setEditTitle(job.title);
    setEditDescription(job.description);
    setEditTotalFee(job.totalFee ? job.totalFee.toLocaleString('vi-VN').replace(/,/g, '.') : '');
    setEditDuration(String(job.duration || ''));
    setEditCategory(job.category);
    setEditLevel(job.level);
    setEditProjectScale(job.projectScale || '');
    setEditProjectImages(job.projectImages || []);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!job || !userProfile) return;
    setActionLoading(true);
    try {
      await updateJob(job.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        totalFee: parseCurrencyInput(editTotalFee),
        duration: Number(editDuration),
        category: editCategory as never,
        level: editLevel as never,
        projectScale: editProjectScale.trim() || undefined,
        projectImages: editProjectImages.length > 0 ? editProjectImages : undefined,
      } as Partial<Job>, {
        uid: userProfile.uid,
        name: userProfile.displayName,
        role: userProfile.role,
      });
      cache.invalidate('admin:jobs:list');
      const updated = await getJobById(job.id);
      setJob(updated);
      setEditing(false);
      alert('✅ Đã cập nhật thông tin job!');
    } catch (err) {
      console.error('Save failed:', err);
      alert('❌ Không thể lưu. Vui lòng thử lại.');
    }
    setActionLoading(false);
  };

  const handleApprove = async () => {
    if (!job || !userProfile) return;
    if (!confirm('Bạn xác nhận duyệt job này? Job sẽ chuyển sang trạng thái "Đang mở" và hiển thị cho freelancer.')) return;
    setActionLoading(true);
    try {
      await updateJob(job.id, {
        status: 'open',
        approvedBy: userProfile.uid,
      }, {
        uid: userProfile.uid,
        name: userProfile.displayName,
        role: userProfile.role,
      });
      cache.invalidate('admin:jobs:list');
      const updated = await getJobById(job.id);
      setJob(updated);
      alert('✅ Job đã được duyệt thành công!');
    } catch (err) {
      console.error('Approve failed:', err);
      alert('❌ Không thể duyệt job. Vui lòng thử lại.');
    }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!job || !userProfile) return;
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối.');
      return;
    }
    setActionLoading(true);
    try {
      await updateJob(job.id, {
        status: 'cancelled',
      }, {
        uid: userProfile.uid,
        name: userProfile.displayName,
        role: userProfile.role,
      });
      cache.invalidate('admin:jobs:list');
      alert('Job đã bị từ chối.');
      router.push('/admin/jobs');
    } catch (err) {
      console.error('Reject failed:', err);
      alert('❌ Không thể từ chối job. Vui lòng thử lại.');
    }
    setActionLoading(false);
  };

  const handleLockJob = async () => {
    if (!job || !userProfile) return;
    if (applicationCount > 0) {
      alert('⚠️ Không thể khóa job đã có người ứng tuyển.');
      return;
    }
    if (!confirm('Bạn muốn KHÓA job này? Job sẽ chuyển về nháp và không hiển thị cho freelancer.')) return;
    setActionLoading(true);
    try {
      await updateJob(job.id, { status: 'draft' }, {
        uid: userProfile.uid,
        name: userProfile.displayName,
        role: userProfile.role,
      });
      cache.invalidate('admin:jobs:list');
      const updated = await getJobById(job.id);
      setJob(updated);
      alert('✅ Job đã được khóa (chuyển về Nháp).');
    } catch (err) {
      console.error(err);
      alert('❌ Lỗi. Vui lòng thử lại.');
    }
    setActionLoading(false);
  };

  const handleRevokeApproval = async () => {
    if (!job || !userProfile) return;
    if (applicationCount > 0) {
      alert('⚠️ Không thể thu hồi duyệt — job đã có người ứng tuyển.');
      return;
    }
    if (!confirm('Thu hồi trạng thái duyệt? Job sẽ chuyển về "Chờ duyệt" để Job Master có thể chỉnh sửa.')) return;
    setActionLoading(true);
    try {
      await updateJob(job.id, { status: 'pending_approval', approvedBy: undefined } as Partial<Job>, {
        uid: userProfile.uid,
        name: userProfile.displayName,
        role: userProfile.role,
      });
      cache.invalidate('admin:jobs:list');
      const updated = await getJobById(job.id);
      setJob(updated);
      alert('✅ Đã thu hồi duyệt. Job Master có thể chỉnh sửa.');
    } catch (err) {
      console.error(err);
      alert('❌ Lỗi. Vui lòng thử lại.');
    }
    setActionLoading(false);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    setNotes(prev => [...prev, { author: userProfile?.displayName || 'Admin', content: newNote, date: new Date().toLocaleDateString('vi-VN') }]);
    setNewNote('');
  };

  const addProjectImage = () => {
    if (newImageUrl.trim()) {
      setEditProjectImages(prev => [...prev, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const removeProjectImage = (idx: number) => {
    setEditProjectImages(prev => prev.filter((_, i) => i !== idx));
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

  const canEdit = ['draft', 'pending_approval'].includes(job.status) && applicationCount === 0;
  const canLock = job.status === 'open' && applicationCount === 0;
  const canRevoke = job.status === 'open' && applicationCount === 0;

  return (
    <div className={styles.page}>
      <Link href="/admin/jobs" className={styles.backLink}>
        <ArrowLeft size={16} /> Quay lại danh sách
      </Link>

      <div className={styles.pageHeader}>
        <div>
          <div className={styles.titleRow}>
            {editing ? (
              <input type="text" className={styles.editTitleInput} value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Tên dự án..." />
            ) : (
              <h1 className={styles.pageTitle}>{job.title}</h1>
            )}
            <StatusBadge status={job.status} label={STATUS_LABELS[job.status] || job.status} />
            {applicationCount > 0 && <Badge variant="info">{applicationCount} ứng viên</Badge>}
          </div>
          <div className={styles.metaRow}>
            <span><Badge variant="default">{job.category}</Badge></span>
            <span><LevelBadge level={job.level} /></span>
            <span className={styles.metaItem}><Clock size={14} /> {job.duration || '-'} ngày</span>
            <span className={styles.metaItem}><DollarSign size={14} /> {formatCurrency(job.totalFee || 0)}</span>
            <span className={styles.metaItem}><User size={14} /> JM: {job.jobMasterName || '-'}</span>
          </div>
        </div>

        <div className={styles.actionButtons}>
          {/* Approve/Reject for pending jobs */}
          {job.status === 'pending_approval' && !editing && (
            <>
              <Button variant="success" size="md" icon={<CheckCircle size={16} />} onClick={handleApprove} disabled={actionLoading}>
                {actionLoading ? 'Đang xử lý...' : 'Duyệt Job'}
              </Button>
              <Button variant="danger" size="md" icon={<XCircle size={16} />} onClick={() => setShowRejectForm(!showRejectForm)} disabled={actionLoading}>
                Từ chối
              </Button>
            </>
          )}

          {/* Lock/Unpublish for open jobs */}
          {canLock && !editing && (
            <Button variant="outline" size="md" icon={<Lock size={16} />} onClick={handleLockJob} disabled={actionLoading}>
              Khóa Job
            </Button>
          )}

          {/* Revoke for open jobs */}
          {canRevoke && !editing && (
            <Button variant="outline" size="md" icon={<RotateCcw size={16} />} onClick={handleRevokeApproval} disabled={actionLoading}>
              Thu hồi duyệt
            </Button>
          )}

          {/* Edit button */}
          {canEdit && !editing && (
            <Button variant="primary" size="md" icon={<Edit3 size={16} />} onClick={startEditing}>
              Chỉnh sửa
            </Button>
          )}

          {/* Save/Cancel for edit mode */}
          {editing && (
            <>
              <Button variant="primary" size="md" icon={<Save size={16} />} onClick={handleSaveEdit} disabled={actionLoading}>
                {actionLoading ? 'Đang lưu...' : 'Lưu'}
              </Button>
              <Button variant="ghost" size="md" icon={<X size={16} />} onClick={() => setEditing(false)}>
                Hủy
              </Button>
            </>
          )}
        </div>
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
            <Button variant="danger" size="sm" icon={<Send size={14} />} onClick={handleReject} disabled={actionLoading}>
              {actionLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowRejectForm(false)}>Hủy</Button>
          </div>
        </Card>
      )}

      <div className={styles.contentGrid}>
        <div className={styles.mainCol}>
          <Card variant="bordered">
            <h3 className={styles.sectionTitle}><FileText size={18} /> Mô tả công việc</h3>
            {editing ? (
              <textarea className={styles.textarea} value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={8} placeholder="Mô tả chi tiết công việc..." />
            ) : (
              <p className={styles.description}>{job.description}</p>
            )}
          </Card>

          {/* Project Scale */}
          {(editing || job.projectScale) && (
            <Card variant="bordered">
              <h3 className={styles.sectionTitle}>📐 Quy mô dự án</h3>
              {editing ? (
                <textarea className={styles.textarea} value={editProjectScale} onChange={e => setEditProjectScale(e.target.value)} rows={3} placeholder="VD: 8 tầng, 3000m² sàn, khoảng 50 căn hộ..." />
              ) : (
                <p className={styles.description}>{job.projectScale}</p>
              )}
            </Card>
          )}

          {/* Project Images */}
          {(editing || (job.projectImages && job.projectImages.length > 0)) && (
            <Card variant="bordered">
              <h3 className={styles.sectionTitle}><ImageIcon size={18} /> Hình ảnh công trình</h3>
              {editing ? (
                <>
                  <div className={styles.imageGallery}>
                    {editProjectImages.map((url, i) => (
                      <div key={i} className={styles.galleryItem}>
                        <img src={url} alt={`Project ${i + 1}`} className={styles.galleryImg} />
                        <button className={styles.removeImgBtn} onClick={() => removeProjectImage(i)}><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                  <div className={styles.addImageRow}>
                    <input type="url" className={styles.input} value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} placeholder="Nhập URL hình ảnh..." />
                    <Button variant="outline" size="sm" onClick={addProjectImage} disabled={!newImageUrl.trim()}>Thêm ảnh</Button>
                  </div>
                </>
              ) : (
                <div className={styles.imageGallery}>
                  {(job.projectImages || []).map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className={styles.galleryItem}>
                      <img src={url} alt={`Project ${i + 1}`} className={styles.galleryImg} />
                    </a>
                  ))}
                </div>
              )}
            </Card>
          )}

          <Card variant="bordered">
            <h3 className={styles.sectionTitle}>Yêu cầu năng lực</h3>
            {editing ? (
              <div className={styles.editFormGrid}>
                <div className={styles.editField}>
                  <label>Lĩnh vực</label>
                  <select className={styles.input} value={editCategory} onChange={e => setEditCategory(e.target.value)}>
                    {specialties.map(s => <option key={s.id} value={s.label}>{s.label}</option>)}
                  </select>
                </div>
                <div className={styles.editField}>
                  <label>Cấp độ</label>
                  <select className={styles.input} value={editLevel} onChange={e => setEditLevel(e.target.value)}>
                    {levels.map(l => <option key={l.id} value={l.label}>{l.label}</option>)}
                  </select>
                </div>
                <div className={styles.editField}>
                  <label>Ngân sách (VND)</label>
                  <input type="text" className={styles.input} value={editTotalFee} onChange={e => setEditTotalFee(formatCurrencyInput(e.target.value))} placeholder="120.000.000" />
                </div>
                <div className={styles.editField}>
                  <label>Thời gian (ngày)</label>
                  <input type="number" className={styles.input} value={editDuration} onChange={e => setEditDuration(e.target.value)} />
                </div>
              </div>
            ) : (
              <div className={styles.reqGrid}>
                {requirements.experience && <div className={styles.reqItem}><strong>Kinh nghiệm:</strong> {requirements.experience}</div>}
                {requirements.certifications && <div className={styles.reqItem}><strong>Chứng chỉ:</strong> {requirements.certifications}</div>}
                {requirements.software && <div className={styles.reqItem}><strong>Phần mềm:</strong> {requirements.software.join(', ')}</div>}
                {requirements.standards && <div className={styles.reqItem}><strong>Tiêu chuẩn:</strong> {requirements.standards.join(', ')}</div>}
              </div>
            )}
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
              {job.projectScale && <div className={styles.infoRow}><span>Quy mô:</span><strong>{job.projectScale}</strong></div>}
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
