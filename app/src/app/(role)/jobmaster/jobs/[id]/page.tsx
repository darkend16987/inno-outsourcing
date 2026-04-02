'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, FileText, CheckCircle, MessageSquare, AlertTriangle, Zap, X } from 'lucide-react';
import { Button, Card, Badge, Avatar } from '@/components/ui';
import { EscrowStatus } from '@/components/escrow/EscrowStatus';
import { DeadlineIndicator } from '@/components/jobs/DeadlineAlert';
import { MutualReviewForm } from '@/components/reviews/MutualReview';
import { submitReview } from '@/lib/firebase/firestore-extended';
import { ActivityFeed, type ActivityItem } from '@/components/jobs/ActivityFeed';
import styles from './page.module.css';

// Mock Modal Component
function PaymentConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  milestoneName, 
  amount 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void;
  milestoneName: string;
  amount: string;
}) {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay}>
      <Card className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Xác nhận Nghiệm thu & Thanh toán</h3>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        <div className={styles.modalBody}>
          <p>Bạn đang thực hiện nghiệm thu giai đoạn: <strong>{milestoneName}</strong></p>
          <p>Số tiền yêu cầu thanh toán: <strong className={styles.amountText}>{amount}</strong></p>
          <div className={styles.infoAlert}>
            <Zap size={16}/>
            <span>Hệ thống sẽ tự động tạo Lệnh chi và gửi thông tin đến bộ phận Kế toán.</span>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <Button variant="outline" onClick={onClose}>Hủy bỏ</Button>
          <Button onClick={onConfirm}>Xác nhận & Gửi yêu cầu</Button>
        </div>
      </Card>
    </div>
  );
}

export default function JobMasterJobDetailPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState({ name: '', amount: '' });

  const handleApproveClick = (name: string, amount: string) => {
    setSelectedMilestone({ name, amount });
    setIsModalOpen(true);
  };

  const handleConfirmOrder = () => {
    // console.log('Confirming Order for', selectedMilestone.name);
    setIsModalOpen(false);
    // In real app: call firebase function 'requestPaymentOrder'
    alert(`Yêu cầu thanh toán ${selectedMilestone.amount} đã được gửi cho Kế toán!`);
  };

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
                     <Badge variant="success">Đã nghiệm thu & Thanh toán</Badge>
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
                     <Button size="sm" onClick={() => handleApproveClick('Báo cáo thiết kế cơ sở', '42,000,000₫')}>
                        <CheckCircle size={14}/> Phê duyệt & Yêu cầu thanh toán
                     </Button>
                     <Button variant="outline" size="sm" className={styles.rejectBtn}>
                        <AlertTriangle size={14}/> Yêu cầu sửa đổi
                     </Button>
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

          <EscrowStatus
            totalFee={120_000_000}
            milestones={[
              { id: 'm1', name: 'Khảo sát & Ký hợp đồng', percentage: 10, amount: 12_000_000, status: 'released', condition: 'Hoàn thiện văn bản pháp lý' },
              { id: 'm2', name: 'Thiết kế cơ sở', percentage: 35, amount: 42_000_000, status: 'locked', condition: 'Nộp bản vẽ mặt bằng tổng thể' },
              { id: 'm3', name: 'Thiết kế thi công', percentage: 55, amount: 66_000_000, status: 'locked', condition: 'Bản vẽ chi tiết kỹ thuật' },
            ]}
          />

          <ActivityFeed
            activities={([
              { id: '1', type: 'escrow_locked' as const, title: 'Escrow đã được khoá', description: '120,000,000₫ đã được bảo lưu', actor: 'Hệ thống', timestamp: new Date(2026, 2, 10) },
              { id: '2', type: 'contract_signed' as const, title: 'Hợp đồng đã ký', actor: 'Nguyễn Văn A', timestamp: new Date(2026, 2, 10) },
              { id: '3', type: 'milestone_approved' as const, title: 'Nghiệm thu: Khảo sát & KHĐ', description: '12,000,000₫ đã giải ngân', actor: 'Jobmaster', timestamp: new Date(2026, 2, 12) },
              { id: '4', type: 'milestone_submitted' as const, title: 'Nộp kết quả: Thiết kế cơ sở', description: '2 file đã tải lên', actor: 'Nguyễn Văn A', timestamp: new Date(2026, 2, 15) },
              { id: '5', type: 'comment_added' as const, title: 'Bình luận mới', description: 'Bản vẽ mặt bằng cần chỉnh sửa theo góp ý...', actor: 'Jobmaster', timestamp: new Date(2026, 2, 16) },
            ]).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())}
            maxVisible={4}
          />

          {/* MutualReview — shown when job is completed */}
          <MutualReviewForm
            jobTitle="Thiết kế kiến trúc Nhà xưởng KCN Bình Dương"
            targetUserName="Nguyễn Văn A"
            reviewerRole="jobmaster"
            onSubmit={async (data) => {
              await submitReview({
                jobId: 'demo-job-id',
                jobTitle: 'Thiết kế kiến trúc Nhà xưởng KCN Bình Dương',
                reviewerId: 'jobmaster-uid',
                reviewerName: 'Job Master',
                reviewerRole: 'jobmaster',
                revieweeId: 'freelancer-uid',
                revieweeName: 'Nguyễn Văn A',
                rating: data.rating,
                communication: data.communication,
                quality: data.quality,
                timeliness: data.timeliness,
                comment: data.comment,
              });
            }}
          />
        </div>
      </div>

      <PaymentConfirmModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        milestoneName={selectedMilestone.name}
        amount={selectedMilestone.amount}
        onConfirm={handleConfirmOrder}
      />
    </div>
  );
}
