/**
 * Detailed Analytics Report
 * Comprehensive breakdown of app usage
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function detailedAnalytics() {
  console.log('📊 DETAILED ANALYTICS REPORT — AI Content Engine\n');
  console.log('Generated:', new Date().toISOString());
  console.log('='.repeat(70));

  try {
    // Get 30 days ago date
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 1. COMPREHENSIVE USER STATS
    console.log('\n\n👥 USER STATISTICS (DETAILED)');
    console.log('='.repeat(70));

    const totalUsers = await prisma.user.count();
    const usersLast30 = await prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } });
    const usersLast7 = await prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } });

    const usersWithJobs = await prisma.user.count({
      where: { jobs: { some: {} } }
    });

    const guestUsers = await prisma.user.count({
      where: { id: { startsWith: 'guest_' } }
    });

    const authenticatedUsers = totalUsers - guestUsers;

    console.log(`Total Users:              ${totalUsers}`);
    console.log(`  - Authenticated:        ${authenticatedUsers} (${Math.round(authenticatedUsers/totalUsers*100)}%)`);
    console.log(`  - Guest:                ${guestUsers} (${Math.round(guestUsers/totalUsers*100)}%)`);
    console.log(`New Users (Last 30d):     ${usersLast30}`);
    console.log(`New Users (Last 7d):      ${usersLast7}`);
    console.log(`Users with Jobs:          ${usersWithJobs} (${Math.round(usersWithJobs/totalUsers*100)}% activation)`);

    // 2. JOB STATISTICS IN DEPTH
    console.log('\n\n🎬 VIDEO GENERATION STATISTICS (DETAILED)');
    console.log('='.repeat(70));

    const totalJobs = await prisma.job.count();
    const jobsLast30 = await prisma.job.count({ where: { createdAt: { gte: thirtyDaysAgo } } });
    const jobsLast7 = await prisma.job.count({ where: { createdAt: { gte: sevenDaysAgo } } });

    const completedJobs = await prisma.job.count({ where: { status: 'completed' } });
    const failedJobs = await prisma.job.count({ where: { status: 'failed' } });
    const queuedJobs = await prisma.job.count({ where: { status: 'queued' } });
    const processingJobs = await prisma.job.count({ where: { status: 'processing' } });

    const successRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

    console.log(`Total Jobs:               ${totalJobs}`);
    console.log(`  - Completed:            ${completedJobs} (${Math.round(completedJobs/totalJobs*100)}%)`);
    console.log(`  - Failed:               ${failedJobs} (${Math.round(failedJobs/totalJobs*100)}%)`);
    console.log(`  - Queued:               ${queuedJobs} (${Math.round(queuedJobs/totalJobs*100)}%)`);
    console.log(`  - Processing:           ${processingJobs} (${Math.round(processingJobs/totalJobs*100)}%)`);
    console.log(`Success Rate:             ${successRate}%`);
    console.log(`Jobs (Last 30d):          ${jobsLast30}`);
    console.log(`Jobs (Last 7d):           ${jobsLast7}`);
    console.log(`Avg Jobs per User:        ${(totalJobs/totalUsers).toFixed(2)}`);

    // 3. USER ENGAGEMENT COHORTS
    console.log('\n\n📊 USER ENGAGEMENT COHORTS');
    console.log('='.repeat(70));

    const userJobCounts = await prisma.job.groupBy({
      by: ['userId'],
      _count: { id: true }
    });

    const oneTimers = userJobCounts.filter(u => u._count.id === 1).length;
    const lowEngagement = userJobCounts.filter(u => u._count.id >= 2 && u._count.id <= 5).length;
    const mediumEngagement = userJobCounts.filter(u => u._count.id >= 6 && u._count.id <= 10).length;
    const highEngagement = userJobCounts.filter(u => u._count.id > 10).length;

    console.log(`One-time Users (1 job):   ${oneTimers} (${Math.round(oneTimers/totalUsers*100)}%)`);
    console.log(`Low Engagement (2-5):     ${lowEngagement} (${Math.round(lowEngagement/totalUsers*100)}%)`);
    console.log(`Medium Engagement (6-10): ${mediumEngagement} (${Math.round(mediumEngagement/totalUsers*100)}%)`);
    console.log(`High Engagement (10+):    ${highEngagement} (${Math.round(highEngagement/totalUsers*100)}%)`);

    // 4. TOP POWER USERS
    console.log('\n\n🏆 TOP 10 POWER USERS');
    console.log('='.repeat(70));

    const topUsers = await prisma.user.findMany({
      include: {
        _count: { select: { jobs: true } }
      },
      orderBy: {
        jobs: { _count: 'desc' }
      },
      take: 10
    });

    topUsers.forEach((user, idx) => {
      const userId = user.username || user.id.slice(0, 16) + '...';
      const jobCount = user._count.jobs;
      const bar = '█'.repeat(Math.min(jobCount, 50));
      console.log(`${idx + 1}. ${userId.padEnd(20)} ${bar} ${jobCount} jobs`);
    });

    // 5. DAILY ACTIVITY (Last 30 Days)
    console.log('\n\n📅 DAILY ACTIVITY (Last 30 Days)');
    console.log('='.repeat(70));

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const startOfDay = new Date(dateStr + 'T00:00:00Z');
      const endOfDay = new Date(dateStr + 'T23:59:59Z');

      const jobs = await prisma.job.count({
        where: { createdAt: { gte: startOfDay, lte: endOfDay } }
      });

      const users = await prisma.user.count({
        where: { createdAt: { gte: startOfDay, lte: endOfDay } }
      });

      if (jobs > 0 || users > 0) {
        const bar = '█'.repeat(Math.min(jobs, 30));
        console.log(`${dateStr}: ${bar.padEnd(30)} ${jobs}j ${users}u`);
      }
    }

    // 6. FILE TYPES
    console.log('\n\n📁 FILE TYPE BREAKDOWN');
    console.log('='.repeat(70));

    const jobs = await prisma.job.findMany({
      select: { inputFilename: true }
    });

    const fileTypes = jobs.reduce((acc, job) => {
      const ext = job.inputFilename.split('.').pop()?.toLowerCase() || 'unknown';
      acc[ext] = (acc[ext] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(fileTypes)
      .sort(([,a], [,b]) => b - a)
      .forEach(([ext, count]) => {
        const percent = Math.round((count / totalJobs) * 100);
        console.log(`  .${ext.padEnd(10)} ${count.toString().padStart(4)} (${percent}%)`);
      });

    // 7. SUBSCRIPTION ANALYSIS
    console.log('\n\n💳 SUBSCRIPTION & MONETIZATION');
    console.log('='.repeat(70));

    const totalSubs = await prisma.subscription.count();
    const activeSubs = await prisma.subscription.count({
      where: { status: { in: ['active', 'trialing'] } }
    });

    if (totalSubs > 0) {
      const subsByPlan = await prisma.subscription.groupBy({
        by: ['plan', 'status'],
        _count: true
      });

      console.log(`Total Subscriptions:      ${totalSubs}`);
      console.log(`Active Subscriptions:     ${activeSubs}`);
      console.log('\nBreakdown:');
      subsByPlan.forEach(({ plan, status, _count }) => {
        console.log(`  ${plan} (${status}): ${_count}`);
      });

      // Revenue estimate
      const proPlan = await prisma.subscription.count({
        where: { plan: 'PRO', status: { in: ['active', 'trialing'] } }
      });
      const entPlan = await prisma.subscription.count({
        where: { plan: 'ENTERPRISE', status: { in: ['active', 'trialing'] } }
      });

      const mrr = (proPlan * 9.99) + (entPlan * 29.99);
      console.log(`\nEstimated MRR:            $${mrr.toFixed(2)}`);
      console.log(`Estimated ARR:            $${(mrr * 12).toFixed(2)}`);
    } else {
      console.log('No subscriptions yet');
    }

    // 8. MONTHLY USAGE TRENDS
    console.log('\n\n📈 MONTHLY USAGE TRENDS');
    console.log('='.repeat(70));

    const currentMonth = new Date().toISOString().slice(0, 7);
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);

    const currentMonthUsage = await prisma.monthlyUsage.findMany({
      where: { month: currentMonth }
    });

    const lastMonthUsage = await prisma.monthlyUsage.findMany({
      where: { month: lastMonth }
    });

    const currentTotal = currentMonthUsage.reduce((sum, u) => sum + u.videosUsed, 0);
    const lastTotal = lastMonthUsage.reduce((sum, u) => sum + u.videosUsed, 0);

    console.log(`Current Month (${currentMonth}): ${currentTotal} videos from ${currentMonthUsage.length} users`);
    console.log(`Last Month (${lastMonth}):    ${lastTotal} videos from ${lastMonthUsage.length} users`);

    if (lastTotal > 0) {
      const growth = Math.round(((currentTotal - lastTotal) / lastTotal) * 100);
      const trend = growth > 0 ? '📈' : growth < 0 ? '📉' : '➡️';
      console.log(`Growth:                    ${trend} ${growth > 0 ? '+' : ''}${growth}%`);
    }

    // 9. KEY INSIGHTS & RECOMMENDATIONS
    console.log('\n\n💡 KEY INSIGHTS & RECOMMENDATIONS');
    console.log('='.repeat(70));

    const activationRate = Math.round((usersWithJobs / totalUsers) * 100);
    const retentionRate = Math.round((userJobCounts.filter(u => u._count.id > 1).length / totalUsers) * 100);

    console.log(`\n📌 Activation:`);
    if (activationRate < 50) {
      console.log(`   ⚠️  Low activation (${activationRate}%) - improve onboarding`);
    } else if (activationRate < 75) {
      console.log(`   ✅ Good activation (${activationRate}%)`);
    } else {
      console.log(`   🎉 Excellent activation (${activationRate}%)`);
    }

    console.log(`\n📌 Retention:`);
    if (retentionRate < 20) {
      console.log(`   ⚠️  Low retention (${retentionRate}%) - add value for returning users`);
    } else if (retentionRate < 40) {
      console.log(`   ✅ Moderate retention (${retentionRate}%)`);
    } else {
      console.log(`   🎉 Strong retention (${retentionRate}%)`);
    }

    console.log(`\n📌 Job Success:`);
    if (successRate < 70) {
      console.log(`   ⚠️  Low success rate (${successRate}%) - investigate failures`);
    } else if (successRate < 90) {
      console.log(`   ✅ Good success rate (${successRate}%)`);
    } else {
      console.log(`   🎉 Excellent success rate (${successRate}%)`);
    }

    console.log(`\n📌 Monetization:`);
    if (activeSubs === 0) {
      console.log(`   ⚠️  No paid subscribers yet - add upgrade prompts`);
    } else {
      const conversionRate = Math.round((activeSubs / totalUsers) * 100);
      console.log(`   Conversion: ${conversionRate}% (${activeSubs}/${totalUsers})`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('Report Complete ✅');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

detailedAnalytics();
