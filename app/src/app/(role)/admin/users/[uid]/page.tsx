'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Save, UserCheck, UserX, Shield, Mail, Phone,
  Briefcase, Star, Award, Calendar, MapPin, CreditCard,
  Loader2, AlertTriangle, Edit3, GraduationCap
} from 'lucide-react';
import { Button, Card, Badge, Avatar, LevelBadge } from '@/components/ui';
import { getUserProfile, updateUserProfile } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/firebase/auth-context';
import { getConfigItems, type SystemConfigItem, type ConfigCategory } from '@/lib/firebase/system-config';
import { cache } from '@/lib/cache/swr-cache';
import type { UserProfile, UserRole } from '@/types';
import styles from './page.module.css';

const ROLE_LABELS: Record<string, string> = {
  freelancer: 'Freelancer',
  job_master: 'JobMaster',
  jobmaster: 'JobMaster',
  admin: 'Admin',
  accountant: 'Kế toán',
  super_admin: 'Super Admin',
};

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'jobmaster', label: 'JobMaster' },
  { value: 'admin', label: 'Admin' },
  { value: 'accountant', label: 'Kế toán' },
];

const formatDate = (d: unknown): string => {
  if (!d) return '-';
  if (typeof d === 'object' && d !== null && 'toDate' in d) return (d as { toDate: () => Date }).toDate().toLocaleDateString('vi-VN');
  if (d instanceof Date) return d.toLocaleDateString('vi-VN');
  return String(d);
};

const formatCurrency = (amount: number) => {
  if (!amount) return '0₫';
  return `${amount.toLocaleString('vi-VN')}₫`;
};

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { userProfile: currentAdmin } = useAuth();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  // Editable fields
  const [editRole, setEditRole] = useState<UserRole>('freelancer');
  const [editLevel, setEditLevel] = useState('L1');
  const [editSpecialties, setEditSpecialties] = useState<string[]>([]);
  const [editBio, setEditBio] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // System config
  const [specialties, setSpecialties] = useState<SystemConfigItem[]>([]);
  const [levels, setLevels] = useState<SystemConfigItem[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!params.uid) return;
      try {
        const [profile, sp, lv] = await Promise.all([
          getUserProfile(params.uid as string),
          getConfigItems('specialties' as ConfigCategory),
          getConfigItems('levels' as ConfigCategory),
        ]);
        setUser(profile);
        setSpecialties(sp.filter(i => i.isActive));
        setLevels(lv.filter(i => i.isActive));
        if (profile) {
          setEditRole(profile.role);
          setEditLevel(profile.currentLevel || 'L1');
          setEditSpecialties(profile.specialties || []);
          setEditBio(profile.bio || '');
          setEditPhone(profile.phone || '');
        }
      } catch (err) {
        console.error('Failed to load user:', err);
      }
      setLoading(false);
    };
    loadData();
  }, [params.uid]);

  const handleSave = async () => {
    if (!user || !currentAdmin) return;
    setSaving(true);
    try {
      await updateUserProfile(user.uid, {
        role: editRole,
        currentLevel: editLevel as never,
        specialties: editSpecialties,
        bio: editBio,
        phone: editPhone,
      });
      cache.invalidate('admin:users');
      // Reload
      const updated = await getUserProfile(user.uid);
      setUser(updated);
      setEditing(false);
      alert('✅ Cập nhật thành công!');
    } catch (err) {
      console.error('Save failed:', err);
      alert('❌ Lỗi khi cập nhật. Vui lòng thử lại.');
    }
    setSaving(false);
  };

  const handleToggleStatus = async () => {
    if (!user || !currentAdmin) return;
    const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
    const action = newStatus === 'suspended' ? 'KHÓA' : 'MỞ KHÓA';
    if (!confirm(`Bạn có chắc muốn ${action} tài khoản "${user.displayName}"?`)) return;
    setSaving(true);
    try {
      await updateUserProfile(user.uid, { status: newStatus });
      cache.invalidate('admin:users');
      const updated = await getUserProfile(user.uid);
      setUser(updated);
      alert(`✅ Đã ${action.toLowerCase()} tài khoản.`);
    } catch (err) {
      console.error('Toggle status failed:', err);
      alert('❌ Lỗi. Vui lòng thử lại.');
    }
    setSaving(false);
  };

  const toggleSpecialty = (label: string) => {
    setEditSpecialties(prev =>
      prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label]
    );
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}><Loader2 size={24} className={styles.spin} /> Đang tải thông tin...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.page}>
        <Link href="/admin/users" className={styles.backLink}><ArrowLeft size={16} /> Quay lại</Link>
        <div className={styles.loadingWrap}>
          <AlertTriangle size={24} />
          <span>Không tìm thấy người dùng này.</span>
        </div>
      </div>
    );
  }

  const stats = user.stats || { completedJobs: 0, totalEarnings: 0, avgRating: 0, ratingCount: 0, onTimeRate: 0, currentMonthEarnings: 0 };

  return (
    <div className={styles.page}>
      <Link href="/admin/users" className={styles.backLink}>
        <ArrowLeft size={16} /> Quay lại danh sách
      </Link>

      {/* Header */}
      <div className={styles.profileHeader}>
        <div className={styles.profileTop}>
          <Avatar name={user.displayName || 'User'} src={user.photoURL} level={(user.currentLevel || 'L1') as never} size="lg" />
          <div className={styles.profileInfo}>
            <div className={styles.nameRow}>
              <h1 className={styles.userName}>{user.displayName || 'Chưa cập nhật'}</h1>
              {user.status === 'suspended'
                ? <Badge variant="error">Đã khóa</Badge>
                : <Badge variant="success">Hoạt động</Badge>
              }
            </div>
            <div className={styles.metaRow}>
              <span><Mail size={14} /> {user.email || '-'}</span>
              <span><Phone size={14} /> {user.phone || '-'}</span>
              <span><Shield size={14} /> {ROLE_LABELS[user.role] || user.role}</span>
              <span><Calendar size={14} /> Tham gia: {formatDate(user.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          {!editing ? (
            <>
              <Button variant="outline" icon={<Edit3 size={16} />} onClick={() => setEditing(true)}>Chỉnh sửa</Button>
              <Button
                variant={user.status === 'suspended' ? 'success' : 'danger'}
                icon={user.status === 'suspended' ? <UserCheck size={16} /> : <UserX size={16} />}
                onClick={handleToggleStatus}
                disabled={saving}
              >
                {user.status === 'suspended' ? 'Mở khóa' : 'Khóa tài khoản'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="primary" icon={<Save size={16} />} onClick={handleSave} disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
              <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>Hủy</Button>
            </>
          )}
        </div>
      </div>

      <div className={styles.contentGrid}>
        {/* Stats Cards */}
        <div className={styles.statsRow}>
          <Card className={styles.statCard}>
            <div className={styles.statIcon}><Briefcase size={20} /></div>
            <div className={styles.statValue}>{stats.completedJobs}</div>
            <div className={styles.statLabel}>Job hoàn thành</div>
          </Card>
          <Card className={styles.statCard}>
            <div className={styles.statIcon}><CreditCard size={20} /></div>
            <div className={styles.statValue}>{formatCurrency(stats.totalEarnings)}</div>
            <div className={styles.statLabel}>Tổng thu nhập</div>
          </Card>
          <Card className={styles.statCard}>
            <div className={styles.statIcon}><Star size={20} /></div>
            <div className={styles.statValue}>{stats.avgRating ? stats.avgRating.toFixed(1) : '-'} ⭐</div>
            <div className={styles.statLabel}>Đánh giá TB ({stats.ratingCount} lượt)</div>
          </Card>
          <Card className={styles.statCard}>
            <div className={styles.statIcon}><Award size={20} /></div>
            <div className={styles.statValue}>{stats.onTimeRate ? `${(stats.onTimeRate * 100).toFixed(0)}%` : '-'}</div>
            <div className={styles.statLabel}>Tỷ lệ đúng hạn</div>
          </Card>
        </div>

        <div className={styles.twoCol}>
          {/* Left: Profile Info */}
          <Card className={styles.infoCard}>
            <h3 className={styles.sectionTitle}>Thông tin cá nhân</h3>

            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label>Vai trò</label>
                {editing ? (
                  <select className={styles.input} value={editRole} onChange={e => setEditRole(e.target.value as UserRole)}>
                    {ROLE_OPTIONS.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                ) : (
                  <Badge variant="outline">{ROLE_LABELS[user.role] || user.role}</Badge>
                )}
              </div>

              <div className={styles.field}>
                <label>Cấp bậc</label>
                {editing ? (
                  <select className={styles.input} value={editLevel} onChange={e => setEditLevel(e.target.value)}>
                    {levels.map(l => (
                      <option key={l.id} value={l.label}>{l.label} {l.description ? `- ${l.description}` : ''}</option>
                    ))}
                  </select>
                ) : (
                  <LevelBadge level={user.currentLevel || 'L1'} />
                )}
              </div>

              <div className={styles.field}>
                <label>Số điện thoại</label>
                {editing ? (
                  <input className={styles.input} value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="SĐT..." />
                ) : (
                  <span>{user.phone || '-'}</span>
                )}
              </div>

              <div className={styles.field}>
                <label>Kinh nghiệm</label>
                <span>{user.yearsOfExperience ? `${user.yearsOfExperience} năm` : '-'}</span>
              </div>
            </div>

            <div className={styles.field} style={{ marginTop: '16px' }}>
              <label>Chuyên ngành</label>
              {editing ? (
                <div className={styles.tagsArea}>
                  {specialties.map(s => (
                    <Badge
                      key={s.id}
                      variant={editSpecialties.includes(s.label) ? 'primary' : 'default'}
                      onClick={() => toggleSpecialty(s.label)}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                    >
                      {s.label}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className={styles.tagsArea}>
                  {(user.specialties || []).map((s, i) => (
                    <Badge key={i} variant="default">{s}</Badge>
                  ))}
                  {(!user.specialties || user.specialties.length === 0) && <span style={{ opacity: 0.5 }}>Chưa chọn</span>}
                </div>
              )}
            </div>

            <div className={styles.field} style={{ marginTop: '16px' }}>
              <label>Phần mềm thành thạo</label>
              <div className={styles.tagsArea}>
                {(user.software || []).map((s, i) => (
                  <Badge key={i} variant="outline">{s}</Badge>
                ))}
                {(!user.software || user.software.length === 0) && <span style={{ opacity: 0.5 }}>Chưa chọn</span>}
              </div>
            </div>

            <div className={styles.field} style={{ marginTop: '16px' }}>
              <label>Giới thiệu</label>
              {editing ? (
                <textarea className={styles.textarea} value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Giới thiệu bản thân..." rows={3} />
              ) : (
                <p className={styles.bioText}>{user.bio || 'Chưa có thông tin giới thiệu.'}</p>
              )}
            </div>
          </Card>

          {/* Education Card */}
          <Card className={styles.infoCard}>
            <h3 className={styles.sectionTitle}><GraduationCap size={18} /> Học vấn</h3>
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label>Trường đào tạo</label>
                <span>{user.educationSchool || '-'}</span>
              </div>
              <div className={styles.field}>
                <label>Chuyên ngành</label>
                <span>{user.educationMajor || '-'}</span>
              </div>
              <div className={styles.field}>
                <label>Năm học</label>
                <span>{user.educationYear || '-'}</span>
              </div>
              <div className={styles.field}>
                <label>Số năm kinh nghiệm</label>
                <span>{user.yearsOfExperience ? `${user.yearsOfExperience} năm` : '-'}</span>
              </div>
            </div>
          </Card>

          {/* Right: KYC & Banking */}
          <div className={styles.rightCol}>
            <Card className={styles.infoCard}>
              <h3 className={styles.sectionTitle}>Thông tin KYC</h3>
              <div className={styles.kycStatus}>
                {user.kycCompleted
                  ? <Badge variant="success">✅ Đã xác thực</Badge>
                  : <Badge variant="warning">⏳ Chưa xác thực</Badge>
                }
              </div>
              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <label>CMND/CCCD</label>
                  <span>{user.idNumber || '-'}</span>
                </div>
                <div className={styles.field}>
                  <label>Ngày cấp</label>
                  <span>{user.idIssuedDate || '-'}</span>
                </div>
                <div className={styles.field}>
                  <label>Nơi cấp</label>
                  <span>{user.idIssuedPlace || '-'}</span>
                </div>
                <div className={styles.field}>
                  <label>Mã số thuế</label>
                  <span>{user.taxId || '-'}</span>
                </div>
              </div>
              <div className={styles.field} style={{ marginTop: '12px' }}>
                <label><MapPin size={14} /> Địa chỉ</label>
                <span>{user.address || '-'}</span>
              </div>
            </Card>

            <Card className={styles.infoCard}>
              <h3 className={styles.sectionTitle}><CreditCard size={18} /> Thông tin ngân hàng</h3>
              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <label>Số tài khoản</label>
                  <span>{user.bankAccountNumber || '-'}</span>
                </div>
                <div className={styles.field}>
                  <label>Ngân hàng</label>
                  <span>{user.bankName || '-'}</span>
                </div>
                <div className={styles.field}>
                  <label>Chi nhánh</label>
                  <span>{user.bankBranch || '-'}</span>
                </div>
              </div>
            </Card>

            {/* Certificates */}
            {(user.certificates && user.certificates.length > 0) && (
              <Card className={styles.infoCard}>
                <h3 className={styles.sectionTitle}><Award size={18} /> Chứng chỉ nghề nghiệp ({user.certificates.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {user.certificates.map((cert, i) => (
                    <div key={i} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--color-border, #e2e8f0)', background: 'var(--color-bg, #fff)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-charcoal, #1a1a2e)' }}>{cert.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted, #666)', marginTop: 4 }}>
                        {cert.issuedBy && <span>Cấp bởi: {cert.issuedBy} | </span>}
                        {cert.issuedDate && <span>Ngày: {cert.issuedDate} | </span>}
                        {cert.expiryDate && <span>Hết hạn: {cert.expiryDate}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
