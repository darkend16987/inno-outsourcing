'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Briefcase, Star, Award, Calendar,
  Loader2, AlertTriangle, GraduationCap, RefreshCw,
  Clock, CheckCircle, X,
} from 'lucide-react';
import { Card, Badge, Avatar, LevelBadge, Button } from '@/components/ui';
import { TrustBadge } from '@/components/ui/TrustBadge';
import { AvailabilityBadge } from '@/components/ui/AvailabilityBadge';
import { ActiveJobWarning } from '@/components/ui/ActiveJobWarning';
import { SaveButton } from '@/components/ui/SaveButton';
import { useAuth } from '@/lib/firebase/auth-context';
import { getUserProfile, getJobs } from '@/lib/firebase/firestore';
import {
  getCollaborationHistory,
  getActiveJobCount,
  toggleSavedFreelancer,
  getSavedFreelancers,
  rehireFreelancer,
} from '@/lib/firebase/firestore-extended';
import { calculateTrustScore } from '@/lib/matching/trust-score';
import type { UserProfile, Job } from '@/types';
import styles from './page.module.css';

const formatCurrency = (amount: number) => {
  if (!amount) return '0₫';
  return `${amount.toLocaleString('vi-VN')}₫`;
};

export default function FreelancerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { userProfile: jm } = useAuth();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [collabCount, setCollabCount] = useState(0);
  const [activeJobCount, setActiveJobCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [showRehireModal, setShowRehireModal] = useState(false);
  const [openJobs, setOpenJobs] = useState<Job[]>([]);
  const [rehiring, setRehiring] = useState<string | null>(null);

  const uid = params.uid as string;

  useEffect(() => {
    const load = async () => {
      if (!uid || !jm) return;
      try {
        const [profile, collab, activeCount, savedList] = await Promise.all([
          getUserProfile(uid),
          getCollaborationHistory(jm.uid, uid),
          getActiveJobCount(uid),
          getSavedFreelancers(jm.uid),
        ]);
        setUser(profile);
        setCollabCount(collab);
        setActiveJobCount(activeCount);
        setIsSaved(savedList.includes(uid));
      } catch (err) {
        console.error('Failed to load freelancer profile:', err);
      }
      setLoading(false);
    };
    load();
  }, [uid, jm]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}><Loader2 size={24} className={styles.spin} /> Đang tải...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.page}>
        <Link href="/jobmaster/applications" className={styles.backLink}><ArrowLeft size={16} /> Quay lại</Link>
        <div className={styles.loadingWrap}>
          <AlertTriangle size={24} />
          <span>Không tìm thấy freelancer này.</span>
        </div>
      </div>
    );
  }

  const stats = user.stats || { completedJobs: 0, totalEarnings: 0, avgRating: 0, ratingCount: 0, onTimeRate: 0, currentMonthEarnings: 0 };
  const trustResult = calculateTrustScore(stats);

  return (
    <div className={styles.page}>
      <Link href="/jobmaster/applications" className={styles.backLink}>
        <ArrowLeft size={16} /> Quay lại
      </Link>

      {/* Header */}
      <div className={styles.profileHeader}>
        <div className={styles.profileTop}>
          <Avatar name={user.displayName || 'User'} src={user.photoURL} level={(user.currentLevel || 'L1') as never} size="lg" />
          <div className={styles.profileInfo}>
            <div className={styles.nameRow}>
              <h1 className={styles.userName}>{user.displayName || 'Freelancer'}</h1>
              <LevelBadge level={user.currentLevel || 'L1'} />
            </div>
            {(user.nickname || user.organization) && (
              <div className={styles.metaRow} style={{ marginBottom: 4 }}>
                {user.nickname && <span style={{ fontStyle: 'italic', color: 'var(--color-primary, #6c47ff)' }}>@{user.nickname}</span>}
                {user.organization && <span>🏢 {user.organization}</span>}
              </div>
            )}
            <div className={styles.metaRow}>
              <TrustBadge badge={trustResult.badge} score={trustResult.totalScore} size="sm" showTooltip />
              {user.availability && <AvailabilityBadge status={user.availability} size="sm" showLabel />}
              <span><Calendar size={14} /> {user.yearsOfExperience ? `${user.yearsOfExperience} năm KN` : '-'}</span>
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <SaveButton
            isSaved={isSaved}
            onToggle={async (save) => {
              if (!jm) return;
              await toggleSavedFreelancer(jm.uid, uid, save);
            }}
            size="md"
            label="Lưu Freelancer"
          />
        </div>
      </div>

      {/* Active job warning */}
      <ActiveJobWarning count={activeJobCount} threshold={3} variant="applicant" />

      {/* Collaboration history */}
      {collabCount > 0 && (
        <div className={styles.collabBanner}>
          <CheckCircle size={16} />
          <span>Đã hợp tác <strong>{collabCount} dự án</strong> trước đây</span>
          <Button
            size="sm"
            variant="outline"
            icon={<RefreshCw size={14} />}
            onClick={async () => {
              if (!jm) return;
              const result = await getJobs({ status: 'open' }, 50);
              const myJobs = result.items.filter(j => j.jobMaster === jm.uid);
              setOpenJobs(myJobs);
              setShowRehireModal(true);
            }}
          >
            Thuê lại
          </Button>
        </div>
      )}

      {/* Rehire Modal */}
      {showRehireModal && (
        <div className={styles.modalOverlay} onClick={() => setShowRehireModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Chọn dự án để giao cho {user.displayName}</h3>
              <button className={styles.modalClose} onClick={() => setShowRehireModal(false)}><X size={18} /></button>
            </div>
            {openJobs.length === 0 ? (
              <div className={styles.modalEmpty}>
                <Briefcase size={24} />
                <p>Bạn chưa có dự án nào đang mở. Hãy tạo dự án mới trước.</p>
              </div>
            ) : (
              <div className={styles.modalList}>
                {openJobs.map(job => (
                  <div key={job.id} className={styles.modalJobItem}>
                    <div>
                      <h4>{job.title}</h4>
                      <span className={styles.modalJobMeta}>{job.category} · {job.level}</span>
                    </div>
                    <Button
                      size="sm"
                      disabled={rehiring === job.id}
                      onClick={async () => {
                        if (!user) return;
                        if (!confirm(`Giao "${job.title}" cho ${user.displayName}?`)) return;
                        setRehiring(job.id);
                        try {
                          await rehireFreelancer(job.id, uid, user.displayName || 'Freelancer');
                          alert('✅ Đã giao việc thành công!');
                          setShowRehireModal(false);
                        } catch (err) {
                          console.error('Rehire failed:', err);
                          alert('❌ Không thể giao việc. Vui lòng thử lại.');
                        }
                        setRehiring(null);
                      }}
                    >
                      {rehiring === job.id ? 'Đang xử lý...' : 'Giao việc'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className={styles.statsRow}>
        <Card className={styles.statCard}>
          <div className={styles.statIcon}><Briefcase size={20} /></div>
          <div className={styles.statValue}>{stats.completedJobs}</div>
          <div className={styles.statLabel}>Job hoàn thành</div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statIcon}><Star size={20} /></div>
          <div className={styles.statValue}>{stats.avgRating ? stats.avgRating.toFixed(1) : '-'} ⭐</div>
          <div className={styles.statLabel}>Đánh giá TB ({stats.ratingCount} lượt)</div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statIcon}><Award size={20} /></div>
          <div className={styles.statValue}>{stats.onTimeRate ? `${(stats.onTimeRate * 100).toFixed(0)}%` : '-'}</div>
          <div className={styles.statLabel}>Đúng hạn</div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statIcon}><Clock size={20} /></div>
          <div className={styles.statValue}>{activeJobCount}</div>
          <div className={styles.statLabel}>Job đang thực hiện</div>
        </Card>
      </div>

      <div className={styles.contentGrid}>
        {/* Bio + Specialties */}
        <Card className={styles.infoCard}>
          <h3 className={styles.sectionTitle}>Thông tin chuyên môn</h3>

          <div className={styles.field}>
            <label>Giới thiệu</label>
            <p className={styles.bioText}>{user.bio || 'Chưa có thông tin giới thiệu.'}</p>
          </div>

          <div className={styles.field} style={{ marginTop: '16px' }}>
            <label>Chuyên ngành</label>
            <div className={styles.tagsArea}>
              {(user.specialties || []).map((s, i) => (
                <Badge key={i} variant="default">{s}</Badge>
              ))}
              {(!user.specialties || user.specialties.length === 0) && <span style={{ opacity: 0.5 }}>Chưa chọn</span>}
            </div>
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
        </Card>

        {/* Education */}
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
              <label>Kinh nghiệm</label>
              <span>{user.yearsOfExperience ? `${user.yearsOfExperience} năm` : '-'}</span>
            </div>
          </div>
        </Card>

        {/* Certificates */}
        {(user.certificates && user.certificates.length > 0) && (
          <Card className={styles.infoCard}>
            <h3 className={styles.sectionTitle}><Award size={18} /> Chứng chỉ ({user.certificates.length})</h3>
            <div className={styles.certList}>
              {user.certificates.map((cert, i) => (
                <div key={i} className={styles.certItem}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className={styles.certName}>{cert.name}</div>
                      <div className={styles.certMeta}>
                        {cert.issuedBy && <span>Cấp bởi: {cert.issuedBy}</span>}
                        {cert.issuedDate && <span>Ngày: {cert.issuedDate}</span>}
                        {cert.status === 'verified' && <Badge variant="success" size="sm">Đã xác minh</Badge>}
                      </div>
                    </div>
                  </div>
                  {cert.imageUrl && (
                    <div style={{ marginTop: 8 }}>
                      <a href={cert.imageUrl} target="_blank" rel="noopener noreferrer">
                        <img src={cert.imageUrl} alt={`Ảnh chứng chỉ ${cert.name}`} style={{ maxWidth: 200, maxHeight: 130, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--color-border, #e2e8f0)', cursor: 'pointer' }} />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
