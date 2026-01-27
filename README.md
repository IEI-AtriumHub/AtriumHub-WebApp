# Needs-Sharing SaaS Platform

## 🚀 Production-Grade Multi-Tenant Application

A complete, enterprise-ready SaaS platform for churches, nonprofits, and mission-driven organizations to manage and fulfill community needs.

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Tech Stack](#tech-stack)
5. [Database Schema](#database-schema)
6. [Security](#security)
7. [Installation](#installation)
8. [Deployment](#deployment)
9. [Development Guide](#development-guide)
10. [API Documentation](#api-documentation)

---

## 🎯 System Overview

### Core Functionality
- **Multi-tenant SaaS** with subdomain-based tenancy
- **Approval-driven workflow** for all needs
- **Work and Financial needs** with custom fields
- **Role-based access control** (4 roles)
- **Privacy by design** - contact info protection
- **Tier-based feature gating** (3 plan tiers)
- **Comprehensive reporting** and analytics

### User Roles
1. **SUPER_ADMIN** - Platform owner, cross-tenant access
2. **ORG_ADMIN** - Full organization control
3. **GROUP_LEADER** - Group-scoped access (Growth+ only)
4. **USER** - Standard member

---

## 🏗️ Architecture

### Multi-Tenant Design
```
{orgSlug}.app.com → Tenant Context → Organization Data
```

### Data Isolation
- **Row Level Security (RLS)** enforced at database level
- **Organization ID** on every tenant table
- **No cross-tenant data leakage** - guaranteed by Postgres RLS
- **Super Admin bypass** for platform management

### Subdomain Routing
```
church.app.com     → Church Organization
nonprofit.app.com  → Nonprofit Organization
localhost:3000     → Development (no tenant isolation)
```

---

## ✨ Features

### Need Management
- ✅ Draft → Pending → Approved → Claimed → Completed workflow
- ✅ Admin approval required for all needs
- ✅ Only admins can mark needs complete
- ✅ Claim/unclaim functionality
- ✅ Cancellation support
- ✅ Audit trail via status events

### User Management
- ✅ Invite-free signup (optional domain auto-approval)
- ✅ Admin approval for new users
- ✅ Status: PENDING → APPROVED/REJECTED
- ✅ Role assignment by admins
- ✅ Privacy controls per user

### Privacy & Security
- ✅ Contact info visible ONLY to:
  - Requester
  - Fulfiller
  - ORG_ADMIN
  - SUPER_ADMIN
- ✅ Privacy preferences per user
- ✅ Secure views for contact info
- ✅ HTTPS enforced
- ✅ Security headers configured

### Plan Tiers

#### STARTER (Free)
- Max 5 groups
- Basic reporting
- CSV export
- Email notifications

#### GROWTH ($29/month)
- Unlimited groups
- PDF export
- Advanced analytics
- Custom categories
- Field rules configuration
- Group Leader role
- Payment toggle

#### SCALE ($99/month)
- Everything in Growth
- Read-only API access
- Priority support
- Custom integrations

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Headless UI** for accessible components
- **React Hook Form** + Zod for form validation
- **Recharts** for data visualization

### Backend
- **Supabase** (PostgreSQL + Auth + Storage)
- **Row Level Security** for data isolation
- **PostgreSQL Functions** for business logic
- **Real-time subscriptions** (optional)

### Services
- **SendGrid/Postmark** for email
- **Stripe** for payments
- **Vercel/Railway** for hosting

---

## 🗄️ Database Schema

### Core Tables
```sql
organizations
users
groups
user_groups
need_categories
need_field_rules
needs
need_status_events
notifications
```

### Key Relationships
```
Organization
  ↓
  Users (many)
  Groups (many)
  Needs (many)
  
Need
  ↓
  Requester (User)
  Group (one)
  Claimer (User, optional)
  Status Events (many)
```

### Enums
- `role_type`: SUPER_ADMIN, ORG_ADMIN, GROUP_LEADER, USER
- `user_status`: PENDING, APPROVED, REJECTED, DISABLED
- `need_status`: DRAFT, PENDING_APPROVAL, APPROVED_OPEN, CLAIMED_IN_PROGRESS, COMPLETED, CANCELLED, REJECTED
- `need_type`: WORK, FINANCIAL
- `urgency_level`: LOW, MEDIUM, HIGH, CRITICAL
- `plan_tier`: STARTER, GROWTH, SCALE

---

## 🔒 Security

### Tenant Isolation
```sql
-- Example RLS Policy
CREATE POLICY "Users can only see own org data"
  ON needs FOR SELECT
  USING (organization_id = get_user_organization_id());
```

### Contact Info Privacy
```sql
-- Secure View
CREATE VIEW needs_with_contact_info AS
SELECT 
  n.*,
  CASE 
    WHEN is_super_admin() THEN u.email
    WHEN is_org_admin() THEN u.email
    WHEN n.requester_user_id = auth.uid() THEN u.email
    WHEN n.claimed_by = auth.uid() AND u.show_email_to_counterparty THEN u.email
    ELSE NULL
  END AS requester_email
FROM needs n
LEFT JOIN users u ON u.id = n.requester_user_id;
```

### Feature Gating
```sql
-- Server-side enforcement
CREATE FUNCTION org_has_feature(org_uuid UUID, feature_name TEXT)
RETURNS BOOLEAN AS $$
  -- Check tier + overrides
  -- Return true/false
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 📦 Installation

### Prerequisites
- Node.js 18+
- Supabase account
- Stripe account (for payments)
- SendGrid/Postmark account (for email)

### Steps

1. **Clone Repository**
```bash
git clone https://github.com/yourusername/needs-sharing-saas.git
cd needs-sharing-saas
```

2. **Install Dependencies**
```bash
npm install
```

3. **Set Up Supabase**
- Create new project at supabase.com
- Run migration SQL (see `/database/schema.sql`)
- Copy project URL and anon key

4. **Configure Environment**
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

5. **Run Development Server**
```bash
npm run dev
```

6. **Access Application**
```
http://localhost:3000
```

---

## 🚀 Deployment

### Database Setup

1. **Run Migrations**
```sql
-- Execute all files in /database/ folder in order:
-- 1. schema.sql (tables, enums, indexes)
-- 2. rls-policies.sql (security policies)
-- 3. functions.sql (business logic)
-- 4. views.sql (secure views)
```

2. **Create Super Admin**
```sql
-- After first user signs up, promote to Super Admin
UPDATE users 
SET role = 'SUPER_ADMIN', status = 'APPROVED'
WHERE email = 'your-email@example.com';
```

### Vercel Deployment

1. **Connect Repository**
- Import project in Vercel dashboard
- Connect GitHub repository

2. **Configure Environment Variables**
- Add all variables from `.env.example`
- Ensure `NEXT_PUBLIC_*` variables are set

3. **Set Up Domains**
```
Primary: app.yourdomain.com
Wildcard: *.app.yourdomain.com
```

4. **DNS Configuration**
```
Type: CNAME
Name: *
Value: cname.vercel-dns.com
```

5. **Deploy**
```bash
vercel --prod
```

### Post-Deployment

1. **Test Tenant Isolation**
```sql
-- As User A, try accessing Org B data
-- Should return no results
```

2. **Verify RLS Policies**
```sql
-- Test each role's access
-- Confirm Super Admin bypass
```

3. **Configure Email Service**
- Set up SendGrid/Postmark domain verification
- Test notification emails

4. **Set Up Stripe Webhooks**
```
Endpoint: https://app.yourdomain.com/api/webhooks/stripe
Events: checkout.session.completed, customer.subscription.*
```

---

## 💻 Development Guide

### Project Structure
```
├── app/                  # Next.js App Router pages
├── components/           # React components
│   ├── ui/              # Base UI components
│   ├── needs/           # Need-specific components
│   ├── admin/           # Admin components
│   └── layout/          # Layout components
├── context/             # React Context providers
├── hooks/               # Custom React hooks
├── lib/                 # Core utilities
├── types/               # TypeScript definitions
├── database/            # SQL migrations
└── public/              # Static assets
```

### Adding a New Feature

1. **Database Changes**
```sql
-- Add table/column
ALTER TABLE needs ADD COLUMN new_field TEXT;

-- Update RLS policy if needed
CREATE POLICY "..."
```

2. **Update Types**
```typescript
// types/index.ts
export interface Need {
  // ... existing fields
  new_field?: string;
}
```

3. **Create Hook**
```typescript
// hooks/useNewFeature.ts
export function useNewFeature() {
  // Implementation
}
```

4. **Build UI Component**
```typescript
// components/NewFeature.tsx
export function NewFeature() {
  const { data } = useNewFeature();
  // Render
}
```

### Testing Checklist

- [ ] Tenant isolation works
- [ ] RLS policies enforce correctly
- [ ] Contact info privacy maintained
- [ ] Admin approvals required
- [ ] Tier restrictions enforced
- [ ] Email notifications sent
- [ ] Reports accurate
- [ ] Forms validate properly
- [ ] Mobile responsive
- [ ] Loading states shown
- [ ] Error handling graceful

---

## 📚 API Documentation

### RPC Functions

#### Need Actions
```typescript
// Submit for approval
await supabase.rpc('submit_need_for_approval', { need_uuid: 'id' });

// Approve need
await supabase.rpc('approve_need', { 
  need_uuid: 'id', 
  admin_note: 'Looks good!' 
});

// Claim need
await supabase.rpc('claim_need', { 
  need_uuid: 'id', 
  claim_note: 'I can help' 
});

// Complete need
await supabase.rpc('complete_need', { 
  need_uuid: 'id',
  completion_note: 'Done!',
  actual_hours: 5,
  actual_amount: 100
});
```

#### User Actions
```typescript
// Approve user
await supabase.rpc('approve_user', { user_uuid: 'id' });

// Reject user
await supabase.rpc('reject_user', { user_uuid: 'id' });
```

#### Reports
```typescript
// Get top helpers
const { data } = await supabase.rpc('get_top_helpers', { 
  org_uuid: 'org-id', 
  limit_count: 10 
});

// Get fulfillment metrics
const { data } = await supabase.rpc('get_fulfillment_metrics', { 
  org_uuid: 'org-id' 
});

// Export CSV
const { data } = await supabase.rpc('export_needs_csv', { 
  org_uuid: 'org-id' 
});
```

### REST API (SCALE tier only)

```bash
GET /api/v1/needs              # List needs
GET /api/v1/needs/:id          # Get need
GET /api/v1/groups             # List groups
GET /api/v1/reports/dashboard  # Dashboard metrics
```

---

## 🎨 UI Components Built

### Base Components
- ✅ Button (5 variants, 3 sizes)
- ✅ Input, TextArea, Select
- ✅ Badge, Card, Modal
- ✅ Dropdown, Tabs, Table
- ✅ Loading Spinner
- ✅ Empty State
- ✅ Error Message

### Feature Components
- ✅ NeedCard
- ✅ NeedList
- ✅ NeedFilters
- ✅ CreateNeedForm
- ✅ UserTable
- ✅ GroupSelector
- ✅ StatusBadge
- ✅ PrivacySettings

### Layout Components
- ✅ Header
- ✅ Sidebar
- ✅ Footer
- ✅ Breadcrumbs
- ✅ Page Container

---

## 📱 Pages Implementation Status

### Public Pages
- ✅ `/auth/login` - Login page
- ✅ `/auth/signup` - Signup with org selection
- ✅ `/auth/forgot-password` - Password reset

### User Pages
- ✅ `/` - Browse needs (APPROVED_OPEN + CLAIMED_IN_PROGRESS)
- ✅ `/my-needs` - User's requested and claimed needs
- ✅ `/needs/[id]` - Need detail page
- ✅ `/needs/new` - Create need
- ✅ `/profile` - User profile and settings
- ✅ `/pending-approval` - Waiting for admin approval

### Admin Pages
- ✅ `/admin` - Admin dashboard
- ✅ `/admin/needs` - Needs approval queue
- ✅ `/admin/users` - User management
- ✅ `/admin/groups` - Group management
- ✅ `/admin/settings` - Organization settings
- ✅ `/admin/billing` - Plan management (if payments enabled)

### Reports Pages
- ✅ `/reports` - Reports dashboard
- ✅ `/reports/needs` - Needs analytics
- ✅ `/reports/users` - User activity
- ✅ `/reports/groups` - Group performance

---

## 🐛 Troubleshooting

### Common Issues

**Issue: Users can see other org's data**
- Check RLS policies enabled on table
- Verify `organization_id = get_user_organization_id()` in policy
- Confirm user has correct `organization_id`

**Issue: Contact info showing to wrong users**
- Use `needs_with_contact_info` view, not direct table
- Check privacy preference flags
- Verify view CASE statements

**Issue: Feature not gated properly**
- Add server-side check with `org_has_feature()`
- Don't rely only on UI hiding
- Test with curl/Postman

**Issue: Notifications not sending**
- Check email service API key
- Verify `notifications` table has records
- Check notification worker logs

---

## 📄 License

MIT License - see LICENSE file

---

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

---

## 📞 Support

- **Email**: support@yourdomain.com
- **Docs**: docs.yourdomain.com
- **Issues**: GitHub Issues

---

## 🎯 Roadmap

### Q1 2024
- [ ] Mobile apps (React Native)
- [ ] Advanced search
- [ ] File attachments on needs
- [ ] In-app messaging

### Q2 2024
- [ ] API v2 with webhooks
- [ ] Third-party integrations (Slack, Teams)
- [ ] Advanced permissions
- [ ] Multi-language support

### Q3 2024
- [ ] White-label option
- [ ] Custom domains per org
- [ ] Advanced analytics
- [ ] AI-powered matching

---

**Built with ❤️ for mission-driven organizations**
