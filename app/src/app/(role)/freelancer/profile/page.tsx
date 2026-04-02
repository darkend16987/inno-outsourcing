'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Award, Calendar, Edit3, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Card, Badge, LevelBadge, Avatar, Button } from '@/components/ui';
import { useAuth } from '@/lib/firebase/auth-context';
import { getUserBadges } from '@/lib/firebase/firestore';
import type { UserBadge } from '@/types';
import styles from './page.module.css';

export default function ProfilePage() {
  const { userProfile, loading } = useAuth();
  const [badges, setBadges] = useState<UserBadge[]>([]);

  useEffect(() => {
    if (userProfile?.uid) {
      getUserBadges(userProfile.uid).then(setBadges).catch(() => {});
    }
  }, [userProfile?.uid]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}>
          <Loader2 size={32} className={styles.spinner} />
          <span>Đang tải hồ sơ...</span>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>Không tìm thấy thông tin hồ sơ. Vui lòng đăng nhập lại.</div>
      </div>
    );
  }

  const p = userProfile;
  const stats = p.stats || { completedJobs: 0, avgRating: 0, onTimeRate: 100 };
  const joinDate = p.createdAt
    ? (typeof p.createdAt === 'object' && 'toDate' in p.createdAt
      ? (p.createdAt as { toDate: () => Date }).toDate().toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })
      : '')
    : '';
  const certs = p.certificates || [];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Hồ sơ năng lực</h1>
          <p className={styles.subtitle}>Quản lý thông tin cá nhân và chi tiết năng lực chuyên môn.</p>
        </div>
        <Link href="/freelancer/profile/edit">
          <Button>
            <Edit3 size={16} /> Chỉnh sửa hồ sơ
          </Button>
        </Link>
      </div>

      <div className={styles.grid}>
        {/* Left Column: ID Card */}
        <div className={styles.leftCol}>
          <Card className={styles.profileCard}>
            <div className={styles.pHeader}>
              <Avatar name={p.displayName || 'User'} level={(p.currentLevel || 'L1') as never} size="lg" />
              <div className={styles.pNameWrap}>
                <h2 className={styles.pName}>{p.displayName || 'Chưa cập nhật'}</h2>
                <div className={styles.pRole}>{p.role === 'freelancer' ? 'Freelancer' : p.role}</div>
              </div>
            </div>

            <div className={styles.pTags}>
              <LevelBadge level={(p.currentLevel || 'L1') as never} />
              {p.kycCompleted && <Badge variant="success" size="sm">Đã xác minh KYC</Badge>}
            </div>

            <div className={styles.pContact}>
              {p.email && <div className={styles.cItem}><Mail size={16} /> <span className={styles.cText}>{p.email}</span></div>}
              {p.phone && <div className={styles.cItem}><Phone size={16} /> <span className={styles.cText}>{p.phone}</span></div>}
              {p.address && <div className={styles.cItem}><MapPin size={16} /> <span className={styles.cText}>{p.address}</span></div>}
              {joinDate && <div className={styles.cItem}><Calendar size={16} /> <span className={styles.cText}>Tham gia: {joinDate}</span></div>}
            </div>
          </Card>

          <Card className={styles.statsCard}>
            <div className={styles.statBox}>
              <div className={styles.sVal}>{stats.completedJobs ?? 0}</div>
              <div className={styles.sLabel}>Dự án<br/>hoàn thành</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.sVal}>{stats.avgRating?.toFixed(1) ?? '0.0'}</div>
              <div className={styles.sLabel}>Điểm<br/>đánh giá</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.sVal}>{stats.onTimeRate ?? 100}%</div>
              <div className={styles.sLabel}>Tỷ lệ<br/>đúng hạn</div>
            </div>
          </Card>
        </div>

        {/* Right Column: Details */}
        <div className={styles.rightCol}>
          <Card className={styles.detailCard}>
            <h3 className={styles.sectionTitle}>Giới thiệu bản thân</h3>
            <p className={styles.bio}>{p.bio || 'Chưa cập nhật giới thiệu. Nhấn "Chỉnh sửa hồ sơ" để thêm.'}</p>
          </Card>

          <Card className={styles.detailCard}>
            <h3 className={styles.sectionTitle}>Học vấn & Kinh nghiệm</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Năm kinh nghiệm</span>
                <span className={styles.infoValue}>{p.yearsOfExperience ? `${p.yearsOfExperience} năm` : 'Chưa cập nhật'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Chuyên ngành</span>
                <span className={styles.infoValue}>{p.educationMajor || 'Chưa cập nhật'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Trường đào tạo</span>
                <span className={styles.infoValue}>{p.educationSchool || 'Chưa cập nhật'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Năm học</span>
                <span className={styles.infoValue}>{p.educationYear || '-'}</span>
              </div>
            </div>
          </Card>

          <Card className={styles.detailCard}>
            <h3 className={styles.sectionTitle}>Chuyên môn & Kỹ năng</h3>
            <div className={styles.skillSect}>
              <h4>Lĩnh vực</h4>
              <div className={styles.tagsGroup}>
                {(p.specialties || []).length > 0
                  ? p.specialties.map(s => <Badge key={s}>{s}</Badge>)
                  : <span className={styles.noData}>Chưa chọn lĩnh vực nào</span>
                }
              </div>
            </div>
            <div className={styles.skillSect}>
              <h4>Phần mềm thành thạo</h4>
              <div className={styles.tagsGroup}>
                {(p.software || []).length > 0
                  ? p.software.map(s => <Badge key={s} variant="outline">{s}</Badge>)
                  : <span className={styles.noData}>Chưa chọn phần mềm nào</span>
                }
              </div>
            </div>
          </Card>

          {/* Certificates */}
          {certs.length > 0 && (
            <Card className={styles.detailCard}>
              <h3 className={styles.sectionTitle}>Chứng chỉ nghề nghiệp</h3>
              <div className={styles.certList}>
                {certs.map((c, i) => (
                  <div key={i} className={styles.certItem}>
                    <div className={styles.certName}>{c.name}</div>
                    <div className={styles.certMeta}>
                      {c.issuedBy && <span>Cấp bởi: {c.issuedBy}</span>}
                      {c.issuedDate && <span>Ngày: {c.issuedDate}</span>}
                      {c.expiryDate && <span>Hết hạn: {c.expiryDate}</span>}
                    </div>
                    {c.imageUrl && (
                      <a href={c.imageUrl} target="_blank" rel="noopener noreferrer" className={styles.certLink}>Xem ảnh chứng chỉ →</a>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Banking */}
          {(p.bankName || p.bankAccountNumber || p.taxId) && (
            <Card className={styles.detailCard}>
              <h3 className={styles.sectionTitle}>Thông tin ngân hàng</h3>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Ngân hàng</span>
                  <span className={styles.infoValue}>{p.bankName || '-'}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>STK</span>
                  <span className={styles.infoValue}>{p.bankAccountNumber ? `****${p.bankAccountNumber.slice(-4)}` : '-'}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Chi nhánh</span>
                  <span className={styles.infoValue}>{p.bankBranch || '-'}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>MST</span>
                  <span className={styles.infoValue}>{p.taxId || '-'}</span>
                </div>
              </div>
            </Card>
          )}

          {/* KYC Status */}
          <Card className={styles.detailCard}>
            <h3 className={styles.sectionTitle}>Xác minh danh tính (CCCD)</h3>
            {p.idNumber ? (
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Số CCCD</span>
                  <span className={styles.infoValue}>{`****${p.idNumber.slice(-4)}`}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Ngày cấp</span>
                  <span className={styles.infoValue}>{p.idIssuedDate || '-'}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Nơi cấp</span>
                  <span className={styles.infoValue}>{p.idIssuedPlace || '-'}</span>
                </div>
              </div>
            ) : (
              <p className={styles.noData}>Chưa cập nhật CCCD. Nhấn &quot;Chỉnh sửa hồ sơ&quot; để thêm.</p>
            )}
          </Card>

          <Card className={styles.detailCard}>
            <h3 className={styles.sectionTitle}>Huy hiệu đã đạt</h3>
            <div className={styles.badgesWrap}>
              {badges.length > 0 ? badges.map(b => (
                <div key={b.id} className={styles.honorBadge}>
                  <Award size={24} className={styles.hbIcon} />
                  <div className={styles.hbName}>{b.badgeType}</div>
                </div>
              )) : (
                <span className={styles.noData}>Chưa đạt huy hiệu nào. Hoàn thành dự án để nhận!</span>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
