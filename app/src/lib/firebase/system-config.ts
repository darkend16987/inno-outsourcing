import {
  collection, doc, getDoc, setDoc, updateDoc,
  getDocs, deleteDoc, serverTimestamp, orderBy, query
} from 'firebase/firestore';
import { db, firebaseInitialized } from './config';

// =====================
// SYSTEM CONFIGURATION
// =====================

export interface SystemConfigItem {
  id: string;
  label: string;
  order: number;
  icon?: string;
  color?: string;
  description?: string;
  isActive: boolean;
}

export interface BannerItem {
  id: string;
  imageUrl: string;
  linkUrl?: string;
  title?: string;
  isActive: boolean;
  order: number;
  createdAt?: Date;
}

export interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  company: string;
  avatarUrl: string;
  content: string;
  rating: number;
  isActive: boolean;
  order: number;
}

export type ConfigCategory =
  | 'specialties'
  | 'software'
  | 'levels'
  | 'job_types'
  | 'building_types'
  | 'job_tags';

const CONFIG_COLLECTION = 'system_config';
const BANNERS_COLLECTION = 'banners';
const TESTIMONIALS_COLLECTION = 'testimonials';

// =====================
// CONFIG ITEMS CRUD
// =====================

/**
 * Get all items for a config category
 */
export const getConfigItems = async (category: ConfigCategory): Promise<SystemConfigItem[]> => {
  if (!firebaseInitialized) throw new Error('Firebase chưa được khởi tạo. Vui lòng kiểm tra cấu hình.');
  const docRef = doc(db, CONFIG_COLLECTION, category);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return getDefaultConfig(category);
  const data = snap.data();
  return (data.items || []) as SystemConfigItem[];
};

/**
 * Save all items for a config category
 */
export const saveConfigItems = async (category: ConfigCategory, items: SystemConfigItem[]) => {
  if (!firebaseInitialized) throw new Error('Firebase chưa được khởi tạo. Vui lòng kiểm tra cấu hình.');
  const docRef = doc(db, CONFIG_COLLECTION, category);
  // Strip undefined values from each item — Firestore rejects undefined
  const cleanItems = items.map(item => {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(item)) {
      if (value !== undefined) {
        clean[key] = value;
      }
    }
    return clean;
  });
  await setDoc(docRef, {
    items: cleanItems,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

/**
 * Add a single item to a config category
 */
export const addConfigItem = async (category: ConfigCategory, item: Omit<SystemConfigItem, 'id' | 'order'>) => {
  if (!firebaseInitialized) throw new Error('Firebase chưa được khởi tạo. Vui lòng kiểm tra cấu hình.');
  const existing = await getConfigItems(category);
  const newItem: SystemConfigItem = {
    ...item,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    order: existing.length,
    isActive: item.isActive ?? true,
  };
  existing.push(newItem);
  await saveConfigItems(category, existing);
  return newItem;
};

/**
 * Update a single item in a config category
 */
export const updateConfigItem = async (category: ConfigCategory, itemId: string, updates: Partial<SystemConfigItem>) => {
  if (!firebaseInitialized) throw new Error('Firebase chưa được khởi tạo. Vui lòng kiểm tra cấu hình.');
  const items = await getConfigItems(category);
  const idx = items.findIndex(i => i.id === itemId);
  if (idx === -1) throw new Error(`Không tìm thấy mục với ID: ${itemId}`);
  items[idx] = { ...items[idx], ...updates };
  await saveConfigItems(category, items);
};

/**
 * Delete a single item from a config category
 */
export const deleteConfigItem = async (category: ConfigCategory, itemId: string) => {
  if (!firebaseInitialized) throw new Error('Firebase chưa được khởi tạo. Vui lòng kiểm tra cấu hình.');
  const items = await getConfigItems(category);
  const filtered = items.filter(i => i.id !== itemId);
  // Reorder
  filtered.forEach((item, idx) => { item.order = idx; });
  await saveConfigItems(category, filtered);
};

/**
 * Reorder items within a config category
 */
export const reorderConfigItems = async (category: ConfigCategory, itemIds: string[]) => {
  if (!firebaseInitialized) throw new Error('Firebase chưa được khởi tạo. Vui lòng kiểm tra cấu hình.');
  const items = await getConfigItems(category);
  const reordered: SystemConfigItem[] = [];
  itemIds.forEach((id, idx) => {
    const item = items.find(i => i.id === id);
    if (item) {
      item.order = idx;
      reordered.push(item);
    }
  });
  await saveConfigItems(category, reordered);
};

// =====================
// BANNERS CRUD
// =====================

export const getBanners = async (): Promise<BannerItem[]> => {
  if (!firebaseInitialized) throw new Error('Firebase chưa được khởi tạo. Vui lòng kiểm tra cấu hình.');
  const q = query(collection(db, BANNERS_COLLECTION), orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BannerItem));
};

export const saveBanner = async (banner: Omit<BannerItem, 'id' | 'createdAt'>): Promise<string> => {
  if (!firebaseInitialized) throw new Error('Firebase chưa được khởi tạo. Vui lòng kiểm tra cấu hình.');
  const docRef = doc(collection(db, BANNERS_COLLECTION));
  await setDoc(docRef, { ...banner, createdAt: serverTimestamp() });
  return docRef.id;
};

export const updateBanner = async (id: string, data: Partial<BannerItem>) => {
  if (!firebaseInitialized) throw new Error('Firebase chưa được khởi tạo. Vui lòng kiểm tra cấu hình.');
  await updateDoc(doc(db, BANNERS_COLLECTION, id), data);
};

export const deleteBanner = async (id: string) => {
  if (!firebaseInitialized) throw new Error('Firebase chưa được khởi tạo. Vui lòng kiểm tra cấu hình.');
  await deleteDoc(doc(db, BANNERS_COLLECTION, id));
};

// =====================
// TESTIMONIALS CRUD
// =====================

export const getTestimonials = async (): Promise<TestimonialItem[]> => {
  if (!firebaseInitialized) throw new Error('Firebase chưa được khởi tạo. Vui lòng kiểm tra cấu hình.');
  const q = query(collection(db, TESTIMONIALS_COLLECTION), orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return getDefaultTestimonials();
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TestimonialItem));
};

export const saveTestimonial = async (item: Omit<TestimonialItem, 'id'>): Promise<string> => {
  if (!firebaseInitialized) throw new Error('Firebase chưa được khởi tạo. Vui lòng kiểm tra cấu hình.');
  const docRef = doc(collection(db, TESTIMONIALS_COLLECTION));
  await setDoc(docRef, item);
  return docRef.id;
};

export const updateTestimonial = async (id: string, data: Partial<TestimonialItem>) => {
  if (!firebaseInitialized) throw new Error('Firebase chưa được khởi tạo. Vui lòng kiểm tra cấu hình.');
  await updateDoc(doc(db, TESTIMONIALS_COLLECTION, id), data);
};

export const deleteTestimonial = async (id: string) => {
  if (!firebaseInitialized) throw new Error('Firebase chưa được khởi tạo. Vui lòng kiểm tra cấu hình.');
  await deleteDoc(doc(db, TESTIMONIALS_COLLECTION, id));
};

// =====================
// DEFAULT DATA
// =====================

function getDefaultConfig(category: ConfigCategory): SystemConfigItem[] {
  const defaults: Record<ConfigCategory, SystemConfigItem[]> = {
    specialties: [
      { id: 'kien_truc', label: 'Kiến trúc', order: 0, color: '#0d7c66', isActive: true },
      { id: 'ket_cau', label: 'Kết cấu', order: 1, color: '#6c5ce7', isActive: true },
      { id: 'mep', label: 'MEP', order: 2, color: '#f49d25', isActive: true },
      { id: 'bim', label: 'BIM', order: 3, color: '#c93b28', isActive: true },
      { id: 'du_toan', label: 'Dự toán', order: 4, color: '#1a8a3e', isActive: true },
      { id: 'giam_sat', label: 'Giám sát', order: 5, color: '#c47a0a', isActive: true },
      { id: 'tham_tra', label: 'Thẩm tra', order: 6, color: '#d63384', isActive: true },
    ],
    software: [
      { id: 'revit', label: 'Revit', order: 0, isActive: true },
      { id: 'autocad', label: 'AutoCAD', order: 1, isActive: true },
      { id: 'navisworks', label: 'Navisworks', order: 2, isActive: true },
      { id: 'tekla', label: 'Tekla', order: 3, isActive: true },
      { id: 'etabs', label: 'ETABS', order: 4, isActive: true },
      { id: 'sap2000', label: 'SAP2000', order: 5, isActive: true },
      { id: 'gxd', label: 'GXD', order: 6, isActive: true },
      { id: 'excel', label: 'Excel', order: 7, isActive: true },
      { id: 'sketchup', label: 'SketchUp', order: 8, isActive: true },
    ],
    levels: [
      { id: 'l1', label: 'L1', order: 0, description: 'Cộng tác viên mới', color: '#1a8a3e', isActive: true },
      { id: 'l2', label: 'L2', order: 1, description: 'Có kinh nghiệm cơ bản', color: '#0d7c66', isActive: true },
      { id: 'l3', label: 'L3', order: 2, description: 'Chuyên nghiệp', color: '#6c5ce7', isActive: true },
      { id: 'l4', label: 'L4', order: 3, description: 'Chuyên gia', color: '#c47a0a', isActive: true },
      { id: 'l5', label: 'L5', order: 4, description: 'Bậc thầy', color: '#c93b28', isActive: true },
    ],
    job_types: [
      { id: 'remote', label: 'Remote', order: 0, isActive: true },
      { id: 'onsite', label: 'On-site', order: 1, isActive: true },
      { id: 'hybrid', label: 'Hybrid', order: 2, isActive: true },
    ],
    building_types: [
      { id: 'van_phong', label: 'Văn phòng', order: 0, isActive: true },
      { id: 'chung_cu', label: 'Chung cư', order: 1, isActive: true },
      { id: 'nha_xuong', label: 'Nhà xưởng', order: 2, isActive: true },
      { id: 'benh_vien', label: 'Bệnh viện', order: 3, isActive: true },
      { id: 'truong_hoc', label: 'Trường học', order: 4, isActive: true },
      { id: 'khach_san', label: 'Khách sạn', order: 5, isActive: true },
      { id: 'dan_dung', label: 'Dân dụng', order: 6, isActive: true },
    ],
    job_tags: [
      { id: 'hot', label: 'HOT', order: 0, color: '#c93b28', isActive: true },
      { id: 'sieu_toc', label: 'Siêu tốc', order: 1, color: '#f49d25', isActive: true },
      { id: 'phu_hop_moi_level', label: 'Phù hợp mọi level', order: 2, color: '#0d7c66', isActive: true },
      { id: 'remote_100', label: 'Remote 100%', order: 3, color: '#6c5ce7', isActive: true },
      { id: 'thuong_hieu_suat', label: 'Thưởng hiệu suất', order: 4, color: '#1a8a3e', isActive: true },
      { id: 'tech_lead', label: 'Tech-lead', order: 5, color: '#d63384', isActive: true },
    ],
  };
  return defaults[category] || [];
}

function getDefaultTestimonials(): TestimonialItem[] {
  return [
    {
      id: 'mock_1',
      name: 'KTS. Nguyễn Hoàng Minh',
      role: 'Trưởng phòng Thiết kế',
      company: 'Công ty CP Kiến trúc ABC',
      avatarUrl: '',
      content: 'VAA JOB giúp tôi tìm được những freelancer chất lượng trong thời gian rất ngắn. Quy trình làm việc chuyên nghiệp, minh bạch và tiết kiệm thời gian đáng kể so với cách truyền thống.',
      rating: 5,
      isActive: true,
      order: 0,
    },
    {
      id: 'mock_2',
      name: 'Trần Bảo Thy',
      role: 'BIM Modeler L4',
      company: 'Freelancer',
      avatarUrl: '',
      content: 'Từ khi tham gia VAA JOB, thu nhập của tôi tăng gấp đôi. Các dự án đa dạng, được thanh toán đúng hạn và có cơ hội học hỏi từ nhiều dự án thực tế khác nhau.',
      rating: 5,
      isActive: true,
      order: 1,
    },
    {
      id: 'mock_3',
      name: 'Lê Minh Thảo',
      role: 'Giám đốc Kỹ thuật',
      company: 'Tập đoàn Xây dựng XYZ',
      avatarUrl: '',
      content: 'Hệ thống quản lý tiến độ và nghiệm thu trên VAA JOB rất trực quan. Tôi có thể theo dõi mọi thứ từ một dashboard duy nhất, tiết kiệm rất nhiều công sức điều phối.',
      rating: 5,
      isActive: true,
      order: 2,
    },
    {
      id: 'mock_4',
      name: 'Phạm Đức Anh',
      role: 'Kỹ sư Kết cấu L3',
      company: 'Freelancer',
      avatarUrl: '',
      content: 'Cái tôi thích nhất ở VAA JOB là sự minh bạch. Từ bảng giá, tiến độ đến thanh toán — mọi thứ đều rõ ràng. Không còn phải lo lắng về chuyện "chạy deadline mà không được trả tiền".',
      rating: 4,
      isActive: true,
      order: 3,
    },
  ];
}

// =====================
// GLOBAL SETTINGS (key-value pairs)
// =====================

export interface GlobalSettings {
  max_concurrent_jobs_warning: number;
  [key: string]: unknown;
}

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  max_concurrent_jobs_warning: 3,
};

/**
 * Get global settings
 */
export const getGlobalSettings = async (): Promise<GlobalSettings> => {
  if (!firebaseInitialized) throw new Error('Firebase chưa được khởi tạo. Vui lòng kiểm tra cấu hình.');
  const snap = await getDoc(doc(db, CONFIG_COLLECTION, 'global_settings'));
  if (!snap.exists()) return DEFAULT_GLOBAL_SETTINGS;
  return { ...DEFAULT_GLOBAL_SETTINGS, ...snap.data() } as GlobalSettings;
};

/**
 * Save global settings (merge)
 */
export const saveGlobalSettings = async (settings: Partial<GlobalSettings>): Promise<void> => {
  if (!firebaseInitialized) throw new Error('Firebase chưa được khởi tạo. Vui lòng kiểm tra cấu hình.');
  await setDoc(doc(db, CONFIG_COLLECTION, 'global_settings'), {
    ...settings,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};
