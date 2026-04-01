/* ============================================
   VAA JOB — TypeScript Interfaces
   ============================================ */

// ---- User / Auth ----
export type UserRole = 'freelancer' | 'admin' | 'jobmaster' | 'accountant';

export interface UserProfile {
  uid: string;
  email: string;
  phone: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  status: 'active' | 'suspended' | 'pending_verification';
  createdAt: Date;
  updatedAt: Date;

  // Freelancer-specific
  specialties: string[];
  experience: number;
  software: string[];
  selfAssessedLevel: JobLevel;
  currentLevel: JobLevel;
  bio: string;

  // KYC
  kycCompleted: boolean;
  idNumber: string;
  idIssuedDate: string;
  idIssuedPlace: string;
  address: string;
  bankAccountNumber: string;
  bankName: string;
  bankBranch: string;
  taxId: string;

  // Stats (denormalized)
  stats: UserStats;
}

export interface UserStats {
  completedJobs: number;
  totalEarnings: number;
  avgRating: number;
  ratingCount: number;
  onTimeRate: number;
  currentMonthEarnings: number;
}

export interface Certificate {
  id: string;
  number: string;
  field: string;
  fileURL: string;
  status: 'pending' | 'verified' | 'rejected';
  verifiedBy?: string;
}

export interface PortfolioItem {
  id: string;
  projectName: string;
  role: string;
  year: number;
  thumbnailURL: string;
  description: string;
}

export interface UserBadge {
  id: string;
  badgeType: BadgeType;
  earnedAt: Date;
  metadata?: Record<string, unknown>;
}

// ---- Jobs ----
export type JobLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
export type JobCategory = 'Kiến trúc' | 'Kết cấu' | 'MEP' | 'BIM' | 'Dự toán' | 'Giám sát' | 'Thẩm tra';
export type WorkMode = 'remote' | 'on-site' | 'hybrid';

export type JobStatus =
  | 'draft'
  | 'pending_approval'
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'review'
  | 'completed'
  | 'paid'
  | 'cancelled';

export interface PaymentMilestone {
  id: string;
  name: string;
  percentage: number;
  amount: number;
  condition: string;
  status: 'pending' | 'approved' | 'paid';
  approvedAt?: Date;
  paidAt?: Date;
  approvedBy?: string;
  paidBy?: string;
}

export interface JobRequirements {
  experience: string;
  certifications: string;
  software: string[];
  standards: string[];
}

export interface ChecklistItem {
  id: string;
  item: string;
  completed: boolean;
}

export interface Attachment {
  name: string;
  type: string;
  url: string;
  size?: number;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  category: JobCategory;
  subcategory: string;
  projectType: string;
  workMode: WorkMode;
  level: JobLevel;
  totalFee: number;
  currency: 'VND';
  duration: number;
  deadline: Date;
  startDate?: Date;

  paymentType: 'milestone' | 'completion';
  milestones: PaymentMilestone[];

  requirements: JobRequirements;
  checklist: ChecklistItem[];
  attachments: Attachment[];

  status: JobStatus;
  progress: number;
  assignedTo: string | null;
  assignedAt?: Date;

  createdBy: string;
  jobMaster: string;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;

  jobMasterName: string;
  assignedWorkerName?: string;
  searchKeywords: string[];
  isPublic: boolean;
}

// ---- Applications ----
export type ApplicationStatus = 'pending' | 'shortlisted' | 'accepted' | 'rejected';

export interface JobApplication {
  id: string;
  applicantId: string;
  applicantName: string;
  applicantLevel: JobLevel;
  applicantSpecialties: string[];
  availableDate: Date;
  expectedFee?: number;
  coverLetter: string;
  portfolioLink: string;
  attachments: Attachment[];
  status: ApplicationStatus;
  rejectionReason?: string;
  createdAt: Date;
  reviewedBy?: string;
}

// ---- Comments ----
export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  attachmentURL?: string;
  parentCommentId: string | null;
  isInternal: boolean;
  createdAt: Date;
  likes: string[];
}

// ---- Progress ----
export interface ProgressUpdate {
  id: string;
  authorId: string;
  fromProgress: number;
  toProgress: number;
  note: string;
  createdAt: Date;
  approvedByJobMaster: boolean;
}

// ---- Deliverables ----
export type DeliverableStatus = 'uploaded' | 'reviewed' | 'revision_requested' | 'approved';

export interface Deliverable {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
  status: DeliverableStatus;
  reviewNote?: string;
}

// ---- Contracts ----
export type ContractStatus = 'draft' | 'pending_signature' | 'active' | 'completed' | 'terminated';

export interface Contract {
  id: string;
  contractNumber: string;
  jobId: string;
  jobTitle: string;
  partyA: {
    name: string;
    representative: string;
    position: string;
  };
  partyB: {
    uid: string;
    name: string;
    idNumber: string;
    address: string;
    bankAccount: string;
    bankName: string;
  };
  scope: string;
  totalValue: number;
  paymentTerms: string;
  terms: string;
  pdfURL?: string;
  signedPdfURL?: string;
  status: ContractStatus;
  createdBy: string;
  signedByWorkerAt?: Date;
  signedByAdminAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Chat ----
export interface Conversation {
  id: string;
  participants: string[];
  jobId: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: Record<string, number>;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  type: 'text' | 'file' | 'image';
  fileURL?: string;
  fileName?: string;
  readBy: string[];
  createdAt: Date;
}

// ---- Payments ----
export type PaymentStatus = 'pending' | 'approved' | 'paid' | 'cancelled';

export interface Payment {
  id: string;
  jobId: string;
  contractId: string;
  milestoneId: string;
  workerId: string;
  workerName: string;
  amount: number;
  reason: string;
  status: PaymentStatus;
  triggeredByMilestone: boolean;
  approvedByJobMaster?: string;
  approvedAt?: Date;
  paidByAccountant?: string;
  paidAt?: Date;
  paymentProof?: string;
  bankReference?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Notifications ----
export type NotificationType =
  | 'job_new' | 'application_received' | 'application_accepted'
  | 'application_rejected' | 'milestone_reached' | 'payment_pending'
  | 'payment_completed' | 'contract_ready' | 'deadline_warning'
  | 'comment_reply' | 'badge_earned' | 'progress_update';

export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

// ---- Leaderboard ----
export interface LeaderboardEntry {
  uid: string;
  name: string;
  level: JobLevel;
  specialty: string;
  earnings: number;
  rating: number;
  completedJobs: number;
  badges: BadgeType[];
}

export type BadgeType = 'top_earner' | 'speed_master' | '5_stars' | 'loyal_partner' | 'rising_star';

// ---- UI Helpers ----
export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  badge?: number;
  active?: boolean;
}

export const JOB_CATEGORIES: JobCategory[] = [
  'Kiến trúc', 'Kết cấu', 'MEP', 'BIM', 'Dự toán', 'Giám sát', 'Thẩm tra'
];

export const JOB_LEVELS: JobLevel[] = ['L1', 'L2', 'L3', 'L4', 'L5'];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: 'Nháp',
  pending_approval: 'Chờ duyệt',
  open: 'Chưa nhận việc',
  assigned: 'Chốt kèo',
  in_progress: 'Đang thực hiện',
  review: 'Nghiệm thu',
  completed: 'Hoàn thành',
  paid: 'Đã thanh toán',
  cancelled: 'Đã hủy',
};
