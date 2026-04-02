/**
 * seed-data.ts
 * 
 * Seed script to populate Firestore with 20 realistic test jobs,
 * test users (jobmasters & freelancers), testimonials, and leaderboard data.
 * 
 * Run: npx tsx scripts/seed-data.ts
 * 
 * Requires: GOOGLE_APPLICATION_CREDENTIALS env var pointing to Firebase service account JSON
 * or running `firebase login` with the Firebase CLI and using the emulator/admin SDK.
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin
// Requires: gcloud auth application-default login  OR  GOOGLE_APPLICATION_CREDENTIALS env
if (getApps().length === 0) {
  initializeApp({ projectId: 'vaa-job' });
}

const db = getFirestore();

// =====================
// TEST USERS
// =====================

const TEST_USERS = [
  // Jobmasters
  {
    uid: 'jm_nguyen_hoang',
    email: 'hoang.nguyen@vaajob.vn',
    displayName: 'Nguyễn Hoàng',
    phone: '0901234567',
    role: 'jobmaster',
    status: 'active',
    specialties: ['Kiến trúc', 'BIM'],
    experience: 12,
    software: ['Revit', 'AutoCAD'],
    selfAssessedLevel: 'L5',
    currentLevel: 'L5',
    bio: 'Trưởng phòng Thiết kế - 12 năm kinh nghiệm quản lý dự án xây dựng',
    kycCompleted: true,
    photoURL: '',
    stats: { completedJobs: 45, totalEarnings: 0, avgRating: 4.8, ratingCount: 38, onTimeRate: 95, currentMonthEarnings: 0 },
  },
  {
    uid: 'jm_le_minh_tuan',
    email: 'tuan.le@vaajob.vn',
    displayName: 'Lê Minh Tuấn',
    phone: '0912345678',
    role: 'jobmaster',
    status: 'active',
    specialties: ['Kết cấu', 'MEP'],
    experience: 8,
    software: ['ETABS', 'SAP2000', 'Revit'],
    selfAssessedLevel: 'L4',
    currentLevel: 'L4',
    bio: 'Kỹ sư trưởng kết cấu tại tập đoàn xây dựng HPC',
    kycCompleted: true,
    photoURL: '',
    stats: { completedJobs: 30, totalEarnings: 0, avgRating: 4.6, ratingCount: 25, onTimeRate: 92, currentMonthEarnings: 0 },
  },

  // Freelancers
  {
    uid: 'fl_tran_bao_thy',
    email: 'thy.tran@gmail.com',
    displayName: 'Trần Bảo Thy',
    phone: '0923456789',
    role: 'freelancer',
    status: 'active',
    specialties: ['BIM', 'Kiến trúc'],
    experience: 5,
    software: ['Revit', 'Navisworks', 'AutoCAD'],
    selfAssessedLevel: 'L4',
    currentLevel: 'L4',
    bio: 'BIM Modeler chuyên nghiệp - 5 năm kinh nghiệm mô hình hóa BIM cho các dự án cao tầng',
    kycCompleted: true,
    photoURL: '',
    stats: { completedJobs: 28, totalEarnings: 420_000_000, avgRating: 4.9, ratingCount: 25, onTimeRate: 98, currentMonthEarnings: 35_000_000 },
  },
  {
    uid: 'fl_pham_duc_anh',
    email: 'anh.pham@gmail.com',
    displayName: 'Phạm Đức Anh',
    phone: '0934567890',
    role: 'freelancer',
    status: 'active',
    specialties: ['Kết cấu'],
    experience: 7,
    software: ['ETABS', 'SAP2000', 'AutoCAD', 'Excel'],
    selfAssessedLevel: 'L3',
    currentLevel: 'L3',
    bio: 'Kỹ sư kết cấu - chuyên thiết kế kết cấu nhà cao tầng và công trình công nghiệp',
    kycCompleted: true,
    photoURL: '',
    stats: { completedJobs: 22, totalEarnings: 330_000_000, avgRating: 4.7, ratingCount: 20, onTimeRate: 95, currentMonthEarnings: 28_000_000 },
  },
  {
    uid: 'fl_vo_minh_hieu',
    email: 'hieu.vo@gmail.com',
    displayName: 'Võ Minh Hiếu',
    phone: '0945678901',
    role: 'freelancer',
    status: 'active',
    specialties: ['MEP'],
    experience: 6,
    software: ['Revit', 'AutoCAD'],
    selfAssessedLevel: 'L3',
    currentLevel: 'L3',
    bio: 'Kỹ sư MEP - Thiết kế hệ thống HVAC, cấp thoát nước, điện cho công trình dân dụng',
    kycCompleted: true,
    photoURL: '',
    stats: { completedJobs: 18, totalEarnings: 270_000_000, avgRating: 4.5, ratingCount: 16, onTimeRate: 90, currentMonthEarnings: 22_000_000 },
  },
  {
    uid: 'fl_nguyen_thu_ha',
    email: 'ha.nguyen@gmail.com',
    displayName: 'Nguyễn Thu Hà',
    phone: '0956789012',
    role: 'freelancer',
    status: 'active',
    specialties: ['Dự toán'],
    experience: 4,
    software: ['GXD', 'Excel', 'AutoCAD'],
    selfAssessedLevel: 'L2',
    currentLevel: 'L2',
    bio: 'Chuyên viên dự toán - Lập dự toán, bóc tách khối lượng công trình dân dụng và công nghiệp',
    kycCompleted: true,
    photoURL: '',
    stats: { completedJobs: 15, totalEarnings: 180_000_000, avgRating: 4.6, ratingCount: 13, onTimeRate: 93, currentMonthEarnings: 15_000_000 },
  },
  {
    uid: 'fl_hoang_van_nam',
    email: 'nam.hoang@gmail.com',
    displayName: 'Hoàng Văn Nam',
    phone: '0967890123',
    role: 'freelancer',
    status: 'active',
    specialties: ['Kiến trúc', 'Giám sát'],
    experience: 10,
    software: ['AutoCAD', 'SketchUp', 'Revit'],
    selfAssessedLevel: 'L5',
    currentLevel: 'L5',
    bio: 'KTS trưởng - 10 năm kinh nghiệm thiết kế kiến trúc nhà ở, biệt thự và resort',
    kycCompleted: true,
    photoURL: '',
    stats: { completedJobs: 35, totalEarnings: 580_000_000, avgRating: 4.8, ratingCount: 32, onTimeRate: 97, currentMonthEarnings: 45_000_000 },
  },
  {
    uid: 'fl_dao_thanh_long',
    email: 'long.dao@gmail.com',
    displayName: 'Đào Thanh Long',
    phone: '0978901234',
    role: 'freelancer',
    status: 'active',
    specialties: ['Thẩm tra', 'Kết cấu'],
    experience: 8,
    software: ['ETABS', 'SAP2000', 'AutoCAD'],
    selfAssessedLevel: 'L4',
    currentLevel: 'L4',
    bio: 'Chuyên gia thẩm tra - Thẩm tra thiết kế kết cấu cho các công trình phức tạp',
    kycCompleted: true,
    photoURL: '',
    stats: { completedJobs: 20, totalEarnings: 350_000_000, avgRating: 4.7, ratingCount: 18, onTimeRate: 94, currentMonthEarnings: 30_000_000 },
  },
];

// =====================
// 20 TEST JOBS
// =====================

function futureDate(daysFromNow: number): Timestamp {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return Timestamp.fromDate(d);
}

function pastDate(daysAgo: number): Timestamp {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return Timestamp.fromDate(d);
}

const JOBS = [
  // OPEN / PENDING JOBS (Not assigned)
  {
    title: 'Thiết kế kiến trúc Biệt thự nghỉ dưỡng Phú Quốc - 3 tầng',
    description: 'Thiết kế kiến trúc biệt thự nghỉ dưỡng 3 tầng tại Phú Quốc. Diện tích đất 500m2, diện tích xây dựng dự kiến 250m2. Phong cách Tropical Modern. Yêu cầu hồ sơ bản vẽ autocad chi tiết kèm phối cảnh 3D.',
    category: 'Kiến trúc',
    subcategory: 'Nhà ở',
    projectType: 'Biệt thự',
    workMode: 'remote',
    level: 'L3',
    totalFee: 85_000_000,
    maxFeeLimit: 100_000_000,
    currency: 'VND',
    duration: 45,
    deadline: futureDate(50),
    paymentType: 'milestone',
    milestones: [
      { id: 'ms1', name: 'Phương án sơ bộ', percentage: 30, amount: 25_500_000, status: 'pending', condition: 'Nộp 3 phương án mặt bằng' },
      { id: 'ms2', name: 'Thiết kế chi tiết', percentage: 50, amount: 42_500_000, status: 'pending', condition: 'Bộ hồ sơ bản vẽ hoàn chỉnh' },
      { id: 'ms3', name: 'Phối cảnh 3D', percentage: 20, amount: 17_000_000, status: 'pending', condition: 'Render 8 góc phối cảnh' },
    ],
    requirements: { requiredLevel: 'L3', requiredSoftware: ['AutoCAD', 'SketchUp', 'Revit'], preferredSpecialties: ['Kiến trúc'] },
    checklist: [],
    attachments: [],
    status: 'pending_approval',
    progress: 0,
    assignedTo: null,
    createdBy: 'jm_nguyen_hoang',
    jobMaster: 'jm_nguyen_hoang',
    jobMasterName: 'Nguyễn Hoàng',
    searchKeywords: ['biệt thự', 'phú quốc', 'kiến trúc', 'tropical'],
    isPublic: true,
    highlightTags: ['HOT'],
  },
  {
    title: 'Tính toán kết cấu chung cư 25 tầng - Q2 HCM',
    description: 'Tính toán và thiết kế kết cấu cho tòa chung cư 25 tầng tại Quận 2, TP.HCM. Sàn BTCT, khung cột vách, móng cọc nhồi. Yêu cầu mô hình ETABS/SAP2000 và bộ bản vẽ kết cấu chi tiết.',
    category: 'Kết cấu',
    subcategory: 'Nhà cao tầng',
    projectType: 'Chung cư',
    workMode: 'remote',
    level: 'L4',
    totalFee: 150_000_000,
    maxFeeLimit: 180_000_000,
    currency: 'VND',
    duration: 90,
    deadline: futureDate(95),
    paymentType: 'milestone',
    milestones: [
      { id: 'ms1', name: 'Mô hình tính toán', percentage: 30, amount: 45_000_000, status: 'pending', condition: 'Mô hình ETABS hoàn chỉnh + Note tính' },
      { id: 'ms2', name: 'Bản vẽ móng & hầm', percentage: 25, amount: 37_500_000, status: 'pending', condition: 'Bản vẽ chi tiết móng + tầng hầm' },
      { id: 'ms3', name: 'Bản vẽ thân', percentage: 30, amount: 45_000_000, status: 'pending', condition: 'Bản vẽ kết cấu tầng điển hình + đặc biệt' },
      { id: 'ms4', name: 'Review & chỉnh sửa', percentage: 15, amount: 22_500_000, status: 'pending', condition: 'Hoàn thiện sau review' },
    ],
    requirements: { requiredLevel: 'L4', requiredSoftware: ['ETABS', 'SAP2000', 'AutoCAD'], preferredSpecialties: ['Kết cấu'] },
    checklist: [],
    attachments: [],
    status: 'pending_approval',
    progress: 0,
    assignedTo: null,
    createdBy: 'jm_le_minh_tuan',
    jobMaster: 'jm_le_minh_tuan',
    jobMasterName: 'Lê Minh Tuấn',
    searchKeywords: ['kết cấu', 'chung cư', 'cao tầng', 'etabs'],
    isPublic: true,
    highlightTags: ['HOT', 'Siêu tốc'],
  },
  {
    title: 'Thiết kế MEP Bệnh viện Đa khoa 500 giường - Giai đoạn 2',
    description: 'Thiết kế hệ thống MEP (HVAC, cấp thoát nước, PCCC, điện) cho Bệnh viện Đa khoa 500 giường. Giai đoạn 2 bao gồm các tầng 5-10 và khu kỹ thuật. Yêu cầu mô hình Revit MEP.',
    category: 'MEP',
    subcategory: 'Bệnh viện',
    projectType: 'Bệnh viện',
    workMode: 'hybrid',
    level: 'L4',
    totalFee: 200_000_000,
    maxFeeLimit: 230_000_000,
    currency: 'VND',
    duration: 120,
    deadline: futureDate(125),
    paymentType: 'milestone',
    milestones: [
      { id: 'ms1', name: 'HVAC', percentage: 35, amount: 70_000_000, status: 'pending', condition: 'Thiết kế hệ thống HVAC hoàn chỉnh' },
      { id: 'ms2', name: 'Cấp thoát nước & PCCC', percentage: 30, amount: 60_000_000, status: 'pending', condition: 'Hệ thống cấp thoát nước + PCCC' },
      { id: 'ms3', name: 'Hệ thống điện', percentage: 25, amount: 50_000_000, status: 'pending', condition: 'Thiết kế hệ thống điện' },
      { id: 'ms4', name: 'Phối hợp & clash detection', percentage: 10, amount: 20_000_000, status: 'pending', condition: 'Phối hợp liên ngành' },
    ],
    requirements: { requiredLevel: 'L4', requiredSoftware: ['Revit', 'AutoCAD', 'Navisworks'], preferredSpecialties: ['MEP'] },
    checklist: [],
    attachments: [],
    status: 'pending_approval',
    progress: 0,
    assignedTo: null,
    createdBy: 'jm_le_minh_tuan',
    jobMaster: 'jm_le_minh_tuan',
    jobMasterName: 'Lê Minh Tuấn',
    searchKeywords: ['mep', 'bệnh viện', 'hvac', 'pccc'],
    isPublic: true,
    highlightTags: [],
  },
  {
    title: 'Mô hình BIM 3D Tòa văn phòng 18 tầng - Revit',
    description: 'Tạo mô hình BIM 3D LOD 300 cho tòa văn phòng 18 tầng tại quận Cầu Giấy, Hà Nội. Bao gồm kiến trúc, kết cấu, MEP. Clash detection và xuất shop drawing.',
    category: 'BIM',
    subcategory: 'Văn phòng',
    projectType: 'Văn phòng',
    workMode: 'remote',
    level: 'L3',
    totalFee: 120_000_000,
    maxFeeLimit: 140_000_000,
    currency: 'VND',
    duration: 60,
    deadline: futureDate(65),
    paymentType: 'milestone',
    milestones: [
      { id: 'ms1', name: 'Mô hình Kiến trúc', percentage: 35, amount: 42_000_000, status: 'pending' },
      { id: 'ms2', name: 'Mô hình Kết cấu', percentage: 30, amount: 36_000_000, status: 'pending' },
      { id: 'ms3', name: 'Mô hình MEP', percentage: 25, amount: 30_000_000, status: 'pending' },
      { id: 'ms4', name: 'Clash & Shop drawing', percentage: 10, amount: 12_000_000, status: 'pending' },
    ],
    requirements: { requiredLevel: 'L3', requiredSoftware: ['Revit', 'Navisworks'], preferredSpecialties: ['BIM'] },
    checklist: [],
    attachments: [],
    status: 'pending_approval',
    progress: 0,
    assignedTo: null,
    createdBy: 'jm_nguyen_hoang',
    jobMaster: 'jm_nguyen_hoang',
    jobMasterName: 'Nguyễn Hoàng',
    searchKeywords: ['bim', 'revit', 'văn phòng', 'mô hình 3d'],
    isPublic: true,
    highlightTags: ['Remote 100%'],
  },
  {
    title: 'Lập dự toán Nhà xưởng công nghiệp 5,000m2',
    description: 'Lập dự toán chi tiết cho nhà xưởng công nghiệp diện tích 5,000m2 tại KCN Long Thành, Đồng Nai. Kết cấu thép, mái tôn, nền bê tông. Yêu cầu dự toán theo định mức nhà nước.',
    category: 'Dự toán',
    subcategory: 'Công nghiệp',
    projectType: 'Nhà xưởng',
    workMode: 'remote',
    level: 'L2',
    totalFee: 35_000_000,
    maxFeeLimit: 42_000_000,
    currency: 'VND',
    duration: 21,
    deadline: futureDate(25),
    paymentType: 'milestone',
    milestones: [
      { id: 'ms1', name: 'Bóc tách khối lượng', percentage: 40, amount: 14_000_000, status: 'pending' },
      { id: 'ms2', name: 'Lập dự toán chi tiết', percentage: 40, amount: 14_000_000, status: 'pending' },
      { id: 'ms3', name: 'Review & hoàn thiện', percentage: 20, amount: 7_000_000, status: 'pending' },
    ],
    requirements: { requiredLevel: 'L2', requiredSoftware: ['GXD', 'Excel'], preferredSpecialties: ['Dự toán'] },
    checklist: [],
    attachments: [],
    status: 'pending_approval',
    progress: 0,
    assignedTo: null,
    createdBy: 'jm_nguyen_hoang',
    jobMaster: 'jm_nguyen_hoang',
    jobMasterName: 'Nguyễn Hoàng',
    searchKeywords: ['dự toán', 'nhà xưởng', 'công nghiệp'],
    isPublic: true,
    highlightTags: ['Phù hợp mọi level'],
  },
  {
    title: 'Giám sát thi công Chung cư mini 9 tầng - Thanh Xuân',
    description: 'Giám sát thi công phần thô (móng, khung, sàn) cho chung cư mini 9 tầng tại Thanh Xuân, Hà Nội. Yêu cầu có mặt tại công trường 3 buổi/tuần.',
    category: 'Giám sát',
    subcategory: 'Nhà cao tầng',
    projectType: 'Chung cư',
    workMode: 'onsite',
    level: 'L3',
    totalFee: 60_000_000,
    maxFeeLimit: 70_000_000,
    currency: 'VND',
    duration: 180,
    deadline: futureDate(185),
    paymentType: 'milestone',
    milestones: [
      { id: 'ms1', name: 'Giai đoạn móng', percentage: 25, amount: 15_000_000, status: 'pending' },
      { id: 'ms2', name: 'Giai đoạn thân', percentage: 50, amount: 30_000_000, status: 'pending' },
      { id: 'ms3', name: 'Giai đoạn hoàn thiện', percentage: 25, amount: 15_000_000, status: 'pending' },
    ],
    requirements: { requiredLevel: 'L3', requiredSoftware: ['AutoCAD'], preferredSpecialties: ['Giám sát'] },
    checklist: [],
    attachments: [],
    status: 'pending_approval',
    progress: 0,
    assignedTo: null,
    createdBy: 'jm_le_minh_tuan',
    jobMaster: 'jm_le_minh_tuan',
    jobMasterName: 'Lê Minh Tuấn',
    searchKeywords: ['giám sát', 'thi công', 'chung cư'],
    isPublic: true,
    highlightTags: [],
  },
  {
    title: 'Thẩm tra thiết kế kết cấu Khách sạn 5 sao Đà Nẵng',
    description: 'Thẩm tra hồ sơ thiết kế kết cấu khách sạn 5 sao 20 tầng tại Đà Nẵng. Kiểm tra mô hình tính toán ETABS, kiểm tra bản vẽ kết cấu, lập báo cáo thẩm tra.',
    category: 'Thẩm tra',
    subcategory: 'Khách sạn',
    projectType: 'Khách sạn',
    workMode: 'remote',
    level: 'L4',
    totalFee: 80_000_000,
    maxFeeLimit: 95_000_000,
    currency: 'VND',
    duration: 30,
    deadline: futureDate(35),
    paymentType: 'milestone',
    milestones: [
      { id: 'ms1', name: 'Thẩm tra mô hình', percentage: 40, amount: 32_000_000, status: 'pending' },
      { id: 'ms2', name: 'Thẩm tra bản vẽ', percentage: 35, amount: 28_000_000, status: 'pending' },
      { id: 'ms3', name: 'Báo cáo tổng hợp', percentage: 25, amount: 20_000_000, status: 'pending' },
    ],
    requirements: { requiredLevel: 'L4', requiredSoftware: ['ETABS', 'AutoCAD'], preferredSpecialties: ['Thẩm tra'] },
    checklist: [],
    attachments: [],
    status: 'pending_approval',
    progress: 0,
    assignedTo: null,
    createdBy: 'jm_nguyen_hoang',
    jobMaster: 'jm_nguyen_hoang',
    jobMasterName: 'Nguyễn Hoàng',
    searchKeywords: ['thẩm tra', 'kết cấu', 'khách sạn', 'đà nẵng'],
    isPublic: true,
    highlightTags: ['Siêu tốc'],
  },

  // IN_PROGRESS JOBS (Assigned)
  {
    title: 'Thiết kế kiến trúc Trường học Quốc tế - Bình Dương',
    description: 'Thiết kế kiến trúc trường học quốc tế 4 tầng tại Bình Dương. Gồm khối học tập, phòng lab, thư viện, nhà thi đấu. Phong cách hiện đại, thân thiện với trẻ em.',
    category: 'Kiến trúc',
    subcategory: 'Trường học',
    projectType: 'Trường học',
    workMode: 'remote',
    level: 'L4',
    totalFee: 180_000_000,
    maxFeeLimit: 200_000_000,
    currency: 'VND',
    duration: 75,
    deadline: futureDate(30),
    paymentType: 'milestone',
    milestones: [
      { id: 'ms1', name: 'Phương án thiết kế', percentage: 25, amount: 45_000_000, status: 'released' },
      { id: 'ms2', name: 'Bản vẽ chi tiết', percentage: 40, amount: 72_000_000, status: 'in_progress' },
      { id: 'ms3', name: 'Phối cảnh & Hồ sơ', percentage: 35, amount: 63_000_000, status: 'pending' },
    ],
    requirements: { requiredLevel: 'L4', requiredSoftware: ['AutoCAD', 'SketchUp', 'Revit'], preferredSpecialties: ['Kiến trúc'] },
    checklist: [],
    attachments: [],
    status: 'in_progress',
    progress: 35,
    assignedTo: 'fl_hoang_van_nam',
    assignedWorkerName: 'Hoàng Văn Nam',
    createdBy: 'jm_nguyen_hoang',
    jobMaster: 'jm_nguyen_hoang',
    jobMasterName: 'Nguyễn Hoàng',
    searchKeywords: ['kiến trúc', 'trường học', 'quốc tế'],
    isPublic: true,
    highlightTags: [],
    escrowStatus: 'partially_released',
  },
  {
    title: 'Kết cấu Nhà xưởng thép 12,000m2 - KCN Bắc Ninh',
    description: 'Thiết kế kết cấu nhà xưởng thép tiền chế 12,000m2 tại KCN Bắc Ninh. Khẩu độ 30m, không cột giữa. Bao gồm tính toán nền móng và bản vẽ shop drawing.',
    category: 'Kết cấu',
    subcategory: 'Công nghiệp',
    projectType: 'Nhà xưởng',
    workMode: 'remote',
    level: 'L3',
    totalFee: 95_000_000,
    maxFeeLimit: 110_000_000,
    currency: 'VND',
    duration: 45,
    deadline: futureDate(15),
    paymentType: 'milestone',
    milestones: [
      { id: 'ms1', name: 'Tính toán khung chính', percentage: 35, amount: 33_250_000, status: 'released' },
      { id: 'ms2', name: 'Thiết kế móng', percentage: 25, amount: 23_750_000, status: 'review' },
      { id: 'ms3', name: 'Shop drawing', percentage: 40, amount: 38_000_000, status: 'pending' },
    ],
    requirements: { requiredLevel: 'L3', requiredSoftware: ['Tekla', 'AutoCAD', 'SAP2000'], preferredSpecialties: ['Kết cấu'] },
    checklist: [],
    attachments: [],
    status: 'in_progress',
    progress: 55,
    assignedTo: 'fl_pham_duc_anh',
    assignedWorkerName: 'Phạm Đức Anh',
    createdBy: 'jm_le_minh_tuan',
    jobMaster: 'jm_le_minh_tuan',
    jobMasterName: 'Lê Minh Tuấn',
    searchKeywords: ['kết cấu', 'nhà xưởng', 'thép', 'bắc ninh'],
    isPublic: true,
    highlightTags: ['Siêu tốc'],
    escrowStatus: 'partially_released',
  },
  {
    title: 'BIM Coordination Dự án Khu đô thị The Garden - Phase 1',
    description: 'Phối hợp BIM cho Phase 1 dự án khu đô thị The Garden. Bao gồm clash detection, model federation, và xuất báo cáo coordination. 5 tòa nhà.',
    category: 'BIM',
    subcategory: 'Khu đô thị',
    projectType: 'Khu đô thị',
    workMode: 'hybrid',
    level: 'L4',
    totalFee: 250_000_000,
    maxFeeLimit: 280_000_000,
    currency: 'VND',
    duration: 120,
    deadline: futureDate(60),
    paymentType: 'milestone',
    milestones: [
      { id: 'ms1', name: 'Model Federation Tòa A-B', percentage: 25, amount: 62_500_000, status: 'released' },
      { id: 'ms2', name: 'Model Federation Tòa C-D-E', percentage: 25, amount: 62_500_000, status: 'in_progress' },
      { id: 'ms3', name: 'Clash Detection & Report', percentage: 30, amount: 75_000_000, status: 'pending' },
      { id: 'ms4', name: 'Final coordination', percentage: 20, amount: 50_000_000, status: 'pending' },
    ],
    requirements: { requiredLevel: 'L4', requiredSoftware: ['Revit', 'Navisworks'], preferredSpecialties: ['BIM'] },
    checklist: [],
    attachments: [],
    status: 'in_progress',
    progress: 40,
    assignedTo: 'fl_tran_bao_thy',
    assignedWorkerName: 'Trần Bảo Thy',
    createdBy: 'jm_nguyen_hoang',
    jobMaster: 'jm_nguyen_hoang',
    jobMasterName: 'Nguyễn Hoàng',
    searchKeywords: ['bim', 'coordination', 'khu đô thị'],
    isPublic: true,
    highlightTags: ['Thưởng hiệu suất'],
    escrowStatus: 'partially_released',
  },
  {
    title: 'Thiết kế MEP Nhà máy sản xuất thiết bị y tế',
    description: 'Thiết kế hệ thống MEP cho nhà máy sản xuất thiết bị y tế tại KCN VSIP Bình Dương. Yêu cầu tiêu chuẩn phòng sạch Class 10,000.',
    category: 'MEP',
    subcategory: 'Công nghiệp',
    projectType: 'Nhà máy',
    workMode: 'remote',
    level: 'L3',
    totalFee: 110_000_000,
    maxFeeLimit: 130_000_000,
    currency: 'VND',
    duration: 60,
    deadline: futureDate(25),
    paymentType: 'milestone',
    milestones: [
      { id: 'ms1', name: 'HVAC & Clean Room', percentage: 40, amount: 44_000_000, status: 'released' },
      { id: 'ms2', name: 'Cấp thoát nước', percentage: 25, amount: 27_500_000, status: 'in_progress' },
      { id: 'ms3', name: 'Điện & PCCC', percentage: 35, amount: 38_500_000, status: 'pending' },
    ],
    requirements: { requiredLevel: 'L3', requiredSoftware: ['Revit', 'AutoCAD'], preferredSpecialties: ['MEP'] },
    checklist: [],
    attachments: [],
    status: 'in_progress',
    progress: 50,
    assignedTo: 'fl_vo_minh_hieu',
    assignedWorkerName: 'Võ Minh Hiếu',
    createdBy: 'jm_le_minh_tuan',
    jobMaster: 'jm_le_minh_tuan',
    jobMasterName: 'Lê Minh Tuấn',
    searchKeywords: ['mep', 'nhà máy', 'phòng sạch'],
    isPublic: true,
    highlightTags: [],
    escrowStatus: 'partially_released',
  },

  // MORE OPEN JOBS
  {
    title: 'Thiết kế nội thất Căn hộ chung cư cao cấp 120m2',
    description: 'Thiết kế nội thất hoàn chỉnh cho căn hộ chung cư 120m2 (3PN + 2WC). Phong cách Scandinavian hiện đại. Yêu cầu bản vẽ triển khai thi công chi tiết.',
    category: 'Kiến trúc',
    subcategory: 'Nội thất',
    projectType: 'Chung cư',
    workMode: 'remote',
    level: 'L2',
    totalFee: 25_000_000,
    maxFeeLimit: 30_000_000,
    currency: 'VND',
    duration: 21,
    deadline: futureDate(25),
    paymentType: 'milestone',
    milestones: [
      { id: 'ms1', name: 'Concept & Layout', percentage: 30, amount: 7_500_000, status: 'pending' },
      { id: 'ms2', name: 'Bản vẽ chi tiết', percentage: 50, amount: 12_500_000, status: 'pending' },
      { id: 'ms3', name: 'BOQ & Render', percentage: 20, amount: 5_000_000, status: 'pending' },
    ],
    requirements: { requiredLevel: 'L2', requiredSoftware: ['AutoCAD', 'SketchUp'], preferredSpecialties: ['Kiến trúc'] },
    checklist: [],
    attachments: [],
    status: 'pending_approval',
    progress: 0,
    assignedTo: null,
    createdBy: 'jm_nguyen_hoang',
    jobMaster: 'jm_nguyen_hoang',
    jobMasterName: 'Nguyễn Hoàng',
    searchKeywords: ['nội thất', 'chung cư', 'scandinavian'],
    isPublic: true,
    highlightTags: ['Phù hợp mọi level'],
  },
  {
    title: 'Lập dự toán Khu dân cư 50 lô - Bà Rịa Vũng Tàu',
    description: 'Bóc tách khối lượng và lập dự toán hạ tầng khu dân cư 50 lô đất tại Bà Rịa Vũng Tàu. Gồm đường giao thông, cấp thoát nước, điện chiếu sáng.',
    category: 'Dự toán',
    subcategory: 'Hạ tầng',
    projectType: 'Khu dân cư',
    workMode: 'remote',
    level: 'L3',
    totalFee: 55_000_000,
    maxFeeLimit: 65_000_000,
    currency: 'VND',
    duration: 30,
    deadline: futureDate(35),
    paymentType: 'milestone',
    milestones: [
      { id: 'ms1', name: 'Bóc tách đường', percentage: 35, amount: 19_250_000, status: 'pending' },
      { id: 'ms2', name: 'Bóc tách hạ tầng kỹ thuật', percentage: 35, amount: 19_250_000, status: 'pending' },
      { id: 'ms3', name: 'Tổng hợp dự toán', percentage: 30, amount: 16_500_000, status: 'pending' },
    ],
    requirements: { requiredLevel: 'L3', requiredSoftware: ['GXD', 'Excel', 'AutoCAD'], preferredSpecialties: ['Dự toán'] },
    checklist: [],
    attachments: [],
    status: 'pending_approval',
    progress: 0,
    assignedTo: null,
    createdBy: 'jm_le_minh_tuan',
    jobMaster: 'jm_le_minh_tuan',
    jobMasterName: 'Lê Minh Tuấn',
    searchKeywords: ['dự toán', 'khu dân cư', 'hạ tầng'],
    isPublic: true,
    highlightTags: [],
  },
  {
    title: 'Scan to BIM - Nhà máy cũ cải tạo tại Long An',
    description: 'Tạo mô hình BIM as-built (LOD 200-300) từ dữ liệu point cloud laser scan cho nhà máy cũ cần cải tạo tại Long An. Diện tích ~8,000m2.',
    category: 'BIM',
    subcategory: 'As-built',
    projectType: 'Nhà máy',
    workMode: 'remote',
    level: 'L3',
    totalFee: 75_000_000,
    maxFeeLimit: 90_000_000,
    currency: 'VND',
    duration: 35,
    deadline: futureDate(40),
    paymentType: 'milestone',
    milestones: [
      { id: 'ms1', name: 'Import & xử lý point cloud', percentage: 20, amount: 15_000_000, status: 'pending' },
      { id: 'ms2', name: 'Mô hình BIM as-built', percentage: 60, amount: 45_000_000, status: 'pending' },
      { id: 'ms3', name: 'QC & Delivery', percentage: 20, amount: 15_000_000, status: 'pending' },
    ],
    requirements: { requiredLevel: 'L3', requiredSoftware: ['Revit', 'Navisworks'], preferredSpecialties: ['BIM'] },
    checklist: [],
    attachments: [],
    status: 'pending_approval',
    progress: 0,
    assignedTo: null,
    createdBy: 'jm_nguyen_hoang',
    jobMaster: 'jm_nguyen_hoang',
    jobMasterName: 'Nguyễn Hoàng',
    searchKeywords: ['bim', 'scan to bim', 'point cloud', 'as-built'],
    isPublic: true,
    highlightTags: ['Tech-lead'],
  },
  {
    title: 'Thiết kế kết cấu Showroom ô tô 2 tầng - Hải Phòng',
    description: 'Thiết kế kết cấu showroom ô tô 2 tầng, khẩu độ lớn, tầng 1 showroom không cột. Kết cấu thép + BTCT. Diện tích sàn ~1,500m2.',
    category: 'Kết cấu',
    subcategory: 'Thương mại',
    projectType: 'Showroom',
    workMode: 'remote',
    level: 'L2',
    totalFee: 40_000_000,
    maxFeeLimit: 48_000_000,
    currency: 'VND',
    duration: 30,
    deadline: futureDate(35),
    paymentType: 'milestone',
    milestones: [
      { id: 'ms1', name: 'Tính toán kết cấu', percentage: 40, amount: 16_000_000, status: 'pending' },
      { id: 'ms2', name: 'Bản vẽ kết cấu', percentage: 40, amount: 16_000_000, status: 'pending' },
      { id: 'ms3', name: 'Review & hoàn thiện', percentage: 20, amount: 8_000_000, status: 'pending' },
    ],
    requirements: { requiredLevel: 'L2', requiredSoftware: ['ETABS', 'AutoCAD'], preferredSpecialties: ['Kết cấu'] },
    checklist: [],
    attachments: [],
    status: 'pending_approval',
    progress: 0,
    assignedTo: null,
    createdBy: 'jm_le_minh_tuan',
    jobMaster: 'jm_le_minh_tuan',
    jobMasterName: 'Lê Minh Tuấn',
    searchKeywords: ['kết cấu', 'showroom', 'thép'],
    isPublic: true,
    highlightTags: [],
  },

  // COMPLETED JOBS
  {
    title: 'Kiến trúc Nhà phố 5 tầng - Quận 7 HCM',
    description: 'Thiết kế kiến trúc nhà phố 5 tầng (4x18m) tại Quận 7, TP.HCM. Tầng 1 gara + shop, tầng 2-4 ở, tầng 5 sân thượng.',
    category: 'Kiến trúc',
    subcategory: 'Nhà phố',
    projectType: 'Nhà phố',
    workMode: 'remote',
    level: 'L2',
    totalFee: 30_000_000,
    currency: 'VND',
    duration: 25,
    deadline: pastDate(5),
    paymentType: 'milestone',
    milestones: [
      { id: 'ms1', name: 'Phương án', percentage: 30, amount: 9_000_000, status: 'released' },
      { id: 'ms2', name: 'Bản vẽ chi tiết', percentage: 50, amount: 15_000_000, status: 'released' },
      { id: 'ms3', name: 'Hồ sơ xin phép', percentage: 20, amount: 6_000_000, status: 'released' },
    ],
    requirements: { requiredLevel: 'L2', requiredSoftware: ['AutoCAD'], preferredSpecialties: ['Kiến trúc'] },
    checklist: [],
    attachments: [],
    status: 'completed',
    progress: 100,
    assignedTo: 'fl_hoang_van_nam',
    assignedWorkerName: 'Hoàng Văn Nam',
    createdBy: 'jm_nguyen_hoang',
    jobMaster: 'jm_nguyen_hoang',
    jobMasterName: 'Nguyễn Hoàng',
    searchKeywords: ['kiến trúc', 'nhà phố', 'quận 7'],
    isPublic: true,
    highlightTags: [],
  },
  {
    title: 'Dự toán Sửa chữa Trụ sở cơ quan Nhà nước',
    description: 'Lập dự toán sửa chữa, cải tạo trụ sở cơ quan nhà nước 3 tầng tại Hà Nội. Theo định mức 588/BXD, đơn giá Hà Nội.',
    category: 'Dự toán',
    subcategory: 'Sửa chữa',
    projectType: 'Công sở',
    workMode: 'remote',
    level: 'L2',
    totalFee: 18_000_000,
    currency: 'VND',
    duration: 14,
    deadline: pastDate(10),
    paymentType: 'completion',
    milestones: [
      { id: 'ms1', name: 'Hoàn thành dự toán', percentage: 100, amount: 18_000_000, status: 'released' },
    ],
    requirements: { requiredLevel: 'L2', requiredSoftware: ['GXD', 'Excel'], preferredSpecialties: ['Dự toán'] },
    checklist: [],
    attachments: [],
    status: 'paid',
    progress: 100,
    assignedTo: 'fl_nguyen_thu_ha',
    assignedWorkerName: 'Nguyễn Thu Hà',
    createdBy: 'jm_nguyen_hoang',
    jobMaster: 'jm_nguyen_hoang',
    jobMasterName: 'Nguyễn Hoàng',
    searchKeywords: ['dự toán', 'sửa chữa', 'nhà nước'],
    isPublic: true,
    highlightTags: [],
  },
  {
    title: 'Thẩm tra PCCC Nhà kho logistic 20,000m2',
    description: 'Thẩm tra hồ sơ thiết kế PCCC cho nhà kho logistic diện tích 20,000m2 tại KCN VSIP2. Theo QCVN 06:2022/BXD.',
    category: 'Thẩm tra',
    subcategory: 'PCCC',
    projectType: 'Nhà kho',
    workMode: 'remote',
    level: 'L3',
    totalFee: 45_000_000,
    currency: 'VND',
    duration: 21,
    deadline: pastDate(3),
    paymentType: 'milestone',
    milestones: [
      { id: 'ms1', name: 'Thẩm tra hồ sơ', percentage: 60, amount: 27_000_000, status: 'released' },
      { id: 'ms2', name: 'Báo cáo thẩm tra', percentage: 40, amount: 18_000_000, status: 'released' },
    ],
    requirements: { requiredLevel: 'L3', requiredSoftware: ['AutoCAD'], preferredSpecialties: ['Thẩm tra'] },
    checklist: [],
    attachments: [],
    status: 'completed',
    progress: 100,
    assignedTo: 'fl_dao_thanh_long',
    assignedWorkerName: 'Đào Thanh Long',
    createdBy: 'jm_le_minh_tuan',
    jobMaster: 'jm_le_minh_tuan',
    jobMasterName: 'Lê Minh Tuấn',
    searchKeywords: ['thẩm tra', 'pccc', 'nhà kho'],
    isPublic: true,
    highlightTags: [],
  },
];

// =====================
// LEADERBOARD ENTRIES
// =====================

const now = new Date();
const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

const LEADERBOARD = [
  { uid: 'fl_hoang_van_nam', name: 'Hoàng Văn Nam', level: 'L5', specialty: 'Kiến trúc', earnings: 580_000_000, rating: 4.8, completedJobs: 35, badges: ['top_earner', '5_stars'], rank: 1, period: currentPeriod },
  { uid: 'fl_tran_bao_thy', name: 'Trần Bảo Thy', level: 'L4', specialty: 'BIM', earnings: 420_000_000, rating: 4.9, completedJobs: 28, badges: ['5_stars', 'speed_master'], rank: 2, period: currentPeriod },
  { uid: 'fl_dao_thanh_long', name: 'Đào Thanh Long', level: 'L4', specialty: 'Thẩm tra', earnings: 350_000_000, rating: 4.7, completedJobs: 20, badges: ['loyal_partner'], rank: 3, period: currentPeriod },
  { uid: 'fl_pham_duc_anh', name: 'Phạm Đức Anh', level: 'L3', specialty: 'Kết cấu', earnings: 330_000_000, rating: 4.7, completedJobs: 22, badges: ['rising_star'], rank: 4, period: currentPeriod },
  { uid: 'fl_vo_minh_hieu', name: 'Võ Minh Hiếu', level: 'L3', specialty: 'MEP', earnings: 270_000_000, rating: 4.5, completedJobs: 18, badges: [], rank: 5, period: currentPeriod },
  { uid: 'fl_nguyen_thu_ha', name: 'Nguyễn Thu Hà', level: 'L2', specialty: 'Dự toán', earnings: 180_000_000, rating: 4.6, completedJobs: 15, badges: ['rising_star'], rank: 6, period: currentPeriod },
];

// =====================
// TESTIMONIALS
// =====================
const TESTIMONIALS = [
  {
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
    name: 'ThS. Lê Minh Thảo',
    role: 'Giám đốc Kỹ thuật',
    company: 'Tập đoàn Xây dựng XYZ',
    avatarUrl: '',
    content: 'Hệ thống quản lý tiến độ và nghiệm thu trên VAA JOB rất trực quan. Tôi có thể theo dõi mọi thứ từ một dashboard duy nhất, tiết kiệm rất nhiều công sức điều phối.',
    rating: 5,
    isActive: true,
    order: 2,
  },
  {
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

// =====================
// SEED FUNCTIONS
// =====================

async function seedUsers() {
  console.log('🔄 Seeding users...');
  const batch = db.batch();
  for (const user of TEST_USERS) {
    const ref = db.collection('users').doc(user.uid);
    batch.set(ref, {
      ...user,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  await batch.commit();
  console.log(`  ✅ ${TEST_USERS.length} users seeded`);
}

async function seedJobs() {
  console.log('🔄 Seeding jobs...');
  const batch = db.batch();
  for (const job of JOBS) {
    const ref = db.collection('jobs').doc();
    batch.set(ref, {
      ...job,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  console.log(`  ✅ ${JOBS.length} jobs seeded`);
}

async function seedLeaderboard() {
  console.log('🔄 Seeding leaderboard...');
  const batch = db.batch();
  for (const entry of LEADERBOARD) {
    const ref = db.collection('leaderboard').doc(`${entry.period}_${entry.uid}`);
    batch.set(ref, entry, { merge: true });
  }
  await batch.commit();
  console.log(`  ✅ ${LEADERBOARD.length} leaderboard entries seeded`);
}

async function seedTestimonials() {
  console.log('🔄 Seeding testimonials...');
  const batch = db.batch();
  for (const t of TESTIMONIALS) {
    const ref = db.collection('testimonials').doc();
    batch.set(ref, t);
  }
  await batch.commit();
  console.log(`  ✅ ${TESTIMONIALS.length} testimonials seeded`);
}

// =====================
// MAIN
// =====================

async function main() {
  console.log('🚀 VAA JOB — Seed Data Script');
  console.log('============================\n');

  try {
    await seedUsers();
    await seedJobs();
    await seedLeaderboard();
    await seedTestimonials();

    console.log('\n🎉 All data seeded successfully!');
    console.log('\nSummary:');
    console.log(`  - ${TEST_USERS.length} users (${TEST_USERS.filter(u => u.role === 'jobmaster').length} jobmasters, ${TEST_USERS.filter(u => u.role === 'freelancer').length} freelancers)`);
    console.log(`  - ${JOBS.length} jobs (${JOBS.filter(j => !j.assignedTo).length} open, ${JOBS.filter(j => j.status === 'in_progress').length} in progress, ${JOBS.filter(j => j.status === 'completed' || j.status === 'paid').length} completed)`);
    console.log(`  - ${LEADERBOARD.length} leaderboard entries`);
    console.log(`  - ${TESTIMONIALS.length} testimonials`);
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
