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

  // Education
  yearsOfExperience?: number;
  educationSchool?: string;
  educationYear?: string;
  educationMajor?: string;

  // KYC
  kycCompleted: boolean;
  idNumber: string;
  idIssuedDate: string;
  idIssuedPlace: string;
  idCardImages?: string[];
  address: string;
  bankAccountNumber: string;
  bankName: string;
  bankBranch: string;
  taxId: string;

  // Certificates
  certificates?: UserCertificateEntry[];

  // Stats (denormalized)
  stats: UserStats;

  // Trust & Reputation (Phase 2)
  trustScore?: number;
  trustBadge?: TrustBadgeLevel;

  // Availability (Phase 3)
  availability?: AvailabilityStatus;

  // Saved/Favorite (Phase 3)
  savedJobs?: string[];
  savedFreelancers?: string[];
}

export interface UserStats {
  completedJobs: number;
  totalEarnings: number;
  avgRating: number;
  ratingCount: number;
  onTimeRate: number;
  currentMonthEarnings: number;
}

export interface UserCertificateEntry {
  name: string;
  issuedBy: string;
  issuedDate: string;
  expiryDate?: string;
  imageUrl?: string;
}

export interface Certificate {
  id: string;
  number: string;
  field: string;
  fileURL: string;
  status: 'pending' | 'verified' | 'rejected';
  verifiedBy?: string;
  type?: 'cchn' | 'pmp' | 'bim_cert' | 'other';
  expiryDate?: Date;
}

export interface PortfolioItem {
  id: string;
  projectName: string;
  role: string;
  year: number;
  thumbnailURL: string;
  description: string;
  linkedJobId?: string;
  images?: string[];
  jobmasterConfirmed?: boolean;
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

export type MilestoneStatus = 'pending' | 'approved' | 'paid' | 'locked' | 'released' | 'in_progress' | 'review';

export interface PaymentMilestone {
  id: string;
  name: string;
  percentage: number;
  amount: number;
  condition?: string;
  status: MilestoneStatus;
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

export type JobTag = 'Siêu tốc' | 'HOT' | 'Phù hợp mọi level' | 'Remote 100%' | 'Thưởng hiệu suất' | 'Tech-lead' | string;

export type EscrowStatus = 'not_started' | 'locked' | 'partially_released' | 'fully_released';

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
  /** Maximum fee a freelancer can propose. Set by jobmaster. Defaults to totalFee * 1.2 if not set. */
  maxFeeLimit?: number;
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
  highlightTags?: JobTag[];

  // Escrow (Phase 1)
  escrowStatus?: EscrowStatus;

  // Project info
  projectScale?: string;
  projectImages?: string[];
}

// ---- Applications ----
export type ApplicationStatus = 'pending' | 'shortlisted' | 'accepted' | 'rejected';

export type MatchBadge = 'top_match' | 'recommended';

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
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

  // Smart Matching (Phase 1)
  matchScore?: number;
  matchBadge?: MatchBadge;
  matchReasons?: string[];
}

// ---- Comments ----
export interface Comment {
  id: string;
  jobId: string;
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
  type: 'text' | 'file' | 'image' | 'meeting';
  fileURL?: string;
  fileName?: string;
  meetingUrl?: string;
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
  | 'comment_reply' | 'badge_earned' | 'progress_update'
  // Multi-tier deadline alerts (Phase 1)
  | 'deadline_7days' | 'deadline_3days' | 'deadline_1day' | 'deadline_overdue'
  // Smart matching (Phase 1)
  | 'job_recommended'
  // Invitations (Phase 3)
  | 'job_invitation'
  // Escrow (Phase 1)
  | 'escrow_locked' | 'escrow_released';

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
  avatar?: string;
  level: JobLevel;
  specialty: string;
  earnings: number;
  rating: number;
  completedJobs: number;
  badges: BadgeType[];
}

export type BadgeType =
  | 'top_earner' | 'speed_master' | '5_stars' | 'loyal_partner' | 'rising_star'
  // Extended badges (Phase 4)
  | 'specialist' | 'all_rounder' | 'big_project'
  | 'perfect_score' | 'bim_champion' | 'deadline_king';

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

// ---- Reviews / Ratings (P2) ----
export interface Review {
  id?: string;
  jobId: string;
  jobTitle: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: UserRole;
  revieweeId: string;
  revieweeName: string;
  revieweeRole?: UserRole;
  rating: number; // 1-5
  comment: string;
  categories?: {
    quality?: number;            // Chất lượng công việc
    communication?: number;      // Giao tiếp
    timeliness?: number;         // Đúng hạn
    professionalism?: number;    // Chuyên nghiệp
    // Freelancer reviews Jobmaster
    descriptionClarity?: number; // Mô tả rõ ràng
    paymentTimeliness?: number;  // Thanh toán đúng hạn
  };
  // Mutual review: both sides must submit before reveal (Phase 2)
  visible?: boolean;
  wouldRehire?: boolean;
  createdAt: Date;
}

export const REVIEW_RATING_LABELS: Record<number, string> = {
  1: 'Rất kém',
  2: 'Kém',
  3: 'Trung bình',
  4: 'Tốt',
  5: 'Xuất sắc',
};

// ---- Disputes (P4) ----
export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'escalated' | 'closed';

export type DisputeReason =
  | 'quality_issue'       // Chất lượng không đạt
  | 'missed_deadline'     // Trễ deadline
  | 'payment_dispute'     // Tranh chấp thanh toán
  | 'scope_change'        // Thay đổi phạm vi
  | 'communication'       // Vấn đề giao tiếp
  | 'other';              // Khác

export interface Dispute {
  id?: string;
  jobId: string;
  jobTitle: string;
  initiatorId: string;
  initiatorName: string;
  initiatorRole: UserRole;
  respondentId: string;
  respondentName: string;
  participants: string[]; // [initiatorId, respondentId] for Firestore rules
  reason: DisputeReason;
  description: string;
  evidence?: string[]; // URLs to uploaded evidence files
  status: DisputeStatus;
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  open: 'Đang mở',
  under_review: 'Đang xem xét',
  resolved: 'Đã giải quyết',
  escalated: 'Đã leo thang',
  closed: 'Đã đóng',
};

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  quality_issue: 'Chất lượng không đạt',
  missed_deadline: 'Trễ deadline',
  payment_dispute: 'Tranh chấp thanh toán',
  scope_change: 'Thay đổi phạm vi',
  communication: 'Vấn đề giao tiếp',
  other: 'Khác',
};

// ---- Trust & Reputation (Phase 2) ----
export type TrustBadgeLevel = 'trusted' | 'rising' | 'new';
export type AvailabilityStatus = 'available' | 'partially_busy' | 'unavailable';

export const TRUST_BADGE_LABELS: Record<TrustBadgeLevel, string> = {
  trusted: 'Đáng tin cậy',
  rising: 'Đang phát triển',
  new: 'Mới',
};

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  available: 'Sẵn sàng ngay',
  partially_busy: 'Bận một phần',
  unavailable: 'Không available',
};

// ---- Job Invitations (Phase 3) ----
export type InvitationStatus = 'pending' | 'accepted' | 'declined';

export interface JobInvitation {
  id?: string;
  jobId: string;
  jobTitle: string;
  inviterId: string;
  inviterName: string;
  freelancerId: string;
  freelancerName: string;
  message?: string;
  status: InvitationStatus;
  createdAt: Date;
  respondedAt?: Date;
}

// ---- Seasonal Challenges (Phase 4) ----
export interface Challenge {
  id?: string;
  title: string;
  description: string;
  category: JobCategory;
  target: number;
  rewardBadge: BadgeType;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  participants: Record<string, { progress: number; completed: boolean }>;
}

// ---- Invoices (Phase 4) ----
export interface Invoice {
  id?: string;
  invoiceNumber: string;
  jobId: string;
  jobTitle: string;
  paymentId: string;
  milestoneId: string;
  partyA: {
    name: string;
    representative: string;
    address?: string;
    taxId?: string;
  };
  partyB: {
    name: string;
    idNumber: string;
    bankAccount: string;
    bankName: string;
    taxId?: string;
  };
  amount: number;
  description: string;
  pdfURL?: string;
  status: 'draft' | 'issued' | 'sent';
  issuedAt: Date;
  createdAt: Date;
}

