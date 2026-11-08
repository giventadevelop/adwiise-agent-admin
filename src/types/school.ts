/**
 * School site DTOs. Field names match the Spring resources.
 */

export interface SchoolDepartmentDTO {
  id?: number | null;
  tenantId?: string;
  name?: string;
  slug?: string;
  summary?: string;
  body?: string;
  imageUrl?: string;
  headStaffId?: number | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface SchoolStaffMemberDTO {
  id?: number | null;
  tenantId?: string;
  staffCategory?: string;
  stage?: string;
  firstName?: string;
  lastName?: string;
  designation?: string;
  qualification?: string;
  subjectName?: string;
  classTeacherOf?: string;
  departmentId?: number | null;
  email?: string;
  phone?: string;
  profileImageUrl?: string;
  bio?: string;
  priorityOrder?: number;
  isActive?: boolean;
}

export interface SchoolFacilityDTO {
  id?: number | null;
  tenantId?: string;
  name?: string;
  slug?: string;
  summary?: string;
  body?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface SchoolActivityDTO {
  id?: number | null;
  tenantId?: string;
  activityKind?: string;
  name?: string;
  slug?: string;
  summary?: string;
  body?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface SchoolPageDTO {
  id?: number | null;
  tenantId?: string;
  slug?: string;
  title?: string;
  summary?: string;
  body?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface SchoolHighlightDTO {
  id?: number | null;
  tenantId?: string;
  personName?: string;
  subtitle?: string;
  imageUrl?: string;
  academicYear?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface SchoolFeeInvoiceDTO {
  id?: number | null;
  tenantId?: string;
  title?: string;
  academicYear?: string;
  feeKind?: string;
  studentName?: string;
  classLabel?: string;
  payerName?: string;
  payerEmail?: string;
  payerPhone?: string;
  amountDue?: number;
  currency?: string;
  dueDate?: string;
  status?: string;
}

export interface SchoolFeePaymentDTO {
  id?: number | null;
  tenantId?: string;
  invoiceId?: number | null;
  providerName?: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  paidAt?: string;
}

export type SchoolRecord =
  | SchoolDepartmentDTO
  | SchoolStaffMemberDTO
  | SchoolFacilityDTO
  | SchoolActivityDTO
  | SchoolPageDTO
  | SchoolHighlightDTO
  | SchoolFeeInvoiceDTO
  | SchoolFeePaymentDTO;
