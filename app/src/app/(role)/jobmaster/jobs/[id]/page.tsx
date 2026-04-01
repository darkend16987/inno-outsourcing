'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, FileText, CheckCircle, MessageSquare, AlertTriangle } from 'lucide-react';
import { Button, Card, Badge, Avatar } from '@/components/ui';
import styles from './page.module.css';

export default function JobMasterJobDetailPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.hLeft}>
          <Link href="/jobmaster/jobs" className={styles.backLink}>
            <ArrowLeft size={16}/> Quay lại danh sách
          </Link>
          <div className={styles.hTitleArea}>
            <h1 className={styles.title}>Thiết kế kiến trúc Nhà xưởng KCN Bình Dương</h1>
            <Badge variant="info">Đang thực hiện</Badge>
          </div>
          <div className={styles.hMeta}>
            <span><Clock size={14}/> Bắt đầu: 10/03/2026</span>
            <span><Clock size={14}/> Deadline: 15/05/2026</span>
          </div>
        </div>
        <div className={styles.hRight}>
           <Button variant="outline"><AlertTriangle size={16}/> Báo cáo vấn đề</Button>
           <Button><CheckCircle size={16}/> Nghiệm thu toàn bộ</Button>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.mainCol}>
          <Card className={styles.sectionCard}>
            <div className={styles.secHeader}>
              <h3 className={styles.secTitle}>Giai đoạn & Nghiệm thu (Milestones)</h3>
              <span className={styles.progressText}>Tiến độ: 45%</span>
            </div>
            
            <div className={styles.milestoneList}>
              {/* Milestone 1 - Done */}
              <div className={styles.milestoneItem}>
                <div className={styles.mStatus}><CheckCircle size={20} color="var(--color-success)"/></div>
                <div className={styles.mContent}>
                  <div className={styles.mHead}>
                    <h4>1. Khảo sát & Ký hợp đồng (10%)</h4>
                    <span className={styles.mAmount}>12,000,000₫</span>
                  </div>
                  <p className={styles.mDesc}>Hoàn thiện văn bản pháp lý và khảo sát hiện trạng.</p>
                  <div className={styles.mActions}>
                     <Badge variant="success">Đã nghiệm thu</Badge>
                  </div>
                </div>
              </div>

              {/* Milestone 2 - Reviewing */}
              <div className={`${styles.milestoneItem} ${styles.activeMilestone}`}>
                <div className={styles.mStatus}><span className={styles.dot}></span></div>
                <div className={styles.mContent}>
                  <div className={styles.mHead}>
                    <h4>2. Báo cáo thiết kế cơ sở (35%)</h4>
                    <span className={styles.mAmount}>42,000,000₫</span>
                  </div>
                  <p className={styles.mDesc}>Bản vẽ mặt bằng tổng thể, sơ đồ công năng.</p>
                  
                  <div className={styles.submissionBox}>
                    <h5><FileText size={14}/> File nộp từ Freelancer (12/03/2026)</h5>
                    <div className={styles.fileList}>
                      <a href="#" className={styles.fileLink}>Ban_ve_co_so_v1.pdf</a>
                      <a href="#" className={styles.fileLink}>Mo_hinh_3D_rough.rvt</a>
                    </div>
                  </div>

                  <div className={styles.mActions}>
                     <Button size="sm"><CheckCircle size={14}/> Phê duyệt & Yêu cầu thanh toán</Button>
                     <Button variant="outline" size="sm" className={styles.rejectBtn}><AlertTriangle size={14}/> Yêu cầu sửa đổi</Button>
                  </div>
                </div>
              </div>

              {/* Milestone 3 - Pending */}
              <div className={`${styles.milestoneItem} ${styles.op50}`}>
                <div className={styles.mStatus}><span className={styles.dotEmpty}></span></div>
                <div className={styles.mContent}>
                   <div className={styles.mHead}>
                    <h4>3. Báo cáo thiết kế thi công (55%)</h4>
                    <span className={styles.mAmount}>66,000,000₫</span>
                  </div>
                  <p className={styles.mDesc}>Bản vẽ chi tiết kỹ thuật, bóc tách khối lượng.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className={styles.sideCol}>
          <Card className={styles.sectionCard}>
            <h3 className={styles.secTitle}>Team dự án (Freelancers)</h3>
            <div className={styles.teamList}>
              <div className={styles.teamMember}>
                {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                {/* @ts-ignore */}
                <Avatar name="Nguyễn Văn A" level="L3" size="md" />
                <div className={styles.tmInfo}>
                  <p className={styles.tmName}>Nguyễn Văn A</p>
                  <p className={styles.tmRole}>Kiến trúc sư chủ trì</p>
                </div>
                <button className={styles.chatBtn}><MessageSquare size={16}/></button>
              </div>
              
              <div className={styles.teamMember}>
                {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                {/* @ts-ignore */}
                <Avatar name="Lê C" level="L2" size="md" />
                <div className={styles.tmInfo}>
                  <p className={styles.tmName}>Lê C</p>
                  <p className={styles.tmRole}>Họa viên 3D</p>
                </div>
                <button className={styles.chatBtn}><MessageSquare size={16}/></button>
              </div>
            </div>
            <Button variant="ghost" fullWidth className={styles.addBtn}>+ Tìm thêm người</Button>
          </Card>

          <Card className={styles.sectionCard}>
            <h3 className={styles.secTitle}>Ngân sách hiển thị</h3>
            <div className={styles.budgetBox}>
              <div className={styles.bRow}>
                <span>Tổng giá trị:</span>
                <strong>120,000,000₫</strong>
              </div>
              <div className={styles.bRow}>
                <span>Đã giải ngân:</span>
                <strong className={styles.succ}>12,000,000₫</strong>
              </div>
              <div className={styles.bRow}>
                <span>Chưa nghiệm thu:</span>
                <strong>108,000,000₫</strong>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
