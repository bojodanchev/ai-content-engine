# Usage & Analytics Report — AI Content Engine (2025-10-28)

**Report Date**: 2025-10-28
**App**: AI Content Engine (Whop)
**Status**: Analytics Integration Added

---

## Executive Summary

✅ **Vercel Analytics Installed** — Now tracking user behavior
📊 **Database Analysis Script Created** — Ready to query usage metrics
⚠️ **Historical Data**: Cannot access production database locally
🔍 **Next Steps**: Run analytics on production or set up .env with DATABASE_URL

---

## Analytics Integration Complete

### 1. Vercel Analytics Installed ✅

**Package**: `@vercel/analytics@^1.5.0`

**Integration**: Added to `app/layout.tsx`

```typescript
import { Analytics } from "@vercel/analytics/next";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-[#0A0A0A] text-white">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

**What It Tracks**:
- ✅ Page views (/, /dashboard, /api/*)
- ✅ User sessions
- ✅ Geographic data (country, city)
- ✅ Device types (mobile, desktop, tablet)
- ✅ Browser & OS data
- ✅ Page load performance
- ✅ Bounce rates
- ✅ Conversion funnels

**Access**: Once deployed, visit [Vercel Dashboard → Your Project → Analytics](https://vercel.com/dashboard)

---

## Database Usage Analysis Script Created ✅

**Location**: `scripts/analyze-usage.ts`

**Capabilities**:
- 👥 Total users & new users (last 30 days)
- 🎬 Total video generations & job status breakdown
- 💳 Subscription statistics by plan (FREE/PRO/ENTERPRISE)
- 📈 Monthly usage tracking
- 📅 Activity timeline (last 7 days)
- 🔄 User retention metrics
- 📊 Top users by video count

**Usage**:
```bash
# On production or with DATABASE_URL set:
npx ts-node scripts/analyze-usage.ts
```

**Sample Output**:
```
📊 AI Content Engine - Usage Analysis
============================================================

👥 USER STATISTICS
------------------------------------------------------------
Total Users: 42
New Users (Last 30 Days): 12

🎬 VIDEO GENERATION STATISTICS
------------------------------------------------------------
Total Jobs: 128
Jobs (Last 30 Days): 87
Job Status Breakdown:
  - completed: 95
  - queued: 8
  - processing: 3
  - failed: 22

📋 RECENT JOBS (Last 10)
------------------------------------------------------------
1. [COMPLETED] user_abc123... - 2025-10-27
2. [COMPLETED] user_def456... - 2025-10-27
...

💳 SUBSCRIPTION STATISTICS
------------------------------------------------------------
Total Subscriptions: 15
Active Subscriptions: 12
Active Plans:
  - FREE: 30
  - PRO: 10
  - ENTERPRISE: 2

📈 MONTHLY USAGE (Current Month: 2025-10)
------------------------------------------------------------
Users with Usage: 18
Total Videos Processed: 87
Top Users (This Month):
  1. user_abc123...: 15 videos
  2. user_def456...: 12 videos
  ...

📅 ACTIVITY TIMELINE (Last 7 Days)
------------------------------------------------------------
2025-10-21: ████ 4 jobs, 2 new users
2025-10-22: ██████ 6 jobs, 1 new users
2025-10-23: ███████████ 11 jobs, 3 new users
...

🔄 USER RETENTION
------------------------------------------------------------
One-time Users: 25
Returning Users: 17 (40%)
Average Jobs per User: 3.05

============================================================
📊 SUMMARY
============================================================
✅ Total Users: 42
✅ Total Videos Generated: 128
✅ Active Subscriptions: 12
✅ Videos This Month: 87
✅ New Users (30d): 12
✅ User Retention Rate: 40%
```

---

## Metrics We Can Track

### User Metrics
- **Total Users**: All registered users
- **Active Users (30d)**: Users who created jobs in last 30 days
- **New Users (30d)**: Users who signed up in last 30 days
- **User Retention Rate**: % of users who return after first job
- **Average Jobs per User**: Total jobs / total users

### Video Generation Metrics
- **Total Videos Processed**: All completed jobs
- **Videos This Month**: Jobs created in current month
- **Jobs by Status**: Breakdown (completed, queued, processing, failed)
- **Success Rate**: Completed jobs / total jobs
- **Average Processing Time**: Time from queued → completed

### Subscription Metrics
- **Active Subscriptions**: Users with active plan
- **Plan Distribution**: FREE vs PRO vs ENTERPRISE breakdown
- **Monthly Recurring Revenue (MRR)**: (PRO_count × $9.99) + (ENT_count × $29.99)
- **Upgrade Rate**: % of FREE users who upgrade
- **Churn Rate**: % of paid users who downgrade/cancel

### Engagement Metrics
- **Daily Active Users (DAU)**: Users who visit per day
- **Monthly Active Users (MAU)**: Users who visit per month
- **Stickiness**: DAU / MAU ratio
- **Session Duration**: Average time spent per session
- **Bounce Rate**: % of users who leave after one page

---

## How to Access Production Metrics

### Option 1: Vercel Analytics Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `aicontentengine-whopapp`
3. Click "Analytics" tab
4. View:
   - **Page views** — Which pages get most traffic
   - **Top paths** — Most visited URLs
   - **Referrers** — Where users come from
   - **Devices** — Mobile vs Desktop split
   - **Geography** — User locations
   - **Performance** — Page load times

### Option 2: Database Query (Production)

**Via Vercel CLI**:
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Pull environment variables
vercel env pull .env.local

# Run analysis script
npx ts-node scripts/analyze-usage.ts
```

**Via Neon Dashboard**:
1. Go to [Neon Console](https://console.neon.tech)
2. Select your database
3. Open "SQL Editor"
4. Run queries:

```sql
-- Total users
SELECT COUNT(*) FROM "User";

-- Jobs by status
SELECT status, COUNT(*) FROM "Job" GROUP BY status;

-- Active subscriptions
SELECT plan, COUNT(*) FROM "Subscription" WHERE status IN ('active', 'trialing') GROUP BY plan;

-- Recent activity
SELECT DATE("createdAt"), COUNT(*) FROM "Job" WHERE "createdAt" > NOW() - INTERVAL '7 days' GROUP BY DATE("createdAt") ORDER BY DATE("createdAt");
```

### Option 3: Custom Analytics API

Create an API route to expose metrics:

**File**: `app/api/admin/stats/route.ts`
```typescript
import { getDb } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  // Add authentication check here
  const db = getDb();

  const stats = {
    totalUsers: await db.user.count(),
    totalJobs: await db.job.count(),
    jobsByStatus: await db.job.groupBy({
      by: ['status'],
      _count: true
    }),
    activeSubscriptions: await db.subscription.count({
      where: { status: { in: ['active', 'trialing'] } }
    })
  };

  return Response.json(stats);
}
```

Then access: `https://your-app.com/api/admin/stats?key=SECRET`

---

## Recommended Analytics Setup

### Immediate (Next Deployment)

1. ✅ **Vercel Analytics** — Already added, will start tracking after deploy
2. ⬜ **Add Admin Stats API** — Create `/api/admin/stats` endpoint
3. ⬜ **Set Up Cron Job** — Weekly automated reports

### Short-term (Next Week)

4. ⬜ **Posthog or Mixpanel** — For advanced event tracking
   - Track specific user actions (upload, download, upgrade)
   - Create funnels (landing → upload → completed)
   - Cohort analysis

5. ⬜ **Sentry** — Error tracking
   - Monitor production errors
   - Track worker failures
   - Alert on critical issues

6. ⬜ **LogRocket or FullStory** — Session replay
   - See exactly how users interact
   - Identify UX issues
   - Debug user-reported problems

### Long-term (Next Month)

7. ⬜ **Custom Dashboard** — Build internal analytics page
   - Real-time metrics
   - Historical trends
   - Subscription tracking
   - Revenue charts

8. ⬜ **Email Reports** — Automated weekly summaries
   - Send to stakeholders
   - Key metrics & trends
   - Action items

---

## Key Questions to Answer

### User Acquisition
- ❓ How many users sign up per week?
- ❓ Where do users come from? (Whop marketplace, direct, referral)
- ❓ What's the conversion rate from landing page → sign up?

### User Engagement
- ❓ How many users complete their first video?
- ❓ What % of users return after first job?
- ❓ How long does an average session last?
- ❓ Which features are most used?

### Monetization
- ❓ What % of users upgrade from FREE to PRO?
- ❓ How long until users upgrade (avg)?
- ❓ What's the churn rate for paid users?
- ❓ What's the Monthly Recurring Revenue (MRR)?

### Product Health
- ❓ What's the job success rate?
- ❓ How long does processing take (avg)?
- ❓ What causes job failures?
- ❓ Are there performance bottlenecks?

---

## Sample Queries for Manual Analysis

### Total Users & Jobs
```sql
SELECT
  (SELECT COUNT(*) FROM "User") as total_users,
  (SELECT COUNT(*) FROM "Job") as total_jobs,
  (SELECT COUNT(*) FROM "Job" WHERE status = 'completed') as completed_jobs,
  (SELECT COUNT(*) FROM "Subscription" WHERE status = 'active') as active_subs;
```

### Growth Over Time
```sql
SELECT
  DATE_TRUNC('week', "createdAt") as week,
  COUNT(*) as new_users
FROM "User"
WHERE "createdAt" > NOW() - INTERVAL '3 months'
GROUP BY week
ORDER BY week DESC;
```

### Top Users by Video Count
```sql
SELECT
  u.id,
  u.username,
  COUNT(j.id) as video_count,
  MAX(j."createdAt") as last_activity
FROM "User" u
LEFT JOIN "Job" j ON u.id = j."userId"
GROUP BY u.id, u.username
ORDER BY video_count DESC
LIMIT 10;
```

### Revenue Estimate
```sql
SELECT
  plan,
  COUNT(*) as subscribers,
  CASE
    WHEN plan = 'PRO' THEN COUNT(*) * 9.99
    WHEN plan = 'ENTERPRISE' THEN COUNT(*) * 29.99
    ELSE 0
  END as monthly_revenue
FROM "Subscription"
WHERE status IN ('active', 'trialing')
GROUP BY plan;
```

---

## Next Steps

### To Get Historical Data

1. **Connect to Production Database**:
   ```bash
   # Get DATABASE_URL from Vercel
   vercel env pull .env.local

   # Run analysis
   npx ts-node scripts/analyze-usage.ts
   ```

2. **Or Use Neon Dashboard**:
   - Login to [Neon Console](https://console.neon.tech)
   - Run SQL queries manually

3. **Or Build Admin Dashboard**:
   - Create `/admin` page with charts
   - Use Recharts or Chart.js for visualizations

### To Enable Real-Time Tracking

1. **Deploy Latest Changes**:
   ```bash
   git push origin main
   ```

2. **Wait 24 Hours** for Vercel Analytics to collect data

3. **Check Vercel Dashboard** for:
   - Page views
   - User sessions
   - Top paths
   - Device breakdown

---

## Conclusion

✅ **Analytics foundation is now in place.**

Once you deploy the latest changes with Vercel Analytics, you'll start seeing:
- Real-time user activity
- Page view trends
- Geographic distribution
- Device & browser stats

To see historical database metrics (users, jobs, subscriptions), you'll need to:
1. Connect to production database (via Vercel env vars)
2. Run `scripts/analyze-usage.ts`
3. Or query directly via Neon dashboard

**Estimated time to first insights**: 24 hours after deployment

---

**Created**: 2025-10-28
**Last Updated**: 2025-10-28
**Script**: `scripts/analyze-usage.ts`
**Analytics**: Vercel Analytics (integrated)
