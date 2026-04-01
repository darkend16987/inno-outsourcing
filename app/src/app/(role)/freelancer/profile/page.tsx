'use client';

import React from 'react';
import { Mail, Phone, MapPin, Award, Star, Briefcase, Calendar } from 'lucide-react';
import { Card, Badge, LevelBadge, Avatar, Button } from '@/components/ui';
import styles from './page.module.css';

const MOCK_PROFILE = {
  name: 'Nguyễn Văn A',
  role: 'Freelancer',
  level: 'L3',
  email: 'nguyenvana@example.com',
  phone: '0901 234 567',
  address: 'Quận 7, TP. Hồ Chí Minh',
  bio: 'Hơn 5 năm kinh nghiệm về diễn họa kiến trúc bằng Revit và 3ds Max. Chuyên đảm nhận các dự án nhà xưởng, chung cư cao tầng. Cẩn thận, đúng tiến độ và sẵn sàng hỗ trợ sửa đổi theo yêu cầu thiết kế.',
  joinedAt: '01/2025',
  specialties: ['Kiến trúc', 'BIM'],
  software: ['Revit', 'AutoCAD', '3ds Max', 'Enscape'],
  stats: {
    jobsDone: 15,
    rating: 4.8,
    onTime: '100%',
  },
  kyc: true,
};

export default function ProfilePage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Hồ sơ năng lực</h1>
          <p className={styles.subtitle}>Quản lý thông tin cá nhân và chi tiết năng lực chuyên môn.</p>
        </div>
        <Button>Chỉnh sửa hồ sơ</Button>
      </div>

      <div className={styles.grid}>
        {/* Left Column: ID Card */}
        <div className={styles.leftCol}>
          <Card className={styles.profileCard}>
            <div className={styles.pHeader}>
              <Avatar name={MOCK_PROFILE.name} level={MOCK_PROFILE.level as any} size="lg" />
              <div className={styles.pNameWrap}>
                <h2 className={styles.pName}>{MOCK_PROFILE.name}</h2>
                <div className={styles.pRole}>{MOCK_PROFILE.role}</div>
              </div>
            </div>

            <div className={styles.pTags}>
              <LevelBadge level={MOCK_PROFILE.level as any} showLabel />
              {MOCK_PROFILE.kyc && <Badge variant="success" size="sm">Đã xác minh KYC</Badge>}
            </div>

            <div className={styles.pContact}>
              <div className={styles.cItem}><Mail size={16} /> {MOCK_PROFILE.email}</div>
              <div className={styles.cItem}><Phone size={16} /> {MOCK_PROFILE.phone}</div>
              <div className={styles.cItem}><MapPin size={16} /> {MOCK_PROFILE.address}</div>
              <div className={styles.cItem}><Calendar size={16} /> Tham gia: {MOCK_PROFILE.joinedAt}</div>
            </div>
          </Card>

          <Card className={styles.statsCard}>
            <div className={styles.statBox}>
              <div className={styles.sVal}>{MOCK_PROFILE.stats.jobsDone}</div>
              <div className={styles.sLabel}>Dự án<br/>hoàn thành</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.sVal}>{MOCK_PROFILE.stats.rating}</div>
              <div className={styles.sLabel}>Điểm<br/>đánh giá</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.sVal}>{MOCK_PROFILE.stats.onTime}</div>
              <div className={styles.sLabel}>Tỷ lệ<br/>đúng hạn</div>
            </div>
          </Card>
        </div>

        {/* Right Column: Details */}
        <div className={styles.rightCol}>
          <Card className={styles.detailCard}>
            <h3 className={styles.sectionTitle}>Giới thiệu bản thân</h3>
            <p className={styles.bio}>{MOCK_PROFILE.bio}</p>
          </Card>

          <Card className={styles.detailCard}>
            <h3 className={styles.sectionTitle}>Chuyên môn & Kỹ năng</h3>
            <div className={styles.skillSect}>
              <h4>Lĩnh vực</h4>
              <div className={styles.tagsGroup}>
                {MOCK_PROFILE.specialties.map(s => <Badge key={s}>{s}</Badge>)}
              </div>
            </div>
            <div className={styles.skillSect}>
              <h4>Phần mềm thành thạo</h4>
              <div className={styles.tagsGroup}>
                {MOCK_PROFILE.software.map(s => <Badge key={s} variant="outline">{s}</Badge>)}
              </div>
            </div>
          </Card>

          <Card className={styles.detailCard}>
            <h3 className={styles.sectionTitle}>Huy hiệu đã đạt</h3>
            <div className={styles.badgesWrap}>
              <div className={styles.honorBadge}>
                <Award size={24} className={styles.hbIcon} />
                <div className={styles.hbName}>Đối tác tin cậy</div>
              </div>
              <div className={styles.honorBadge}>
                <Star size={24} className={styles.hbIcon} />
                <div className={styles.hbName}>Hiệu suất 5 sao</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
