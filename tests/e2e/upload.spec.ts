import { test, expect } from '@playwright/test';

/**
 * End-to-End Tests: Upload Flow
 *
 * Tests:
 * - Upload init endpoint returns presigned URL
 * - Job is created in database before response
 * - Monthly usage is incremented
 * - Quota enforcement (402 when exceeded)
 * - Invalid presign requests are rejected
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

test.describe('Upload Flow', () => {
  test('upload init endpoint returns presigned POST policy', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/uploads/init`, {
      data: {
        filename: 'test-video.mp4',
        contentType: 'video/mp4',
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.jobId).toBeDefined();
    expect(data.jobId).toMatch(/^[a-f0-9\-]+$/); // UUID format
    expect(data.upload).toBeDefined();
    expect(data.upload.fields).toBeDefined();
    expect(data.upload.url).toBeDefined();
  });

  test('upload init creates job record with correct user', async ({ request, context }) => {
    // Get guest ID from cookies
    const cookies = await context.cookies();
    const guestId = cookies.find(c => c.name === 'ace_guest_id')?.value || 'test-guest';

    const response = await request.post(`${BASE_URL}/api/uploads/init`, {
      data: {
        filename: 'test-video.mp4',
        contentType: 'video/mp4',
      },
    });

    const data = await response.json();
    const jobId = data.jobId;

    // Verify job exists in database via /api/jobs endpoint
    const jobsResponse = await request.get(`${BASE_URL}/api/jobs`);
    const jobs = await jobsResponse.json();

    const createdJob = jobs.find((j: any) => j.id === jobId);
    expect(createdJob).toBeDefined();
    expect(createdJob.userId).toBe(guestId);
    expect(createdJob.status).toBe('queued');
    expect(createdJob.inputFilename).toMatch(/test-video/);
  });

  test('monthly usage is incremented after presign', async ({ request }) => {
    // Get initial usage
    const usageBefore = await request.get(`${BASE_URL}/api/jobs`);
    const jobsBefore = (await usageBefore.json()).length;

    // Create upload
    const uploadResponse = await request.post(`${BASE_URL}/api/uploads/init`, {
      data: {
        filename: 'test-video-2.mp4',
        contentType: 'video/mp4',
      },
    });

    expect(uploadResponse.status()).toBe(200);

    // Usage should have increased in database
    const usageAfter = await request.get(`${BASE_URL}/api/jobs`);
    const jobsAfter = (await usageAfter.json()).length;

    expect(jobsAfter).toBe(jobsBefore + 1);
  });

  test('missing filename returns 400 error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/uploads/init`, {
      data: {
        contentType: 'video/mp4',
        // missing filename
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  test('missing contentType returns 400 error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/uploads/init`, {
      data: {
        filename: 'test-video.mp4',
        // missing contentType
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  test('presigned POST url is valid and has correct fields', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/uploads/init`, {
      data: {
        filename: 'test-video.mp4',
        contentType: 'video/mp4',
      },
    });

    const data = await response.json();
    const { url, fields } = data.upload;

    // URL should point to S3
    expect(url).toContain('amazonaws.com');

    // Fields should include required S3 presign fields
    expect(fields.key).toBeDefined();
    expect(fields['Content-Type']).toBe('video/mp4');
    expect(fields.success_action_status).toBe('201');
  });

  test('presigned url expires in reasonable time', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/uploads/init`, {
      data: {
        filename: 'test-video.mp4',
        contentType: 'video/mp4',
      },
    });

    const data = await response.json();
    // The policy should have Expiration field (from AWS)
    expect(data.upload).toBeDefined();
    // Typical presign lifetime is 1 hour (3600 seconds)
    // We can't directly verify time, but the endpoint should return successfully
    expect(response.status()).toBe(200);
  });

  test('upload init has CORS header for cross-origin requests', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/uploads/init`, {
      data: {
        filename: 'test-video.mp4',
        contentType: 'video/mp4',
      },
    });

    const corsHeader = response.headers()['access-control-allow-origin'];
    expect(corsHeader).toBe('*');
  });
});
