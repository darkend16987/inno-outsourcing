'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Settings, Plus, Trash2, GripVertical, Save, Tag,
  Layers, Monitor, Building2, Star, Image, MessageCircle, ToggleLeft, ToggleRight, SlidersHorizontal, Upload, X
} from 'lucide-react';
import { Button, Badge, Card } from '@/components/ui';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import {
  getConfigItems, saveConfigItems, addConfigItem, deleteConfigItem,
  getBanners, saveBanner, deleteBanner,
  getTestimonials, saveTestimonial, deleteTestimonial,
  getGlobalSettings, saveGlobalSettings,
  type SystemConfigItem, type BannerItem, type TestimonialItem, type ConfigCategory,
  type GlobalSettings
} from '@/lib/firebase/system-config';
import styles from './page.module.css';

const TABS: { key: ConfigCategory | 'banners' | 'testimonials' | 'global'; label: string; icon: React.ReactNode }[] = [
  { key: 'specialties', label: 'Chuyên ngành', icon: <Layers size={16} /> },
  { key: 'software', label: 'Phần mềm', icon: <Monitor size={16} /> },
  { key: 'levels', label: 'Cấp bậc', icon: <Star size={16} /> },
  { key: 'job_types', label: 'Hình thức việc', icon: <Tag size={16} /> },
  { key: 'building_types', label: 'Loại công trình', icon: <Building2 size={16} /> },
  { key: 'job_tags', label: 'Tag nổi bật', icon: <Tag size={16} /> },
  { key: 'banners', label: 'Banner', icon: <Image size={16} /> },
  { key: 'testimonials', label: 'Nhận xét', icon: <MessageCircle size={16} /> },
  { key: 'global', label: 'Cài đặt chung', icon: <SlidersHorizontal size={16} /> },
];

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<string>('specialties');
  const [items, setItems] = useState<SystemConfigItem[]>([]);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('#0d7c66');
  const [newDesc, setNewDesc] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [iconUploading, setIconUploading] = useState(false);
  const iconFileRef = useRef<HTMLInputElement>(null);
  // Banner form
  const [bnTitle, setBnTitle] = useState('');
  const [bnImageUrl, setBnImageUrl] = useState('');
  const [bnLinkUrl, setBnLinkUrl] = useState('');
  // Testimonial form
  const [tmName, setTmName] = useState('');
  const [tmRole, setTmRole] = useState('');
  const [tmCompany, setTmCompany] = useState('');
  const [tmContent, setTmContent] = useState('');
  const [tmRating, setTmRating] = useState('5');
  // Global settings
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({ max_concurrent_jobs_warning: 3 });
  const [globalSaving, setGlobalSaving] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof Error) {
      if (err.message.includes('permission') || err.message.includes('PERMISSION_DENIED')) {
        return 'Bạn không có quyền thực hiện thao tác này. Vui lòng kiểm tra tài khoản admin.';
      }
      if (err.message.includes('Firebase chưa được khởi tạo')) {
        return err.message;
      }
      if (err.message.includes('network') || err.message.includes('unavailable')) {
        return 'Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.';
      }
      return `Lỗi: ${err.message}`;
    }
    return 'Đã xảy ra lỗi không xác định.';
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'banners') {
        setBanners(await getBanners());
      } else if (activeTab === 'testimonials') {
        setTestimonials(await getTestimonials());
      } else if (activeTab === 'global') {
        const gs = await getGlobalSettings();
        setGlobalSettings(gs);
      } else {
        const data = await getConfigItems(activeTab as ConfigCategory);
        setItems(data);
      }
    } catch (err) {
      console.error('Error loading config:', err);
      alert('Lỗi tải dữ liệu: ' + getErrorMessage(err));
    }
    setLoading(false);
  };

  const handleIconFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const storageRef = ref(storage, `system-config/icons/${Date.now()}.${ext}`);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const url = await getDownloadURL(storageRef);
      setNewIcon(url);
    } catch (err) {
      console.error('Icon upload failed:', err);
      alert('Lỗi tải ảnh lên. Vui lòng thử lại.');
    }
    setIconUploading(false);
    if (iconFileRef.current) iconFileRef.current.value = '';
  };

  const handleAddItem = async () => {
    if (!newLabel.trim()) {
      alert('Vui lòng nhập tên mục.');
      return;
    }
    setSaving(true);
    try {
      await addConfigItem(activeTab as ConfigCategory, {
        label: newLabel.trim(),
        color: newColor,
        description: newDesc.trim() || '',
        icon: newIcon.trim() || '',
        isActive: true,
      });
      setNewLabel('');
      setNewDesc('');
      setNewIcon('');
      setNewColor('#0d7c66');
      await loadData();
    } catch (err) {
      console.error('Error adding item:', err);
      alert('Không thể thêm mục. ' + getErrorMessage(err));
    }
    setSaving(false);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Bạn có chắc muốn xóa mục này?')) return;
    setSaving(true);
    try {
      await deleteConfigItem(activeTab as ConfigCategory, itemId);
      await loadData();
    } catch (err) {
      console.error('Error deleting item:', err);
      alert('Không thể xóa mục. ' + getErrorMessage(err));
    }
    setSaving(false);
  };

  const handleToggle = async (itemId: string) => {
    const previous = items;
    const updated = items.map(i =>
      i.id === itemId ? { ...i, isActive: !i.isActive } : i
    );
    setItems(updated);
    try {
      await saveConfigItems(activeTab as ConfigCategory, updated);
    } catch (err) {
      console.error('Error toggling item:', err);
      setItems(previous); // rollback on failure
      alert('Không thể thay đổi trạng thái. ' + getErrorMessage(err));
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await saveConfigItems(activeTab as ConfigCategory, items);
      alert('Đã lưu thành công!');
    } catch (err) {
      console.error('Error saving:', err);
      alert('Không thể lưu thay đổi. ' + getErrorMessage(err));
    }
    setSaving(false);
  };

  const isConfigTab = !['banners', 'testimonials', 'global'].includes(activeTab);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <Settings size={24} />
          <div>
            <h1 className={styles.pageTitle}>Cấu hình hệ thống</h1>
            <p className={styles.pageDesc}>Quản lý các danh mục, tag, banner và cấu hình chung</p>
          </div>
        </div>
        {isConfigTab && (
          <Button variant="primary" icon={<Save size={16} />} onClick={handleSaveAll} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Đang tải...</p>
        </div>
      ) : (
        <>
          {/* Config Items Tab */}
          {isConfigTab && (
            <div className={styles.configSection}>
              {/* Add form */}
              <Card className={styles.addForm}>
                <div className={styles.addRow}>
                  <input
                    type="text"
                    placeholder="Tên mục mới..."
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    className={styles.input}
                  />
                  {(activeTab === 'specialties' || activeTab === 'job_tags' || activeTab === 'levels') && (
                    <div className={styles.colorPicker}>
                      <input
                        type="color"
                        value={newColor}
                        onChange={e => setNewColor(e.target.value)}
                        className={styles.colorInput}
                      />
                    </div>
                  )}
                  {activeTab === 'specialties' && (
                    <div className={styles.iconUpload}>
                      {newIcon ? (
                        <div className={styles.iconPreviewWrap}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={newIcon} alt="icon preview" className={styles.iconPreview} />
                          <button className={styles.iconClear} onClick={() => setNewIcon('')} title="Xóa icon">
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          className={styles.iconUploadBtn}
                          onClick={() => iconFileRef.current?.click()}
                          disabled={iconUploading}
                          title="Tải lên icon"
                          type="button"
                        >
                          {iconUploading ? <div className={styles.spinnerSm} /> : <Upload size={14} />}
                          <span>{iconUploading ? 'Đang tải...' : 'Icon'}</span>
                        </button>
                      )}
                      <input
                        ref={iconFileRef}
                        type="file"
                        accept="image/png,image/svg+xml,image/jpeg,image/webp"
                        style={{ display: 'none' }}
                        onChange={handleIconFileChange}
                      />
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="Mô tả (tuỳ chọn)..."
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    className={styles.inputSmall}
                  />
                  <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={handleAddItem} disabled={saving}>
                    Thêm
                  </Button>
                </div>
              </Card>

              {/* Items list */}
              <div className={styles.itemsList}>
                {items.map((item, idx) => (
                  <div key={item.id} className={styles.configItem} data-active={item.isActive}>
                    <div className={styles.itemGrip}>
                      <GripVertical size={14} />
                    </div>
                    <span className={styles.itemOrder}>{idx + 1}</span>
                    {item.color && (
                      <span className={styles.itemColor} style={{ background: item.color }} />
                    )}
                    {item.icon && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.icon} alt="" className={styles.itemIcon} />
                    )}
                    <div className={styles.itemInfo}>
                      <span className={styles.itemLabel}>{item.label}</span>
                      {item.description && <span className={styles.itemDesc}>{item.description}</span>}
                    </div>
                    <button className={styles.toggleBtn} onClick={() => handleToggle(item.id)}>
                      {item.isActive ? <ToggleRight size={22} className={styles.toggleOn} /> : <ToggleLeft size={22} className={styles.toggleOff} />}
                    </button>
                    <button className={styles.deleteBtn} onClick={() => handleDeleteItem(item.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className={styles.emptyMsg}>Chưa có mục nào. Thêm mục đầu tiên ở trên.</p>
                )}
              </div>
            </div>
          )}

          {/* Banners Tab */}
          {activeTab === 'banners' && (
            <div className={styles.configSection}>
              <p className={styles.tabHint}>Quản lý banner hiển thị trên trang chủ. <strong>Khuyến nghị:</strong> Ảnh kích thước 1200×400px, định dạng JPG/PNG, tối đa 5 banner.</p>
              <Card className={styles.addForm}>
                <div className={styles.addRow}>
                  <input type="text" placeholder="Tiêu đề banner..." value={bnTitle} onChange={e => setBnTitle(e.target.value)} className={styles.input} />
                  <input type="url" placeholder="URL hình ảnh (1200×400px)" value={bnImageUrl} onChange={e => setBnImageUrl(e.target.value)} className={styles.input} />
                </div>
                <div className={styles.addRow} style={{marginTop: 8}}>
                  <input type="url" placeholder="Link khi click (tuỳ chọn)" value={bnLinkUrl} onChange={e => setBnLinkUrl(e.target.value)} className={styles.input} />
                  <Button variant="primary" size="sm" icon={<Plus size={14} />} disabled={saving || !bnImageUrl.trim()} onClick={async () => {
                    setSaving(true);
                    try {
                      await saveBanner({ imageUrl: bnImageUrl.trim(), title: bnTitle.trim() || undefined, linkUrl: bnLinkUrl.trim() || undefined, isActive: true, order: banners.length });
                      setBnTitle(''); setBnImageUrl(''); setBnLinkUrl('');
                      await loadData();
                    } catch (err) {
                      console.error(err);
                      alert('Không thể thêm banner. ' + getErrorMessage(err));
                    }
                    setSaving(false);
                  }}>Thêm banner</Button>
                </div>
              </Card>
              {banners.map(b => (
                <div key={b.id} className={styles.bannerItem}>
                  <div className={styles.bannerPreview}>
                    {b.imageUrl ? <span style={{backgroundImage: `url(${b.imageUrl})`, backgroundSize: 'cover', width: '100%', height: '100%'}} role="img" aria-label={b.title || 'Banner'} /> : <span>No image</span>}
                  </div>
                  <div className={styles.bannerInfo}>
                    <span>{b.title || 'Untitled'}</span>
                    <span className={styles.bannerLink}>{b.linkUrl || 'No link'}</span>
                  </div>
                  <button className={styles.deleteBtn} onClick={() => deleteBanner(b.id).then(loadData).catch(err => {
                    console.error(err);
                    alert('Không thể xóa banner. ' + getErrorMessage(err));
                  })}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {banners.length === 0 && <p className={styles.emptyMsg}>Chưa có banner nào. Thêm banner đầu tiên ở trên.</p>}
            </div>
          )}

          {/* Testimonials Tab */}
          {activeTab === 'testimonials' && (
            <div className={styles.configSection}>
              <p className={styles.tabHint}>Quản lý nhận xét hiển thị trên trang chủ. <strong>Khuyến nghị:</strong> Nội dung 50–200 ký tự, tối đa 6 nhận xét.</p>
              <Card className={styles.addForm}>
                <div className={styles.addRow}>
                  <input type="text" placeholder="Tên người nhận xét" value={tmName} onChange={e => setTmName(e.target.value)} className={styles.input} />
                  <input type="text" placeholder="Vai trò (KTS, PM...)" value={tmRole} onChange={e => setTmRole(e.target.value)} className={styles.inputSmall} />
                  <input type="text" placeholder="Công ty" value={tmCompany} onChange={e => setTmCompany(e.target.value)} className={styles.inputSmall} />
                </div>
                <div className={styles.addRow} style={{marginTop: 8}}>
                  <input type="text" placeholder="Nội dung nhận xét (50–200 ký tự)" value={tmContent} onChange={e => setTmContent(e.target.value)} className={styles.input} maxLength={200} />
                  <select value={tmRating} onChange={e => setTmRating(e.target.value)} className={styles.inputSmall} style={{maxWidth: 80}}>
                    <option value="5">⭐ 5</option>
                    <option value="4">⭐ 4</option>
                    <option value="3">⭐ 3</option>
                  </select>
                  <Button variant="primary" size="sm" icon={<Plus size={14} />} disabled={saving || !tmName.trim() || !tmContent.trim()} onClick={async () => {
                    setSaving(true);
                    try {
                      await saveTestimonial({ name: tmName.trim(), role: tmRole.trim(), company: tmCompany.trim(), avatarUrl: '', content: tmContent.trim(), rating: parseInt(tmRating), isActive: true, order: testimonials.length });
                      setTmName(''); setTmRole(''); setTmCompany(''); setTmContent(''); setTmRating('5');
                      await loadData();
                    } catch (err) {
                      console.error(err);
                      alert('Không thể thêm nhận xét. ' + getErrorMessage(err));
                    }
                    setSaving(false);
                  }}>Thêm</Button>
                </div>
                <p style={{fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6}}>Đã nhập {tmContent.length}/200 ký tự</p>
              </Card>
              {testimonials.map(t => (
                <div key={t.id} className={styles.testimonialItem}>
                  <div className={styles.testInfo}>
                    <strong>{t.name}</strong>
                    <span className={styles.testRole}>{t.role} — {t.company}</span>
                    <p className={styles.testContent}>&ldquo;{t.content}&rdquo;</p>
                  </div>
                  <Badge variant={t.isActive ? 'success' : 'default'}>{t.isActive ? 'Active' : 'Hidden'}</Badge>
                  <button className={styles.deleteBtn} onClick={() => deleteTestimonial(t.id).then(loadData).catch(err => {
                    console.error(err);
                    alert('Không thể xóa nhận xét. ' + getErrorMessage(err));
                  })}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {testimonials.length === 0 && <p className={styles.emptyMsg}>Chưa có nhận xét nào. Thêm nhận xét đầu tiên ở trên.</p>}
            </div>
          )}

          {/* Global Settings Tab */}
          {activeTab === 'global' && (
            <div className={styles.configSection}>
              <p className={styles.tabHint}>Cài đặt chung cho hệ thống. Các giá trị này ảnh hưởng tới toàn bộ nền tảng.</p>
              <Card className={styles.addForm}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
                  <div>
                    <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                      Ngưỡng cảnh báo job đồng thời
                    </label>
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                      Khi freelancer đang thực hiện từ X job trở lên, hệ thống sẽ hiển thị cảnh báo cho cả freelancer và jobmaster.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={globalSettings.max_concurrent_jobs_warning}
                        onChange={e => setGlobalSettings(prev => ({ ...prev, max_concurrent_jobs_warning: parseInt(e.target.value) || 3 }))}
                        className={styles.inputSmall}
                        style={{ maxWidth: 100 }}
                      />
                      <span style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>job</span>
                    </div>
                  </div>
                </div>
              </Card>
              <div style={{ marginTop: 16 }}>
                <Button
                  variant="primary"
                  icon={<Save size={16} />}
                  disabled={globalSaving}
                  onClick={async () => {
                    setGlobalSaving(true);
                    try {
                      await saveGlobalSettings(globalSettings);
                      alert('Đã lưu cài đặt chung!');
                    } catch (err) {
                      console.error(err);
                      alert('Không thể lưu cài đặt chung. ' + getErrorMessage(err));
                    }
                    setGlobalSaving(false);
                  }}
                >
                  {globalSaving ? 'Đang lưu...' : 'Lưu cài đặt chung'}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
