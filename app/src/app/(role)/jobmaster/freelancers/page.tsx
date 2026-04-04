'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users, Briefcase, Heart, Loader2, Inbox, RefreshCw, ArrowUpRight,
  Star, CheckCircle, X,
} from 'lucide-react';
import { Card, Badge, Avatar, Button, LevelBadge } from '@/components/ui';
import { TrustBadge } from '@/components/ui/TrustBadge';
import { AvailabilityBadge } from '@/components/ui/AvailabilityBadge';
import { useAuth } from '@/lib/firebase/auth-context';
import { getUserProfile, getJobs } from '@/lib/firebase/firestore';
import {
  getCollaboratedFreelancers,
  getSavedFreelancers,
  rehireFreelancer,
  type CollaboratedFreelancer,
} from '@/lib/firebase/firestore-extended';
import { calculateTrustScore } from '@/lib/matching/trust-score';
import type { UserProfile, Job } from '@/types';
import styles from './page.module.css';

interface FreelancerCardData {
  uid: string;
  profile: UserProfile | null;
  jobCount?: number;
  lastJobTitle?: string;
}

export default function JobmasterFreelancersPage() {
  const { userProfile: jm } = useAuth();
  const [tab, setTab] = useState<'collaborated' | 'saved'>('collaborated');
  const [collabData, setCollabData] = useState<FreelancerCardData[]>([]);
  const [savedData, setSavedData] = useState<FreelancerCardData[]>([]);
  const [loading, setLoading] = useState(true);

  // Rehire modal state
  const [showRehireModal, setShowRehireModal] = useState(false);
  const [rehireTarget, setRehireTarget] = useState<FreelancerCardData | null>(null);
  const [openJobs, setOpenJobs] = useState<Job[]>([]);
  const [rehiring, setRehiring] = useState<string | null>(null);

  useEffect(() => {
    if (!jm?.uid) return;
    const load = async () => {
      try {
        // Fetch collaborated freelancers
        const collabList = await getCollaboratedFreelancers(jm.uid);
        const collabProfiles = await Promise.all(
          collabList.map(async (c) => {
            const profile = await getUserProfile(c.uid);
            return {
              uid: c.uid,
              profile,
              jobCount: c.jobCount,
              lastJobTitle: c.lastJobTitle,
            };
          })
        );
        setCollabData(collabProfiles);

        // Fetch saved freelancers
        const savedIds = await getSavedFreelancers(jm.uid);
        const savedProfiles = await Promise.all(
          savedIds.map(async (uid) => {
            const profile = await getUserProfile(uid);
            return { uid, profile };
          })
        );
        setSavedData(savedProfiles);
      } catch (err) {
        console.error('Failed to load freelancers:', err);
      }
      setLoading(false);
    };
    load();
  }, [jm?.uid]);

  const openRehire = async (card: FreelancerCardData) => {
    if (!jm) return;
    setRehireTarget(card);
    const result = await getJobs({ status: 'open' }, 50);
    const myJobs = result.items.filter(j => j.jobMaster === jm.uid);
    setOpenJobs(myJobs);
    setShowRehireModal(true);
  };

  const handleRehire = async (job: Job) => {
    if (!rehireTarget?.profile) return;
    if (!confirm(`Giao "${job.title}" cho ${rehireTarget.profile.displayName}?`)) return;
    setRehiring(job.id);
    try {
      await rehireFreelancer(job.id, rehireTarget.uid, rehireTarget.profile.displayName || 'Freelancer');
      alert('✅ Đã giao việc thành công!');
      setShowRehireModal(false);
    } catch (err) {
      console.error('Rehire failed:', err);
      alert('❌ Không thể giao việc. Vui lòng thử lại.');
    }
    setRehiring(null);
  };

  const activeList = tab === 'collaborated' ? collabData : savedData;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}><Users size={24} /> Quản lý Freelancer</h1>
        <p className={styles.subtitle}>Danh sách freelancer đã hợp tác và đã lưu</p>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'collaborated' ? styles.tabActive : ''}`}
          onClick={() => setTab('collaborated')}
        >
          <Briefcase size={16} /> Đã hợp tác ({collabData.length})
        </button>
        <button
          className={`${styles.tab} ${tab === 'saved' ? styles.tabActive : ''}`}
          onClick={() => setTab('saved')}
        >
          <Heart size={16} /> Đã lưu ({savedData.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className={styles.loadingWrap}><Loader2 size={20} className={styles.spin} /> Đang tải...</div>
      ) : activeList.length === 0 ? (
        <div className={styles.emptyState}>
          <Inbox size={48} strokeWidth={1} />
          <p>{tab === 'collaborated' ? 'Chưa có freelancer nào đã hợp tác.' : 'Chưa lưu freelancer nào.'}</p>
          {tab === 'collaborated' && (
            <Link href="/jobmaster/jobs">
              <Button variant="outline">Tạo dự án mới</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {activeList.map(card => {
            const p = card.profile;
            if (!p) return null;
            const stats = p.stats || { completedJobs: 0, totalEarnings: 0, avgRating: 0, ratingCount: 0, onTimeRate: 0, currentMonthEarnings: 0 };
            const trust = calculateTrustScore(stats);

            return (
              <Card key={card.uid} className={styles.flCard}>
                <div className={styles.flTop}>
                  <Avatar name={p.displayName || 'User'} src={p.photoURL} level={(p.currentLevel || 'L1') as never} size="md" />
                  <div className={styles.flInfo}>
                    <div className={styles.flNameRow}>
                      <h3 className={styles.flName}>{p.displayName || 'Freelancer'}</h3>
                      <LevelBadge level={p.currentLevel || 'L1'} />
                    </div>
                    <div className={styles.flBadges}>
                      <TrustBadge badge={trust.badge} score={trust.totalScore} size="sm" showTooltip={false} />
                      {p.availability && <AvailabilityBadge status={p.availability} size="sm" />}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className={styles.flStats}>
                  <div className={styles.flStat}>
                    <Star size={14} />
                    <span>{stats.avgRating ? stats.avgRating.toFixed(1) : '-'}</span>
                  </div>
                  <div className={styles.flStat}>
                    <CheckCircle size={14} />
                    <span>{stats.completedJobs} job</span>
                  </div>
                  {card.jobCount && (
                    <div className={styles.flStat}>
                      <Briefcase size={14} />
                      <span>{card.jobCount} lần hợp tác</span>
                    </div>
                  )}
                </div>

                {card.lastJobTitle && (
                  <div className={styles.flLastJob}>
                    Gần nhất: <strong>{card.lastJobTitle}</strong>
                  </div>
                )}

                {/* Specialties */}
                {p.specialties && p.specialties.length > 0 && (
                  <div className={styles.flSpecialties}>
                    {p.specialties.slice(0, 3).map((s, i) => (
                      <Badge key={i} variant="outline" size="sm">{s}</Badge>
                    ))}
                    {p.specialties.length > 3 && <Badge size="sm">+{p.specialties.length - 3}</Badge>}
                  </div>
                )}

                {/* Actions */}
                <div className={styles.flActions}>
                  <Link href={`/jobmaster/freelancers/${card.uid}`}>
                    <Button variant="ghost" size="sm" icon={<ArrowUpRight size={14} />}>
                      Xem hồ sơ
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<RefreshCw size={14} />}
                    onClick={() => openRehire(card)}
                  >
                    Thuê lại
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Rehire Modal */}
      {showRehireModal && rehireTarget && (
        <div className={styles.modalOverlay} onClick={() => setShowRehireModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Chọn dự án để giao cho {rehireTarget.profile?.displayName}</h3>
              <button className={styles.modalClose} onClick={() => setShowRehireModal(false)}>
                <X size={18} />
              </button>
            </div>
            {openJobs.length === 0 ? (
              <div className={styles.modalEmpty}>
                <Briefcase size={24} />
                <p>Bạn chưa có dự án nào đang mở.</p>
                <Link href="/jobmaster/jobs">
                  <Button variant="outline" size="sm">Tạo dự án mới</Button>
                </Link>
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
                      onClick={() => handleRehire(job)}
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
    </div>
  );
}
