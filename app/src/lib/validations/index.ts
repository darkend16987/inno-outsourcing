import { z } from 'zod';

// ──── Auth Schemas ────
export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
});
export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  displayName: z.string().min(2, 'Tên ít nhất 2 ký tự').max(50, 'Tên tối đa 50 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
  confirmPassword: z.string(),
  phone: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Mật khẩu không khớp',
  path: ['confirmPassword'],
});
export type RegisterFormData = z.infer<typeof registerSchema>;

// ──── Profile Schema ────
export const profileSchema = z.object({
  displayName: z.string().min(2, 'Tên ít nhất 2 ký tự'),
  phone: z.string().optional(),
  bio: z.string().max(500, 'Giới thiệu tối đa 500 ký tự').optional(),
  specialties: z.array(z.string()).min(1, 'Chọn ít nhất 1 chuyên môn'),
  experience: z.number().min(0, 'Kinh nghiệm không hợp lệ').max(50),
  software: z.array(z.string()),
  selfAssessedLevel: z.enum(['L1', 'L2', 'L3', 'L4', 'L5']),
  // KYC
  idNumber: z.string().optional(),
  idIssuedDate: z.string().optional(),
  idIssuedPlace: z.string().optional(),
  address: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  taxId: z.string().optional(),
});
export type ProfileFormData = z.infer<typeof profileSchema>;

// ──── Job Schemas ────
export const jobMilestoneSchema = z.object({
  name: z.string().min(1, 'Tên đợt thanh toán không được trống'),
  percentage: z.number().min(0).max(100),
  amount: z.number().min(0, 'Số tiền không hợp lệ'),
  condition: z.string().min(1, 'Điều kiện không được trống'),
});

export const createJobSchema = z.object({
  title: z.string().min(5, 'Tiêu đề ít nhất 5 ký tự').max(200),
  description: z.string().min(20, 'Mô tả ít nhất 20 ký tự'),
  category: z.enum(['Kiến trúc', 'Kết cấu', 'MEP', 'BIM', 'Dự toán', 'Giám sát', 'Thẩm tra']),
  subcategory: z.string().optional(),
  projectType: z.string().min(1, 'Loại dự án không được trống'),
  workMode: z.enum(['remote', 'on-site', 'hybrid']),
  level: z.enum(['L1', 'L2', 'L3', 'L4', 'L5']),
  totalFee: z.number().min(1000000, 'Thù lao tối thiểu 1,000,000₫'),
  duration: z.number().min(1, 'Thời hạn ít nhất 1 ngày'),
  deadline: z.string().min(1, 'Hạn nộp không được trống'),
  paymentType: z.enum(['milestone', 'completion']),
  milestones: z.array(jobMilestoneSchema).optional(),
  requirements: z.object({
    experience: z.string(),
    certifications: z.string(),
    software: z.array(z.string()),
    standards: z.array(z.string()),
  }),
});
export type CreateJobFormData = z.infer<typeof createJobSchema>;

// ──── Application Schema ────
export const applicationSchema = z.object({
  coverLetter: z.string().min(50, 'Thư ứng tuyển ít nhất 50 ký tự').max(2000),
  portfolioLink: z.string().url('Link portfolio không hợp lệ').or(z.literal('')),
  expectedFee: z.number().optional(),
  availableDate: z.string().min(1, 'Ngày bắt đầu không được trống'),
});
export type ApplicationFormData = z.infer<typeof applicationSchema>;

// ──── Contract Schema ────
export const contractSchema = z.object({
  contractNumber: z.string().min(1, 'Số hợp đồng không được trống'),
  jobId: z.string().min(1),
  jobTitle: z.string().min(1),
  partyA: z.object({
    name: z.string().min(1, 'Tên bên A không được trống'),
    representative: z.string().min(1),
    position: z.string().min(1),
  }),
  scope: z.string().min(10, 'Phạm vi công việc ít nhất 10 ký tự'),
  totalValue: z.number().min(0),
  paymentTerms: z.string().min(10, 'Điều khoản thanh toán ít nhất 10 ký tự'),
  terms: z.string().min(10, 'Điều khoản chung ít nhất 10 ký tự'),
});
export type ContractFormData = z.infer<typeof contractSchema>;

// ──── Payment Schema ────
export const confirmPaymentSchema = z.object({
  bankReference: z.string().min(1, 'Mã giao dịch ngân hàng không được trống'),
  paymentProof: z.string().url('Link chứng từ không hợp lệ').optional(),
  note: z.string().optional(),
});
export type ConfirmPaymentFormData = z.infer<typeof confirmPaymentSchema>;

// ──── Chat Schema ────
export const messageSchema = z.object({
  content: z.string().min(1, 'Tin nhắn không được trống').max(5000),
});
export type MessageFormData = z.infer<typeof messageSchema>;
