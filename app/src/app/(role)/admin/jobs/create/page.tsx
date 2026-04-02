'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import styles from './page.module.css';

export default function CreateJobPage() {
  const router = useRouter();
  const [milestones, setMilestones] = useState([
    { id: 1, name: '', percentage: 0, amount: 0 }
  ]);

  const addMilestone = () => {
    setMilestones([...milestones, { id: Date.now(), name: '', percentage: 0, amount: 0 }]);
  };

  const removeMilestone = (id: number) => {
    setMilestones(milestones.filter(m => m.id !== id));
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <button className={styles.backBtn} onClick={() => router.back()}>
            <ArrowLeft size={16} /> Quay lại
          </button>
          <h1 className={styles.title}>Tạo dự án mới</h1>
          <p className={styles.subtitle}>Thiết lập yêu cầu và phân bổ ngân sách cho công việc.</p>
        </div>
        <div className={styles.actions}>
          <Button variant="outline">Lưu nháp</Button>
          <Button><Save size={16} /> Đăng công việc</Button>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.mainCol}>
          <Card className={styles.formCard}>
            <h3 className={styles.sectionTitle}>Thông tin cơ bản</h3>
            
            <div className={styles.formGroup}>
              <label>Tên dự án <span className={styles.req}>*</span></label>
              <input type="text" className={styles.input} placeholder="Ví dụ: Thiết kế kết cấu Bệnh viện..." />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Lĩnh vực <span className={styles.req}>*</span></label>
                <select className={styles.input}>
                  <option value="">Chọn lĩnh vực</option>
                  <option value="arch">Kiến trúc</option>
                  <option value="struct">Kết cấu</option>
                  <option value="mep">Cơ điện (MEP)</option>
                  <option value="bim">BIM</option>
                  <option value="est">Dự toán</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Cấp độ yêu cầu <span className={styles.req}>*</span></label>
                <select className={styles.input}>
                  <option value="L1">L1 - Junior</option>
                  <option value="L2">L2 - Middle</option>
                  <option value="L3">L3 - Senior</option>
                  <option value="L4">L4 - Expert</option>
                  <option value="L5">L5 - Master</option>
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Tổng ngân sách (VND) <span className={styles.req}>*</span></label>
                <input type="text" className={styles.input} placeholder="Ví dụ: 120,000,000" />
              </div>
              <div className={styles.formGroup}>
                <label>Thời gian hoàn thành (Ngày) <span className={styles.req}>*</span></label>
                <input type="number" className={styles.input} placeholder="Ví dụ: 90" />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Mô tả công việc (Yêu cầu kỹ thuật) <span className={styles.req}>*</span></label>
              <textarea rows={8} className={styles.textarea} placeholder="Mô tả chi tiết các đầu việc, tiêu chuẩn áp dụng, phần mềm yêu cầu..." />
            </div>
          </Card>

          <Card className={styles.formCard}>
            <div className={styles.milestoneHeader}>
              <h3 className={styles.sectionTitle}>Phân bổ giai đoạn thanh toán (Milestones)</h3>
              <Badge variant="info">Tổng (%): {milestones.reduce((acc, m) => acc + (Number(m.percentage) || 0), 0)}%</Badge>
            </div>
            
            <div className={styles.milestoneList}>
              {milestones.map((m, i) => (
                <div key={m.id} className={styles.milestoneRow}>
                  <div className={styles.mIndex}>{i + 1}</div>
                  <div className={styles.formGroup} style={{ flex: 2 }}>
                    <label>Tên giai đoạn</label>
                    <input type="text" className={styles.input} placeholder="Ví dụ: Nộp bản vẽ thiết kế cơ sở" />
                  </div>
                  <div className={styles.formGroup} style={{ width: '100px' }}>
                    <label>% Giá trị</label>
                    <input 
                      type="number" 
                      className={styles.input} 
                      placeholder="0"
                      onChange={(e) => {
                        const newM = [...milestones];
                        newM[i].percentage = Number(e.target.value);
                        setMilestones(newM);
                      }}
                    />
                  </div>
                  <button className={styles.delBtn} onClick={() => removeMilestone(m.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={addMilestone} className={styles.addBtn}>
              <Plus size={16} /> Thêm giai đoạn
            </Button>
          </Card>
        </div>

        <div className={styles.sideCol}>
          <Card className={styles.sideCard}>
            <h3 className={styles.sectionTitle}>Cài đặt hiển thị</h3>
            <div className={styles.formGroup}>
              <label>Trạng thái hiển thị</label>
              <select className={styles.input}>
                <option value="public">Công khai (Public)</option>
                <option value="private">Riêng tư (Giao việc trực tiếp)</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Hạn chót nhận hồ sơ</label>
              <input type="date" className={styles.input} />
            </div>
          </Card>
          
          <Card className={styles.sideCard}>
            <h3 className={styles.sectionTitle}>Phần mềm yêu cầu</h3>
            <div className={styles.formGroup}>
              <input type="text" className={styles.input} placeholder="Nhập tên phần mềm và Enter..." />
              <div className={styles.tagsArea}>
                <Badge>Revit</Badge>
                <Badge>ETABS</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
