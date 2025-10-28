# QA Testing Guide — AI Content Engine

## Overview

This guide explains how to run automated QA tests on the AI Content Engine Whop app. The test suite validates:

1. **Authentication & Access Control** — Whop OAuth, guest access, middleware
2. **Upload Flow** — Presigning, S3 integration, database job creation
3. **Dashboard UI** — Responsiveness, accessibility, component visibility
4. **Download Authorization** — User ownership enforcement, cross-user access prevention
5. **Billing & Subscriptions** — Plan data, quota limits, checkout flows
6. **API Endpoints** — Request/response format, error handling, data integrity

## Quick Start

### 1. Install Playwright

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### 2. Start Development Server

```bash
npm run dev
```

Server will run on http://localhost:3000

### 3. Run All Tests

```bash
npm test
```

### 4. View Results

```bash
npm run test:report
```

## Test Categories

### Authentication Tests (`npm run test:auth`)

Validates authentication flow without requiring real Whop tokens.

**What It Tests:**
- Landing page loads with login button
- Guest users can access dashboard
- Guest ID cookies are created
- Guest cookies persist across sessions
- No errors on unauthenticated access
- Billing verify endpoint is accessible

**Expected Results:**
```
✅ Landing page loads and displays login button
✅ Guest user can access dashboard without Whop token
✅ Guest ID cookie is created and persisted
✅ Guest ID cookie persists across page navigations
✅ Whop user context header is respected by middleware
✅ Billing/verify endpoint returns user context
✅ Failed OAuth callback shows error
```

### Upload Flow Tests (`npm run test:upload`)

**Validates B2 Fix**: Upload presign response now waits for database writes before responding.

**What It Tests:**
- Upload init returns presigned POST policy
- Job is created in database before response ← **B2 Validation**
- Monthly usage is incremented
- Missing fields are rejected with 400
- Presigned URLs have correct S3 fields
- CORS headers are present
- File size limit is enforced

**Expected Results:**
```
✅ Upload init endpoint returns presigned POST policy
✅ Upload init creates job record with correct user
✅ Monthly usage is incremented after presign
✅ Missing filename returns 400 error
✅ Missing contentType returns 400 error
✅ Presigned POST url is valid and has correct fields
✅ Presigned url expires in reasonable time
✅ Upload init has CORS header for cross-origin requests
```

**B2 Validation Details:**
- Job must exist in database immediately after presign request
- Status should be "queued"
- User ID must match current session
- Monthly usage counter must increment

### Dashboard Tests (`npm run test:dashboard`)

**What It Tests:**
- Dashboard loads without authentication
- Upload section is visible
- Jobs list is displayed
- Billing section shows plan
- Mobile responsiveness (375px)
- Tablet responsiveness (768px)
- Accessibility (alt text, labels)
- No console errors

**Expected Results:**
```
✅ Dashboard page loads successfully
✅ Upload section is visible
✅ Jobs list section is present
✅ Billing section displays plan information
✅ Jobs list initially shows no jobs or loading state
✅ Page has no console errors
✅ Navigation elements are visible and clickable
✅ Responsive design works on mobile viewport
✅ Responsive design works on tablet viewport
✅ All images have alt text (accessibility)
✅ Form inputs are properly labeled
```

### Download Tests (`npm run test:download`)

**Validates B3 Fix**: Download endpoint enforces user ownership, prevents cross-user access.

**What It Tests:**
- Non-existent jobs return 404
- User ownership is enforced ← **B3 Validation**
- Cross-user downloads are rejected with 403 ← **B3 Validation**
- Valid downloads return S3 redirect
- Cache headers are set
- Sequential downloads work

**Expected Results:**
```
✅ Non-existent job returns 404
✅ Missing job ID parameter returns 400
✅ Download endpoint returns proper error responses
✅ Completed job returns S3 redirect URL
✅ Download endpoint requires user ownership
✅ S3 redirect includes proper cache headers
✅ Multiple sequential downloads work correctly
```

**B3 Validation Details:**
- Download must verify user owns the job
- Different user should get 403 (Unauthorized)
- Same user in same session should succeed
- Cross-browser/context download should be blocked

### Billing Tests (`npm run test:billing`)

**What It Tests:**
- Billing verify endpoint works
- Plan data includes video limits
- Features are properly defined
- Dashboard shows plan info
- Upgrade buttons are visible
- Free plan has 5 videos/month limit
- Pro plan has 100 videos/month limit
- Enterprise plan is unlimited
- Webhook endpoint exists and validates signatures

**Expected Results:**
```
✅ Billing verify endpoint returns user context
✅ Billing verify returns plan with monthly video limit
✅ Billing verify returns plan features
✅ Billing dashboard section displays plan info
✅ Billing section shows upgrade button for free plan
✅ Monthly usage display is present on dashboard
✅ Checkout session endpoint returns valid data
✅ Free plan shows all limitations correctly
✅ Pro plan has more features than free
✅ Webhook endpoint exists and validates signatures
```

### API Tests (`npm run test:api`)

**What It Tests:**
- Jobs endpoint returns proper format
- Job creation works via API
- Error responses are formatted correctly
- Database maintains data integrity
- Concurrent requests are safe
- SQL injection attempts are prevented
- XSS attempts are sanitized
- API responds within 5 seconds

**Expected Results:**
```
✅ Jobs endpoint returns array or error
✅ Jobs endpoint includes required fields
✅ Create job via POST /api/jobs returns jobId
✅ API returns proper error responses
✅ API handles missing parameters gracefully
✅ API returns consistent error format
✅ Jobs endpoint pagination works
✅ API prevents SQL injection in parameters
✅ API prevents XSS in responses
✅ Database operations maintain data integrity
✅ Concurrent requests are handled safely
✅ API responds within acceptable time
```

## Running Specific Tests

### Test Single Category
```bash
npm run test:auth       # Authentication only
npm run test:upload     # Upload flow only
npm run test:dashboard  # Dashboard UI only
npm run test:download   # Download auth only
npm run test:billing    # Billing flows only
npm run test:api        # API endpoints only
```

### Test Single File
```bash
npx playwright test tests/e2e/auth.spec.ts
```

### Test Matching Pattern
```bash
npx playwright test -g "guest ID"
npx playwright test -g "ownership"
```

### With Browser Visible
```bash
npm run test:headed
```

### Interactive UI Mode
```bash
npm run test:ui
```

### Debug Mode (Step Through)
```bash
npm run test:debug
```

## Bug Fix Validation

### Validating B1 (Worker Error Handling)

The worker now captures `jobId` before the try block, so failed jobs update the DB status.

**Test Method:**
1. Monitor worker logs during test runs
2. Check that failed jobs show status = "failed" in database
3. Run: `npm run test:api` → "database operations maintain integrity"

**Expected Behavior:**
- If FFmpeg fails, job status becomes "failed"
- Error message is stored in metaJson
- Job doesn't remain stuck in "queued"

### Validating B2 (Upload Init Reliability)

Upload init now performs database writes BEFORE responding with presign URL.

**Test Method:**
```bash
npm run test:upload
```

**Key Test:** "Upload init creates job record with correct user"

**Expected Behavior:**
- Job exists in database immediately
- User ID matches session ID
- Status is "queued"
- Monthly usage is incremented
- No race conditions

**Manual Verification:**
```bash
# 1. Start app
npm run dev

# 2. In another terminal, run upload test
npm run test:upload

# 3. Check database for job records
# Jobs should exist immediately after presign
```

### Validating B3 (Download Authorization)

Download endpoint enforces user ownership. Only authenticated user can download their jobs.

**Test Method:**
```bash
npm run test:download
```

**Key Test:** "Download endpoint requires user ownership"

**Expected Behavior:**
- Same user can download their own jobs
- Different user gets 403 Forbidden
- Invalid job IDs get 404
- No 500 errors from authorization

**Manual Verification:**
```bash
# 1. Create a job with guest user
# 2. Try to download with same guest ID (should work)
# 3. Try to download with different guest ID (should fail with 403)
```

## CI/CD Integration

### GitHub Actions Example

Add to `.github/workflows/test.yml`:

```yaml
name: Playwright Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - run: npm ci
      - run: npx playwright install --with-deps

      # Build the app
      - run: npm run build

      # Run tests
      - run: npm test

      # Upload report
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### Pre-Commit Hook

Add to `.husky/pre-push`:

```bash
#!/bin/sh
npm run typecheck && npm test
```

## Troubleshooting

### Tests Won't Start

**Problem:** "Cannot find module @playwright/test"

**Solution:**
```bash
npm install --save-dev @playwright/test
npx playwright install
```

### Tests Timeout

**Problem:** Tests timeout waiting for elements

**Solution:**
1. Ensure dev server is running: `npm run dev`
2. Check network connectivity
3. Increase timeout in `playwright.config.ts`:
   ```typescript
   timeout: 60 * 1000, // 60 seconds
   ```

### Element Not Found

**Problem:** Test can't find upload button or other elements

**Solution:**
1. Run in debug mode: `npm run test:debug`
2. Use the Playwright Inspector to explore DOM
3. Add `data-testid` attributes to components
4. Check for CSS selectors that changed

### Server Connection Failed

**Problem:** "Failed to connect to http://localhost:3000"

**Solution:**
```bash
# Kill any existing dev servers
lsof -i :3000
kill -9 <PID>

# Start fresh
npm run dev
```

## Performance Metrics

Target metrics for test suite:

| Metric | Target | Notes |
| --- | --- | --- |
| **Total Duration** | < 2 min | All tests, single browser |
| **Per Test** | < 5 sec | Average |
| **Startup** | < 10 sec | Including server start |
| **Dashboard Load** | < 3 sec | Dashboard page |
| **API Response** | < 5 sec | Jobs endpoint |
| **Success Rate** | 95%+ | On stable connection |

Monitor with:
```bash
npm test 2>&1 | grep -E "passed|failed|duration"
```

## Test Maintenance

### Adding New Tests

1. Create new `.spec.ts` file in `tests/e2e/`
2. Import `test, expect` from `@playwright/test`
3. Use `test.describe()` for test groups
4. Use `test()` for individual tests
5. Reference elements with:
   - `page.locator()` — CSS/XPath selectors
   - `data-testid` attributes preferred
   - `getByText()` — Text matching
   - `getByRole()` — ARIA roles

### Updating Tests

- When UI changes, update selectors in tests
- Keep tests independent (don't rely on execution order)
- Use proper waits, not `waitForTimeout()`
- Document test intent in comments

### Fixing Flaky Tests

1. **Root Cause:** Usually async operations not waiting
2. **Solution:** Use proper wait mechanisms:
   ```typescript
   // ✅ Good
   await page.waitForLoadState('networkidle');

   // ✅ Good
   await page.locator('button').waitFor({ state: 'visible' });

   // ❌ Bad
   await page.waitForTimeout(5000);
   ```

## Continuous Monitoring

### Weekly Test Runs

```bash
# Run full suite
npm test

# Generate report
npm run test:report

# Check for failures
```

### Monthly Review

- [ ] Review test execution time trends
- [ ] Identify flaky tests
- [ ] Update selectors if UI changed
- [ ] Add tests for new features
- [ ] Update documentation

## Support & Resources

- **Playwright Docs**: https://playwright.dev
- **Best Practices**: https://playwright.dev/docs/best-practices
- **Debugging**: https://playwright.dev/docs/debug
- **GitHub Issues**: Check existing issues before reporting

## Next Steps

1. Install Playwright: `npm install --save-dev @playwright/test`
2. Run tests: `npm test`
3. View report: `npm run test:report`
4. Validate B1, B2, B3 fixes are working
5. Set up CI/CD integration
6. Monitor test performance
