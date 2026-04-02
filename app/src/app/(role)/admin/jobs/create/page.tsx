'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, ArrowLeft, Loader2, X, ImageIcon } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { getConfigItems, type SystemConfigItem, type ConfigCategory } from '@/lib/firebase/system-config';
import { createJob } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/firebase/auth-context';
import { cache } from '@/lib/cache/swr-cache';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/formatters';
import styles from './page.module.css';

interface MilestoneForm {
  id: number;
  name: string;
  percentage: number;
}

export default function CreateJobPage() {
  const router = useRouter();
  const { userProfile } = useAuth();

  // System config data
  const [specialties, setSpecialties] = useState<SystemConfigItem[]>([]);
  const [levels, setLevels] = useState<SystemConfigItem[]>([]);
  const [softwareList, setSoftwareList] = useState<SystemConfigItem[]>([]);
  const [buildingTypes, setBuildingTypes] = useState<SystemConfigItem[]>([]);
  const [jobTypes, setJobTypes] = useState<SystemConfigItem[]>([]);
  const [jobTags, setJobTags] = useState<SystemConfigItem[]>([]);
  const [configLoading, setConfigLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [totalFee, setTotalFee] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [deadline, setDeadline] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [projectType, setProjectType] = useState('');
  const [selectedSoftware, setSelectedSoftware] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [milestones, setMilestones] = useState<MilestoneForm[]>([
    { id: 1, name: '', percentage: 0 }
  ]);
  const [saving, setSaving] = useState(false);
  const [projectScale, setProjectScale] = useState('');
  const [projectImages, setProjectImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');

  // Load system config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const categories: ConfigCategory[] = ['specialties', 'software', 'levels', 'building_types', 'job_types', 'job_tags'];
        const [sp, sw, lv, bt, jt, tags] = await Promise.all(
          categories.map(c => getConfigItems(c))
        );
        setSpecialties(sp.filter(i => i.isActive));
        setSoftwareList(sw.filter(i => i.isActive));
        setLevels(lv.filter(i => i.isActive));
        setBuildingTypes(bt.filter(i => i.isActive));
        setJobTypes(jt.filter(i => i.isActive));
        setJobTags(tags.filter(i => i.isActive));
      } catch (err) {
        console.error('Failed to load config:', err);
      }
      setConfigLoading(false);
    };
    loadConfig();
  }, []);

  const addMilestone = () => {
    setMilestones([...milestones, { id: Date.now(), name: '', percentage: 0 }]);
  };

  const removeMilestone = (id: number) => {
    setMilestones(milestones.filter(m => m.id !== id));
  };

  const updateMilestone = (id: number, field: 'name' | 'percentage', value: string | number) => {
    setMilestones(milestones.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const toggleSoftware = (label: string) => {
    setSelectedSoftware(prev =>
      prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label]
    );
  };

  const toggleTag = (label: string) => {
    setSelectedTags(prev =>
      prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label]
    );
  };

  const validateForm = (): string | null => {
    if (!title.trim()) return 'Vui lòng nhập tên dự án';
    if (!category) return 'Vui lòng chọn lĩnh vực';
    if (!level) return 'Vui lòng chọn cấp độ yêu cầu';
    if (!totalFee) return 'Vui lòng nhập tổng ngân sách';
    if (!duration) return 'Vui lòng nhập thời gian hoàn thành';
    if (!description.trim()) return 'Vui lòng nhập mô tả công việc';
    return null;
  };

  const handleSubmit = async (status: 'draft' | 'pending_approval') => {
    const error = validateForm();
    if (error) {
      alert(error);
      return;
    }
    if (!userProfile) {
      alert('Bạn cần đăng nhập để tạo job.');
      return;
    }

    setSaving(true);
    try {
      const feeNumber = parseCurrencyInput(totalFee);
      const jobData = {
        title: title.trim(),
        description: description.trim(),
        category: category as never,
        subcategory: '',
        projectType,
        workMode: (workMode || 'remote') as 'remote' | 'on-site' | 'hybrid',
        level: level as 'L1' | 'L2' | 'L3' | 'L4' | 'L5',
        totalFee: feeNumber,
        currency: 'VND' as const,
        duration: Number(duration),
        deadline: deadline ? new Date(deadline) : new Date(Date.now() + Number(duration) * 86400000),
        paymentType: 'milestone' as const,
        milestones: milestones
          .filter(m => m.name.trim())
          .map((m, idx) => ({
            id: `ms_${idx + 1}`,
            name: m.name,
            percentage: m.percentage,
            amount: Math.round(feeNumber * m.percentage / 100),
            condition: '',
            status: 'pending' as const,
          })),
        requirements: {
          experience: '',
          certifications: '',
          software: selectedSoftware,
          standards: [],
        },
        checklist: [],
        attachments: [],
        status,
        progress: 0,
        assignedTo: null,
        createdBy: userProfile.uid,
        jobMaster: userProfile.uid,
        jobMasterName: userProfile.displayName || '',
        searchKeywords: title.toLowerCase().split(' '),
        isPublic: visibility === 'public',
        highlightTags: selectedTags,
        ...(projectScale.trim() && { projectScale: projectScale.trim() }),
        ...(projectImages.length > 0 && { projectImages }),
      };

      await createJob(jobData as never);
      cache.invalidate('admin:jobs:list');
      alert(status === 'draft' ? '✅ Đã lưu nháp!' : '✅ Job đã được gửi duyệt!');
      router.push('/admin/jobs');
    } catch (err) {
      console.error('Create job failed:', err);
      alert('❌ Không thể tạo job. Vui lòng thử lại.');
    }
    setSaving(false);
  };

  if (configLoading) {
    return (
      <div className={styles.page}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '40px', justifyContent: 'center', opacity: 0.6 }}>
          <Loader2 size={20} className={styles.spin || ''} style={{ animation: 'spin 1s linear infinite' }} />
          Đang tải cấu hình hệ thống...
        </div>
      </div>
    );
  }

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
          <Button variant="outline" onClick={() => handleSubmit('draft')} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu nháp'}
          </Button>
          <Button onClick={() => handleSubmit('pending_approval')} disabled={saving}>
            <Save size={16} /> {saving ? 'Đang gửi...' : 'Đăng công việc'}
          </Button>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.mainCol}>
          <Card className={styles.formCard}>
            <h3 className={styles.sectionTitle}>Thông tin cơ bản</h3>
            
            <div className={styles.formGroup}>
              <label>Tên dự án <span className={styles.req}>*</span></label>
              <input
                type="text"
                className={styles.input}
                placeholder="Ví dụ: Thiết kế kết cấu Bệnh viện..."
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Lĩnh vực <span className={styles.req}>*</span></label>
                <select className={styles.input} value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="">Chọn lĩnh vực</option>
                  {specialties.map(s => (
                    <option key={s.id} value={s.label}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Cấp độ yêu cầu <span className={styles.req}>*</span></label>
                <select className={styles.input} value={level} onChange={e => setLevel(e.target.value)}>
                  <option value="">Chọn cấp độ</option>
                  {levels.map(l => (
                    <option key={l.id} value={l.label}>{l.label} {l.description ? `- ${l.description}` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Tổng ngân sách (VND) <span className={styles.req}>*</span></label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="VD: 120.000.000"
                  value={totalFee}
                  onChange={e => setTotalFee(formatCurrencyInput(e.target.value))}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Thời gian hoàn thành (Ngày) <span className={styles.req}>*</span></label>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="Ví dụ: 90"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Mô tả công việc (Yêu cầu kỹ thuật) <span className={styles.req}>*</span></label>
              <textarea
                rows={8}
                className={styles.textarea}
                placeholder="Mô tả chi tiết các đầu việc, tiêu chuẩn áp dụng, phần mềm yêu cầu..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </Card>

          <Card className={styles.formCard}>
            <h3 className={styles.sectionTitle}>📐 Quy mô dự án & Hình ảnh</h3>
            <div className={styles.formGroup}>
              <label>Quy mô dự án</label>
              <textarea
                rows={3}
                className={styles.textarea}
                placeholder="VD: 8 tầng, 3000m² sàn, khoảng 50 căn hộ..."
                value={projectScale}
                onChange={e => setProjectScale(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Hình ảnh công trình <span style={{fontSize:'12px',fontWeight:400,color:'var(--color-text-muted)'}}>(URL, tùy chọn)</span></label>
              {projectImages.length > 0 && (
                <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:8}}>
                  {projectImages.map((url, i) => (
                    <div key={i} style={{position:'relative',borderRadius:8,overflow:'hidden',border:'1px solid var(--color-border)',width:120,height:80}}>
                      <img src={url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                      <button type="button" onClick={() => setProjectImages(prev => prev.filter((_,idx) => idx !== i))} style={{position:'absolute',top:2,right:2,background:'rgba(0,0,0,.6)',color:'#fff',border:'none',borderRadius:'50%',width:20,height:20,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:12}}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{display:'flex',gap:8}}>
                <input type="url" className={styles.input} placeholder="https://example.com/image.jpg" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} />
                <Button variant="outline" size="sm" onClick={() => { if(newImageUrl.trim()){ setProjectImages(p => [...p, newImageUrl.trim()]); setNewImageUrl(''); } }} disabled={!newImageUrl.trim()}><ImageIcon size={14} /> Thêm</Button>
              </div>
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
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Ví dụ: Nộp bản vẽ thiết kế cơ sở"
                      value={m.name}
                      onChange={e => updateMilestone(m.id, 'name', e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup} style={{ width: '100px' }}>
                    <label>% Giá trị</label>
                    <input 
                      type="number" 
                      className={styles.input} 
                      placeholder="0"
                      value={m.percentage || ''}
                      onChange={e => updateMilestone(m.id, 'percentage', Number(e.target.value))}
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
              <select className={styles.input} value={visibility} onChange={e => setVisibility(e.target.value as 'public' | 'private')}>
                <option value="public">Công khai (Public)</option>
                <option value="private">Riêng tư (Giao việc trực tiếp)</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Hạn chót nhận hồ sơ</label>
              <input type="date" className={styles.input} value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
            {jobTypes.length > 0 && (
              <div className={styles.formGroup}>
                <label>Hình thức làm việc</label>
                <select className={styles.input} value={workMode} onChange={e => setWorkMode(e.target.value)}>
                  <option value="">Chọn hình thức</option>
                  {jobTypes.map(jt => (
                    <option key={jt.id} value={jt.label.toLowerCase()}>{jt.label}</option>
                  ))}
                </select>
              </div>
            )}
            {buildingTypes.length > 0 && (
              <div className={styles.formGroup}>
                <label>Loại công trình</label>
                <select className={styles.input} value={projectType} onChange={e => setProjectType(e.target.value)}>
                  <option value="">Chọn loại công trình</option>
                  {buildingTypes.map(bt => (
                    <option key={bt.id} value={bt.label}>{bt.label}</option>
                  ))}
                </select>
              </div>
            )}
          </Card>
          
          <Card className={styles.sideCard}>
            <h3 className={styles.sectionTitle}>Phần mềm yêu cầu</h3>
            <div className={styles.formGroup}>
              <div className={styles.tagsArea}>
                {softwareList.map(sw => (
                  <Badge
                    key={sw.id}
                    variant={selectedSoftware.includes(sw.label) ? 'primary' : 'default'}
                    onClick={() => toggleSoftware(sw.label)}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    {sw.label}
                    {selectedSoftware.includes(sw.label) && <X size={12} style={{ marginLeft: 4 }} />}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>

          {jobTags.length > 0 && (
            <Card className={styles.sideCard}>
              <h3 className={styles.sectionTitle}>Tag nổi bật</h3>
              <div className={styles.formGroup}>
                <div className={styles.tagsArea}>
                  {jobTags.map(tag => (
                    <Badge
                      key={tag.id}
                      variant={selectedTags.includes(tag.label) ? 'primary' : 'default'}
                      onClick={() => toggleTag(tag.label)}
                      style={{
                        cursor: 'pointer',
                        userSelect: 'none',
                        borderColor: tag.color || undefined,
                        color: selectedTags.includes(tag.label) ? '#fff' : (tag.color || undefined),
                        background: selectedTags.includes(tag.label) ? (tag.color || undefined) : undefined,
                      }}
                    >
                      {tag.label}
                      {selectedTags.includes(tag.label) && <X size={12} style={{ marginLeft: 4 }} />}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
