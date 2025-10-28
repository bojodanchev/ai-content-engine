/**
 * Database Usage Analysis Script
 *
 * Analyzes user activity, video generations, and app usage over the last month
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeUsage() {
  console.log('📊 AI Content Engine - Usage Analysis\n');
  console.log('=' .repeat(60));

  try {
    // 1. Total Users
    const totalUsers = await prisma.user.count();
    const usersLast30Days = await prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    console.log('\n👥 USER STATISTICS');
    console.log('-'.repeat(60));
    console.log(`Total Users: ${totalUsers}`);
    console.log(`New Users (Last 30 Days): ${usersLast30Days}`);

    // 2. Total Jobs
    const totalJobs = await prisma.job.count();
    const jobsLast30Days = await prisma.job.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    // Job Status Breakdown
    const jobsByStatus = await prisma.job.groupBy({
      by: ['status'],
      _count: true
    });

    console.log('\n🎬 VIDEO GENERATION STATISTICS');
    console.log('-'.repeat(60));
    console.log(`Total Jobs: ${totalJobs}`);
    console.log(`Jobs (Last 30 Days): ${jobsLast30Days}`);
    console.log('\nJob Status Breakdown:');
    jobsByStatus.forEach(({ status, _count }) => {
      console.log(`  - ${status}: ${_count}`);
    });

    // 3. Recent Jobs Details
    const recentJobs = await prisma.job.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, username: true }
        }
      }
    });

    if (recentJobs.length > 0) {
      console.log('\n📋 RECENT JOBS (Last 10)');
      console.log('-'.repeat(60));
      recentJobs.forEach((job, index) => {
        const userId = job.user.username || job.userId.slice(0, 12) + '...';
        const created = new Date(job.createdAt).toISOString().split('T')[0];
        console.log(`${index + 1}. [${job.status.toUpperCase()}] ${userId} - ${created}`);
      });
    }

    // 4. Subscriptions
    const totalSubscriptions = await prisma.subscription.count();
    const activeSubscriptions = await prisma.subscription.count({
      where: {
        status: {
          in: ['active', 'trialing']
        }
      }
    });

    const subscriptionsByPlan = await prisma.subscription.groupBy({
      by: ['plan'],
      where: {
        status: {
          in: ['active', 'trialing']
        }
      },
      _count: true
    });

    console.log('\n💳 SUBSCRIPTION STATISTICS');
    console.log('-'.repeat(60));
    console.log(`Total Subscriptions: ${totalSubscriptions}`);
    console.log(`Active Subscriptions: ${activeSubscriptions}`);
    console.log('\nActive Plans:');
    subscriptionsByPlan.forEach(({ plan, _count }) => {
      console.log(`  - ${plan}: ${_count}`);
    });

    // 5. Monthly Usage
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const currentMonthUsage = await prisma.monthlyUsage.findMany({
      where: { month: currentMonth },
      include: {
        user: {
          select: { id: true, username: true }
        }
      }
    });

    const totalVideosThisMonth = currentMonthUsage.reduce((sum, u) => sum + u.videosUsed, 0);

    console.log('\n📈 MONTHLY USAGE (Current Month: ' + currentMonth + ')');
    console.log('-'.repeat(60));
    console.log(`Users with Usage: ${currentMonthUsage.length}`);
    console.log(`Total Videos Processed: ${totalVideosThisMonth}`);

    if (currentMonthUsage.length > 0) {
      console.log('\nTop Users (This Month):');
      const sortedUsage = currentMonthUsage
        .sort((a, b) => b.videosUsed - a.videosUsed)
        .slice(0, 5);

      sortedUsage.forEach((usage, index) => {
        const userId = usage.user.username || usage.userId.slice(0, 12) + '...';
        console.log(`  ${index + 1}. ${userId}: ${usage.videosUsed} videos`);
      });
    }

    // 6. Activity Timeline (Last 7 Days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    console.log('\n📅 ACTIVITY TIMELINE (Last 7 Days)');
    console.log('-'.repeat(60));

    for (const date of last7Days) {
      const startOfDay = new Date(date + 'T00:00:00Z');
      const endOfDay = new Date(date + 'T23:59:59Z');

      const jobsCount = await prisma.job.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      });

      const usersCount = await prisma.user.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      });

      const bar = '█'.repeat(Math.min(jobsCount, 20));
      console.log(`${date}: ${bar} ${jobsCount} jobs, ${usersCount} new users`);
    }

    // 7. User Retention (users who came back)
    const usersWithMultipleJobs = await prisma.user.findMany({
      where: {
        jobs: {
          some: {}
        }
      },
      include: {
        _count: {
          select: { jobs: true }
        }
      }
    });

    const returningUsers = usersWithMultipleJobs.filter(u => u._count.jobs > 1).length;
    const oneTimeUsers = usersWithMultipleJobs.filter(u => u._count.jobs === 1).length;

    console.log('\n🔄 USER RETENTION');
    console.log('-'.repeat(60));
    console.log(`One-time Users: ${oneTimeUsers}`);
    console.log(`Returning Users: ${returningUsers} (${totalUsers > 0 ? Math.round(returningUsers / totalUsers * 100) : 0}%)`);

    if (totalUsers > 0) {
      const avgJobsPerUser = (totalJobs / totalUsers).toFixed(2);
      console.log(`Average Jobs per User: ${avgJobsPerUser}`);
    }

    // 8. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Total Users: ${totalUsers}`);
    console.log(`✅ Total Videos Generated: ${totalJobs}`);
    console.log(`✅ Active Subscriptions: ${activeSubscriptions}`);
    console.log(`✅ Videos This Month: ${totalVideosThisMonth}`);
    console.log(`✅ New Users (30d): ${usersLast30Days}`);
    console.log(`✅ User Retention Rate: ${totalUsers > 0 ? Math.round(returningUsers / totalUsers * 100) : 0}%`);

  } catch (error) {
    console.error('❌ Error analyzing usage:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeUsage();
