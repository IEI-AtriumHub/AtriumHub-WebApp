# 🚀 Production Deployment Checklist

## PRE-DEPLOYMENT

### Database Setup
- [ ] Create Supabase project
- [ ] Run schema.sql migration
- [ ] Run rls-policies.sql migration
- [ ] Run functions.sql migration  
- [ ] Run views.sql migration
- [ ] Verify all tables created
- [ ] Verify all RLS policies enabled
- [ ] Test RLS with multiple users
- [ ] Create first Super Admin user

### Environment Configuration
- [ ] Set NEXT_PUBLIC_SUPABASE_URL
- [ ] Set NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] Set SUPABASE_SERVICE_ROLE_KEY (backend only)
- [ ] Set NEXT_PUBLIC_APP_URL
- [ ] Set SESSION_SECRET
- [ ] Set ENCRYPTION_KEY
- [ ] Configure email provider
- [ ] Configure Stripe keys (if payments enabled)
- [ ] Set up file storage (Supabase or S3)

### Domain & DNS
- [ ] Purchase domain (e.g., yourapp.com)
- [ ] Configure wildcard DNS (*.yourapp.com)
- [ ] Add CNAME record pointing to hosting provider
- [ ] Verify DNS propagation
- [ ] Set up SSL certificates (auto via Vercel/Railway)

### Email Service
- [ ] Create SendGrid/Postmark account
- [ ] Verify sending domain
- [ ] Set up SPF/DKIM records
- [ ] Create email templates
- [ ] Test notification emails
- [ ] Configure daily digest schedule

### Payment Setup (Optional)
- [ ] Create Stripe account
- [ ] Get publishable and secret keys
- [ ] Create products for each tier
- [ ] Create prices (monthly/annual)
- [ ] Set up webhook endpoint
- [ ] Test webhook delivery
- [ ] Configure customer portal

---

## DEPLOYMENT

### Build & Deploy
- [ ] Run `npm run build` locally to test
- [ ] Fix any TypeScript errors
- [ ] Fix any build warnings
- [ ] Commit all changes to git
- [ ] Push to main branch
- [ ] Connect repository to Vercel/Railway
- [ ] Configure build settings
- [ ] Add environment variables
- [ ] Deploy to production
- [ ] Verify deployment success

### Subdomain Configuration
- [ ] Test main domain (app.yourapp.com)
- [ ] Test wildcard subdomain (test.app.yourapp.com)
- [ ] Verify subdomain routing works
- [ ] Test org resolution from subdomain
- [ ] Confirm 404 for non-existent orgs

### Security Verification
- [ ] Test HTTPS enforcement
- [ ] Verify security headers present
- [ ] Check CSP (Content Security Policy)
- [ ] Test CORS configuration
- [ ] Verify rate limiting works
- [ ] Test auth flow end-to-end
- [ ] Confirm session timeout works

---

## POST-DEPLOYMENT

### Create First Organization
```sql
INSERT INTO organizations (id, slug, display_name, plan_tier)
VALUES (
  gen_random_uuid(),
  'demo',
  'Demo Organization',
  'STARTER'
);
```

### Promote First Admin
```sql
-- After user signs up
UPDATE users 
SET 
  role = 'SUPER_ADMIN',
  status = 'APPROVED',
  approved_at = NOW(),
  approved_by = id
WHERE email = 'admin@yourdomain.com';
```

### Testing Checklist

#### Authentication
- [ ] Sign up new user
- [ ] Verify email confirmation (if enabled)
- [ ] Log in with credentials
- [ ] Test password reset
- [ ] Test session persistence
- [ ] Test logout

#### Tenant Isolation
- [ ] Create org A (orgA.app.yourapp.com)
- [ ] Create org B (orgB.app.yourapp.com)
- [ ] Create user in org A
- [ ] Create user in org B
- [ ] Verify user A cannot see org B data
- [ ] Verify user B cannot see org A data
- [ ] Test Super Admin can see both

#### User Approval Flow
- [ ] New user signs up
- [ ] Verify user status is PENDING
- [ ] User sees "Pending Approval" page
- [ ] Admin approves user
- [ ] User can now access platform
- [ ] User receives approval email

#### Need Lifecycle
- [ ] User creates DRAFT need
- [ ] User submits for approval
- [ ] Status changes to PENDING_APPROVAL
- [ ] Admin sees in approval queue
- [ ] Admin approves need
- [ ] Status changes to APPROVED_OPEN
- [ ] Other user claims need
- [ ] Status changes to CLAIMED_IN_PROGRESS
- [ ] Admin marks complete
- [ ] Status changes to COMPLETED
- [ ] All parties receive notifications

#### Contact Privacy
- [ ] Create need as User A
- [ ] User B claims need
- [ ] Verify User B sees User A's contact info
- [ ] Verify User C does NOT see contact info
- [ ] Verify admin sees all contact info
- [ ] Test privacy preference toggles

#### Plan Tiers
- [ ] STARTER org tries to create 6th group → should fail
- [ ] STARTER org tries PDF export → should see upgrade prompt
- [ ] GROWTH org creates 10 groups → should succeed
- [ ] GROWTH org exports PDF → should succeed
- [ ] SCALE org accesses API → should succeed

#### Reporting
- [ ] View needs by status report
- [ ] View needs by group report
- [ ] View top helpers
- [ ] View fulfillment metrics
- [ ] Export CSV (all tiers)
- [ ] Export PDF (Growth+ only)
- [ ] Verify calculations accurate

#### Notifications
- [ ] Need submitted → admin notified
- [ ] Need approved → requester notified
- [ ] Need claimed → requester notified
- [ ] Need completed → requester + fulfiller notified
- [ ] User approved → user notified
- [ ] Daily digest → admins notified

#### Mobile Responsiveness
- [ ] Test on iPhone
- [ ] Test on Android
- [ ] Test on tablet
- [ ] Test navigation
- [ ] Test forms
- [ ] Test modals
- [ ] Test tables

#### Performance
- [ ] Page load < 2s
- [ ] API calls < 500ms
- [ ] Images optimized
- [ ] Lazy loading works
- [ ] No console errors
- [ ] No memory leaks

---

## MONITORING

### Set Up Monitoring
- [ ] Add Sentry for error tracking
- [ ] Set up Vercel Analytics
- [ ] Configure Supabase logs
- [ ] Set up uptime monitoring (UptimeRobot)
- [ ] Configure alerting (Slack/Email)

### Key Metrics to Track
- [ ] Active users per org
- [ ] Needs created per day
- [ ] Needs fulfilled per day
- [ ] Average time to fulfillment
- [ ] User approval rate
- [ ] Notification delivery rate
- [ ] Page load times
- [ ] API response times
- [ ] Error rates

### Database Monitoring
- [ ] Enable slow query logging
- [ ] Monitor connection pool usage
- [ ] Track table sizes
- [ ] Monitor RLS policy performance
- [ ] Set up automated backups
- [ ] Test backup restoration

---

## MAINTENANCE

### Weekly Tasks
- [ ] Review error logs
- [ ] Check email delivery rates
- [ ] Monitor resource usage
- [ ] Review pending users
- [ ] Check for security updates

### Monthly Tasks
- [ ] Review analytics
- [ ] User feedback analysis
- [ ] Performance optimization
- [ ] Database maintenance
- [ ] Security audit
- [ ] Backup verification
- [ ] Cost optimization

### Quarterly Tasks
- [ ] Feature usage analysis
- [ ] Plan tier optimization
- [ ] User satisfaction survey
- [ ] Penetration testing
- [ ] Disaster recovery drill
- [ ] Documentation updates

---

## ROLLBACK PLAN

### If Critical Issue Detected
1. **Immediate**: Revert to previous deployment
2. **Investigate**: Check error logs and Sentry
3. **Fix**: Address issue in development
4. **Test**: Thoroughly test fix
5. **Redeploy**: Push fixed version

### Database Rollback
```sql
-- Restore from backup
-- Supabase provides automated backups
-- Contact support for point-in-time recovery
```

---

## SCALING

### When to Scale

#### Database
- Connection pool >80% usage → increase pool size
- Query times >500ms → add indexes
- Table size >100GB → consider partitioning

#### Application
- Response times >2s → add more instances
- Memory usage >80% → increase instance size
- CPU usage >70% sustained → scale horizontally

#### Storage
- Storage >80% → upgrade plan
- Image loading slow → add CDN
- File uploads timing out → increase limits

### Scaling Actions
- [ ] Enable database connection pooling
- [ ] Add read replicas (Enterprise tier)
- [ ] Implement caching (Redis)
- [ ] Add CDN for static assets
- [ ] Horizontal scaling (more instances)
- [ ] Database optimization (indexes, partitions)

---

## SECURITY UPDATES

### Regular Security Tasks
- [ ] Update dependencies monthly
- [ ] Review Snyk/Dependabot alerts
- [ ] Apply security patches within 48 hours
- [ ] Rotate secrets quarterly
- [ ] Review user permissions monthly
- [ ] Audit API access logs
- [ ] Check for SQL injection vectors
- [ ] Test for XSS vulnerabilities

### Incident Response Plan
1. **Detect**: Monitoring alerts team
2. **Assess**: Determine severity
3. **Contain**: Isolate affected systems
4. **Eradicate**: Remove threat
5. **Recover**: Restore normal operations
6. **Review**: Post-mortem analysis

---

## LAUNCH CHECKLIST

### Pre-Launch
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Support email set up
- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] Pricing page live
- [ ] Landing page optimized

### Launch Day
- [ ] Announce on social media
- [ ] Send email to waitlist
- [ ] Monitor errors closely
- [ ] Be available for support
- [ ] Celebrate! 🎉

### Post-Launch (First Week)
- [ ] Daily monitoring
- [ ] Respond to all support requests <24hr
- [ ] Gather user feedback
- [ ] Fix critical bugs immediately
- [ ] Plan first update

---

**Remember**: Start with small scale, monitor closely, optimize iteratively.

**Emergency Contact**: Keep Supabase support email handy for database issues.

**Status Page**: Consider setting up status.yourapp.com for transparency.
