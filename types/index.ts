// Database Enums
export type RoleType = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'GROUP_LEADER' | 'USER';
export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISABLED';
export type NeedType = 'WORK' | 'FINANCIAL';
export type NeedStatus = 
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED_OPEN'
  | 'CLAIMED_IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';
export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type PlanTier = 'STARTER' | 'GROWTH' | 'SCALE';
export type PreferredContact = 'EMAIL' | 'PHONE' | 'EITHER';

// Database Tables
export interface Organization {
  id: string;
  slug: string;
  display_name: string;
  plan_tier: PlanTier;
  max_groups: number | null;
  max_needs_per_month: number | null;
  allow_open_signup: boolean;
  domain_auto_approve_enabled: boolean;
  domain_auto_approve_list: string[];
  features_override: Record<string, boolean> | null;
  primary_color: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: RoleType;
  status: UserStatus;
  preferred_contact_method: PreferredContact;
  show_email_to_counterparty: boolean;
  show_phone_to_counterparty: boolean;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface NeedCategory {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Need {
  id: string;
  organization_id: string;
  group_id: string;
  category_id: string | null;
  requester_id: string;
  title: string;
  description: string;
  need_type: NeedType;
  status: NeedStatus;
  urgency: UrgencyLevel;
  work_location: string | null;
  work_start_date: string | null;
  work_end_date: string | null;
  work_estimated_hours: number | null;
  financial_amount: number | null;
  financial_currency: string | null;
  financial_purpose: string | null;
  financial_due_date: string | null;
  fulfiller_id: string | null;
  claimed_at: string | null;
  completed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  custom_fields: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface NeedStatusEvent {
  id: string;
  need_id: string;
  from_status: NeedStatus;
  to_status: NeedStatus;
  changed_by: string;
  note: string | null;
  created_at: string;
}

// Extended types with relations
export interface NeedWithRelations extends Need {
  requester?: User;
  fulfiller?: User;
  group?: Group;
  category?: NeedCategory;
  organization?: Organization;
}

export interface UserWithOrganization extends User {
  organization?: Organization;
}
