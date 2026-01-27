-- ============================================================================
-- NEEDS-SHARING SAAS - COMPLETE DATABASE MIGRATION
-- Version: 1.0.0
-- Description: Production-ready multi-tenant schema with RLS
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE ENUMS
-- ============================================================================

CREATE TYPE role_type AS ENUM ('SUPER_ADMIN', 'ORG_ADMIN', 'GROUP_LEADER', 'USER');
CREATE TYPE user_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISABLED');
CREATE TYPE need_type AS ENUM ('WORK', 'FINANCIAL');
CREATE TYPE need_status AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED_OPEN', 'CLAIMED_IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED');
CREATE TYPE urgency_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE plan_tier AS ENUM ('STARTER', 'GROWTH', 'SCALE');
CREATE TYPE notification_type AS ENUM ('NEED_SUBMITTED', 'NEED_APPROVED', 'NEED_REJECTED', 'NEED_CLAIMED', 'NEED_UNCLAIMED', 'NEED_COMPLETED', 'NEED_CANCELLED', 'USER_APPROVED', 'USER_REJECTED', 'DAILY_DIGEST');
CREATE TYPE notification_status AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- ============================================================================
-- STEP 2: CREATE TABLES
-- ============================================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  allow_open_signup BOOLEAN DEFAULT true,
  domain_auto_approve_enabled BOOLEAN DEFAULT false,
  domain_auto_approve_list TEXT[] DEFAULT '{}',
  payments_enabled BOOLEAN DEFAULT false,
  plan_tier plan_tier DEFAULT 'STARTER',
  plan_effective_at TIMESTAMPTZ DEFAULT NOW(),
  plan_expires_at TIMESTAMPTZ,
  features_override JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT slug_format CHECK (slug ~* '^[a-z0-9-]+$'),
  CONSTRAINT slug_length CHECK (char_length(slug) >= 3 AND char_length(slug) <= 63)
);

CREATE TABLE users (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  preferred_contact_method TEXT DEFAULT 'email',
  status user_status DEFAULT 'PENDING',
  role role_type DEFAULT 'USER',
  show_email_to_counterparty BOOLEAN DEFAULT true,
  show_phone_to_counterparty BOOLEAN DEFAULT true,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES users(id),
  disabled_at TIMESTAMPTZ,
  disabled_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT phone_format CHECK (phone IS NULL OR phone ~* '^\+?[0-9\s\-\(\)]+$'),
  CONSTRAINT unique_user_per_org UNIQUE (organization_id, email)
);

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_group_name_per_org UNIQUE (organization_id, name)
);

CREATE TABLE user_groups (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, group_id)
);

CREATE TABLE need_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_category_name_per_org UNIQUE (organization_id, name)
);

CREATE TABLE need_field_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  need_type need_type NOT NULL,
  field_key TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_field_rule UNIQUE (organization_id, need_type, field_key)
);

CREATE TABLE needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  category_id UUID REFERENCES need_categories(id) ON DELETE SET NULL,
  need_type need_type NOT NULL,
  status need_status DEFAULT 'DRAFT',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  urgency urgency_level DEFAULT 'MEDIUM',
  requester_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  work_location TEXT,
  work_start_date DATE,
  work_end_date DATE,
  work_estimated_hours NUMERIC(10,2),
  work_skills_required TEXT[],
  work_tools_needed TEXT[],
  financial_amount NUMERIC(12,2),
  financial_currency TEXT DEFAULT 'USD',
  financial_purpose TEXT,
  financial_due_date DATE,
  claimed_at TIMESTAMPTZ,
  claimed_by UUID REFERENCES users(id),
  claim_note TEXT,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  completion_note TEXT,
  actual_hours_worked NUMERIC(10,2),
  actual_amount_provided NUMERIC(12,2),
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES users(id),
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT title_not_empty CHECK (char_length(trim(title)) > 0),
  CONSTRAINT description_not_empty CHECK (char_length(trim(description)) > 0),
  CONSTRAINT work_dates_valid CHECK (work_end_date IS NULL OR work_start_date IS NULL OR work_end_date >= work_start_date),
  CONSTRAINT financial_amount_positive CHECK (financial_amount IS NULL OR financial_amount > 0),
  CONSTRAINT actual_amount_positive CHECK (actual_amount_provided IS NULL OR actual_amount_provided > 0),
  CONSTRAINT hours_positive CHECK (work_estimated_hours IS NULL OR work_estimated_hours > 0),
  CONSTRAINT actual_hours_positive CHECK (actual_hours_worked IS NULL OR actual_hours_worked > 0)
);

CREATE TABLE need_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  need_id UUID NOT NULL REFERENCES needs(id) ON DELETE CASCADE,
  from_status need_status,
  to_status need_status NOT NULL,
  changed_by_user_id UUID NOT NULL REFERENCES users(id),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  need_id UUID REFERENCES needs(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  payload_json JSONB,
  status notification_status DEFAULT 'QUEUED',
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- ============================================================================
-- STEP 3: CREATE INDEXES
-- ============================================================================

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_is_active ON organizations(is_active);
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_groups_organization_id ON groups(organization_id);
CREATE INDEX idx_groups_is_active ON groups(is_active);
CREATE INDEX idx_user_groups_organization_id ON user_groups(organization_id);
CREATE INDEX idx_user_groups_group_id ON user_groups(group_id);
CREATE INDEX idx_user_groups_user_id ON user_groups(user_id);
CREATE INDEX idx_need_categories_organization_id ON need_categories(organization_id);
CREATE INDEX idx_need_categories_is_active ON need_categories(is_active);
CREATE INDEX idx_need_field_rules_organization_id ON need_field_rules(organization_id);
CREATE INDEX idx_needs_organization_id ON needs(organization_id);
CREATE INDEX idx_needs_group_id ON needs(group_id);
CREATE INDEX idx_needs_category_id ON needs(category_id);
CREATE INDEX idx_needs_status ON needs(status);
CREATE INDEX idx_needs_need_type ON needs(need_type);
CREATE INDEX idx_needs_requester_user_id ON needs(requester_user_id);
CREATE INDEX idx_needs_claimed_by ON needs(claimed_by);
CREATE INDEX idx_needs_created_at ON needs(created_at DESC);
CREATE INDEX idx_needs_urgency ON needs(urgency);
CREATE INDEX idx_need_status_events_organization_id ON need_status_events(organization_id);
CREATE INDEX idx_need_status_events_need_id ON need_status_events(need_id);
CREATE INDEX idx_need_status_events_created_at ON need_status_events(created_at DESC);
CREATE INDEX idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- STEP 4: CREATE TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_need_categories_updated_at BEFORE UPDATE ON need_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_needs_updated_at BEFORE UPDATE ON needs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 5: HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_organization_id() RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_role() RETURNS role_type AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_super_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_org_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ORG_ADMIN');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Run complete RLS policies from separate file
-- Run business logic functions from separate file  
-- Run views from separate file

-- ============================================================================
-- COMPLETE - DATABASE SCHEMA READY
-- ============================================================================
