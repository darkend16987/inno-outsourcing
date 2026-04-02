'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings, Plus, Trash2, GripVertical, Save, Tag,
  Layers, Monitor, Building2, Star, Image, MessageCircle, ToggleLeft, ToggleRight
} from 'lucide-react';
import { Button, Badge, Card } from '@/components/ui';
import {
  getConfigItems, saveConfigItems, addConfigItem, deleteConfigItem,
  getBanners, deleteBanner,
  getTestimonials, deleteTestimonial,
  type SystemConfigItem, type BannerItem, type TestimonialItem, type ConfigCategory
} from '@/lib/firebase/system-config';
import styles from './page.module.css';

const TABS: { key: ConfigCategory | 'banners' | 'testimonials'; label: string; icon: React.ReactNode }[] = [
  { key: 'specialties', label: 'Chuyên ngành', icon: <Layers size={16} /> },
  { key: 'software', label: 'Phần mềm', icon: <Monitor size={16} /> },
  { key: 'levels', label: 'Cấp bậc', icon: <Star size={16} /> },
  { key: 'job_types', label: 'Hình thức việc', icon: <Tag size={16} /> },
  { key: 'building_types', label: 'Loại công trình', icon: <Building2 size={16} /> },
  { key: 'job_tags', label: 'Tag nổi bật', icon: <Tag size={16} /> },
  { key: 'banners', label: 'Banner', icon: <Image size={16} /> },
  { key: 'testimonials', label: 'Nhận xét', icon: <MessageCircle size={16} /> },
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

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'banners') {
        setBanners(await getBanners());
      } else if (activeTab === 'testimonials') {
        setTestimonials(await getTestimonials());
      } else {
        const data = await getConfigItems(activeTab as ConfigCategory);
        setItems(data);
      }
    } catch (err) {
      console.error('Error loading config:', err);
    }
    setLoading(false);
  };

  const handleAddItem = async () => {
    if (!newLabel.trim()) return;
    setSaving(true);
    try {
      await addConfigItem(activeTab as ConfigCategory, {
        label: newLabel.trim(),
        color: newColor,
        description: newDesc || undefined,
        isActive: true,
      });
      setNewLabel('');
      setNewDesc('');
      await loadData();
    } catch (err) {
      console.error('Error adding item:', err);
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
    }
    setSaving(false);
  };

  const handleToggle = async (itemId: string) => {
    const updated = items.map(i =>
      i.id === itemId ? { ...i, isActive: !i.isActive } : i
    );
    setItems(updated);
    try {
      await saveConfigItems(activeTab as ConfigCategory, updated);
    } catch (err) {
      console.error('Error toggling item:', err);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await saveConfigItems(activeTab as ConfigCategory, items);
      alert('Đã lưu thành công!');
    } catch (err) {
      console.error('Error saving:', err);
    }
    setSaving(false);
  };

  const isConfigTab = !['banners', 'testimonials'].includes(activeTab);

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
                  {activeTab === 'levels' && (
                    <input
                      type="text"
                      placeholder="Mô tả..."
                      value={newDesc}
                      onChange={e => setNewDesc(e.target.value)}
                      className={styles.inputSmall}
                    />
                  )}
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
              <p className={styles.tabHint}>Quản lý banner hiển thị trên trang chủ. Hỗ trợ hình ảnh full-width.</p>
              {banners.map(b => (
                <div key={b.id} className={styles.bannerItem}>
                  <div className={styles.bannerPreview}>
                    {b.imageUrl ? <span style={{backgroundImage: `url(${b.imageUrl})`, backgroundSize: 'cover', width: '100%', height: '100%'}} role="img" aria-label={b.title || 'Banner'} /> : <span>No image</span>}
                  </div>
                  <div className={styles.bannerInfo}>
                    <span>{b.title || 'Untitled'}</span>
                    <span className={styles.bannerLink}>{b.linkUrl || 'No link'}</span>
                  </div>
                  <button className={styles.deleteBtn} onClick={() => deleteBanner(b.id).then(loadData)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {banners.length === 0 && <p className={styles.emptyMsg}>Chưa có banner nào.</p>}
            </div>
          )}

          {/* Testimonials Tab */}
          {activeTab === 'testimonials' && (
            <div className={styles.configSection}>
              <p className={styles.tabHint}>Quản lý nhận xét hiển thị trên trang chủ.</p>
              {testimonials.map(t => (
                <div key={t.id} className={styles.testimonialItem}>
                  <div className={styles.testInfo}>
                    <strong>{t.name}</strong>
                    <span className={styles.testRole}>{t.role} — {t.company}</span>
                    <p className={styles.testContent}>&ldquo;{t.content}&rdquo;</p>
                  </div>
                  <Badge variant={t.isActive ? 'success' : 'default'}>{t.isActive ? 'Active' : 'Hidden'}</Badge>
                  <button className={styles.deleteBtn} onClick={() => deleteTestimonial(t.id).then(loadData)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {testimonials.length === 0 && <p className={styles.emptyMsg}>Chưa có nhận xét nào.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
