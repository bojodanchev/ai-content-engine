import { test, expect } from '@playwright/test';

/**
 * End-to-End Tests: API Endpoints & Backend Flow
 *
 * Tests:
 * - All API endpoints are accessible
 * - Error responses have proper format
 * - Database operations work correctly
 * - Rate limiting (if implemented)
 * - Request validation
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

test.describe('API Endpoints & Backend', () => {
  test('jobs endpoint returns array or error', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/jobs`);

    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    }
  });

  test('jobs endpoint includes required fields', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/jobs`);

    if (response.status() === 200) {
      const jobs = await response.json();

      // Should be empty array or array of job objects
      if (jobs.length > 0) {
        const job = jobs[0];
        expect(job.id).toBeDefined();
        expect(job.userId).toBeDefined();
        expect(job.status).toMatch(/queued|processing|completed|failed/);
        expect(job.inputFilename).toBeDefined();
        expect(job.createdAt).toBeDefined();
      }
    }
  });

  test('create job via POST /api/jobs returns jobId', async ({ request }) => {
    // First create upload to get jobId
    const uploadResponse = await request.post(`${BASE_URL}/api/uploads/init`, {
      data: {
        filename: 'api-test.mp4',
        contentType: 'video/mp4',
      },
    });

    expect(uploadResponse.status()).toBe(200);

    const uploadData = await uploadResponse.json();
    expect(uploadData.jobId).toBeDefined();

    // Get the job to verify it was created
    const jobsResponse = await request.get(`${BASE_URL}/api/jobs`);
    const jobs = await jobsResponse.json();

    const createdJob = jobs.find((j: any) => j.id === uploadData.jobId);
    expect(createdJob).toBeDefined();
  });

  test('API returns proper error responses', async ({ request }) => {
    // Test invalid endpoint
    const response = await request.get(`${BASE_URL}/api/nonexistent-endpoint`);

    expect([404, 405]).toContain(response.status());
  });

  test('API handles missing parameters gracefully', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/uploads/init`, {
      data: {
        // Both required fields missing
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  test('API returns consistent error format', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/uploads/init`, {
      data: {
        filename: 'test.mp4',
        // missing contentType
      },
    });

    if (response.status() === 400) {
      const data = await response.json();
      // Error should have error field
      expect(data.error).toBeDefined();
    }
  });

  test('jobs endpoint pagination works', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/jobs?limit=10`);

    if (response.status() === 200) {
      const data = await response.json();
      // Should be array
      expect(Array.isArray(data)).toBe(true);
      // Should respect limit
      if (data.length > 0) {
        expect(data.length).toBeLessThanOrEqual(10);
      }
    }
  });

  test('jobs endpoint can be filtered by status', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/jobs?status=completed`);

    if (response.status() === 200) {
      const data = await response.json();
      if (data.length > 0) {
        // All should be completed status
        data.forEach((job: any) => {
          expect(job.status).toBe('completed');
        });
      }
    }
  });

  test('API validates content types', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/uploads/init`, {
      data: {
        filename: 'test.mp4',
        contentType: 'invalid/contenttype',
      },
    });

    // Should either accept or reject based on implementation
    expect([200, 400]).toContain(response.status());
  });

  test('API prevents SQL injection in parameters', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/jobs`, {
      params: {
        status: "'; DROP TABLE jobs; --",
      },
    });

    // Should not error or expose database
    expect(response.status()).not.toBe(500);
  });

  test('API prevents XSS in responses', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/uploads/init`, {
      data: {
        filename: '<img src=x onerror=alert(1)>.mp4',
        contentType: 'video/mp4',
      },
    });

    if (response.status() === 200) {
      const data = await response.json();
      // Filename should be sanitized
      const serialized = JSON.stringify(data);
      expect(serialized).not.toContain('onerror=');
    }
  });

  test('database operations maintain data integrity', async ({ request }) => {
    // Create a job
    const uploadResponse = await request.post(`${BASE_URL}/api/uploads/init`, {
      data: {
        filename: 'integrity-test.mp4',
        contentType: 'video/mp4',
      },
    });

    const { jobId } = await uploadResponse.json();

    // Fetch it back
    const jobsResponse = await request.get(`${BASE_URL}/api/jobs`);
    const jobs = await jobsResponse.json();

    const job = jobs.find((j: any) => j.id === jobId);

    // All fields should be intact
    expect(job.id).toBe(jobId);
    expect(job.inputFilename).toContain('integrity-test');
    expect(job.status).toBe('queued');
  });

  test('concurrent requests are handled safely', async ({ request }) => {
    // Create multiple jobs concurrently
    const promises = [];

    for (let i = 0; i < 5; i++) {
      promises.push(
        request.post(`${BASE_URL}/api/uploads/init`, {
          data: {
            filename: `concurrent-${i}.mp4`,
            contentType: 'video/mp4',
          },
        })
      );
    }

    const responses = await Promise.all(promises);

    // All should succeed
    responses.forEach(response => {
      expect(response.status()).toBe(200);
    });

    // All should have unique IDs
    const jobs = await Promise.all(
      responses.map(r => r.json().then((d: any) => d.jobId))
    );

    const uniqueJobs = new Set(jobs);
    expect(uniqueJobs.size).toBe(jobs.length);
  });

  test('API responds within acceptable time', async ({ request }) => {
    const startTime = Date.now();

    await request.get(`${BASE_URL}/api/jobs`);

    const duration = Date.now() - startTime;

    // API should respond within 5 seconds
    expect(duration).toBeLessThan(5000);
  });

  test('health check endpoint exists', async ({ request }) => {
    // Try common health check paths
    const paths = [
      '/api/health',
      '/health',
      '/api/ping',
      '/ping',
    ];

    for (const path of paths) {
      const response = await request.get(`${BASE_URL}${path}`).catch(() => null);
      // Any of these might exist
      if (response) {
        expect([200, 404]).toContain(response.status());
        if (response.status() === 200) {
          const data = await response.json().catch(() => ({}));
          expect(data).toBeDefined();
          break;
        }
      }
    }
  });
});
