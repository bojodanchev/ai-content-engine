# Automated QA Tests — Playwright E2E Suite

Comprehensive automated testing for the AI Content Engine Whop app using Playwright.

## Test Coverage

### 1. **Authentication & Access Control** (`auth.spec.ts`)
- ✅ Landing page loads with login button
- ✅ Guest users can access dashboard (unauthenticated)
- ✅ Guest ID cookies are created and persisted
- ✅ Guest ID remains consistent across sessions
- ✅ Middleware respects Whop user context headers
- ✅ Billing verify endpoint is accessible

### 2. **Upload Flow** (`upload.spec.ts`)
- ✅ Upload init returns presigned POST policy
- ✅ Job records are created in database before response (B2 fix validation)
- ✅ Monthly usage is incremented after presign
- ✅ Missing fields return 400 errors
- ✅ Presigned URLs have correct S3 fields
- ✅ CORS headers are present for cross-origin uploads

### 3. **Dashboard UI** (`dashboard.spec.ts`)
- ✅ Dashboard page loads without authentication
- ✅ Upload section is visible
- ✅ Jobs list section is present
- ✅ Billing section displays plan information
- ✅ No console errors on page load
- ✅ Mobile responsiveness (375px viewport)
- ✅ Tablet responsiveness (768px viewport)
- ✅ Semantic HTML structure
- ✅ Image alt text (accessibility)
- ✅ Form labels (accessibility)

### 4. **Download Flow & Authorization** (`download.spec.ts`)
- ✅ Non-existent jobs return 404
- ✅ Missing job ID returns error
- ✅ User ownership is enforced (B3 fix validation)
- ✅ Cross-user downloads are rejected with proper status
- ✅ Valid S3 redirects are returned
- ✅ Cache headers are properly set
- ✅ Sequential downloads work correctly

### 5. **Billing & Subscriptions** (`billing.spec.ts`)
- ✅ Verify endpoint returns user context
- ✅ Plan data includes monthly video limits
- ✅ Plan features are properly defined
- ✅ Dashboard displays current plan
- ✅ Upgrade buttons are visible for free plans
- ✅ Usage tracking is displayed
- ✅ Checkout session endpoint works
- ✅ Free plan limitations are enforced
- ✅ Pro plan has more features than free
- ✅ Webhook endpoint validates signatures

### 6. **API Endpoints & Backend** (`api.spec.ts`)
- ✅ Jobs endpoint returns array
- ✅ Jobs include required fields (id, userId, status, etc.)
- ✅ Job creation via API works
- ✅ Error responses have proper format
- ✅ Missing parameters return 400
- ✅ Pagination works correctly
- ✅ Status filtering works
- ✅ SQL injection attempts are prevented
- ✅ XSS attempts are sanitized
- ✅ Database maintains data integrity
- ✅ Concurrent requests are safe
- ✅ API responds within 5 seconds

## Installation

```bash
# Install Playwright (already in test environment)
npm install --save-dev @playwright/test

# Install browsers
npx playwright install
```

## Running Tests

### All Tests
```bash
npx playwright test
```

### Specific Test File
```bash
npx playwright test tests/e2e/auth.spec.ts
npx playwright test tests/e2e/upload.spec.ts
npx playwright test tests/e2e/dashboard.spec.ts
npx playwright test tests/e2e/download.spec.ts
npx playwright test tests/e2e/billing.spec.ts
npx playwright test tests/e2e/api.spec.ts
```

### Specific Test
```bash
npx playwright test -g "landing page loads"
```

### With Browser Visible
```bash
npx playwright test --headed
```

### Debug Mode
```bash
npx playwright test --debug
```

### Single Browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Mobile Testing
```bash
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
```

## Configuration

Edit `playwright.config.ts` to customize:
- Base URL (default: `http://localhost:3000`)
- Browsers to test (Chrome, Firefox, Safari, Edge, Mobile)
- Timeouts and retries
- Screenshot/video capture behavior
- Reporter format

## Environment Variables

```bash
# Base URL (defaults to http://localhost:3000)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# CI environment
CI=true
```

## Reports

Test results are generated in multiple formats:

- **HTML Report**: `playwright-report/index.html`
  - Open after tests: `npx playwright show-report`

- **JSON**: `test-results/results.json`
  - Machine-readable results for CI/CD integration

- **JUnit XML**: `test-results/junit.xml`
  - For GitHub Actions and other CI systems

- **Console**: Live output during test run

## CI/CD Integration

### GitHub Actions

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
      - run: npm install
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## Test Quality Metrics

| Metric | Target | Current |
| --- | --- | --- |
| **Test Count** | 50+ | ✅ 45+ |
| **Coverage** | Auth, Upload, UI, Download, Billing, API | ✅ Complete |
| **Success Rate** | 95%+ | ⏳ To be measured |
| **Average Duration** | < 60s | ⏳ To be measured |
| **Browser Coverage** | Chrome, Firefox, Safari, Mobile | ✅ Complete |

## Validation Checklist

After running tests, verify:

- [ ] **B1 Fix**: Worker errors properly update job status
  - Check: `api.spec.ts` → database integrity test
  - Check: `download.spec.ts` → job status flows

- [ ] **B2 Fix**: Upload init creates jobs before responding
  - Check: `upload.spec.ts` → "job record creation" test
  - Check: `api.spec.ts` → concurrent requests test

- [ ] **B3 Fix**: Download enforces user ownership
  - Check: `download.spec.ts` → "ownership" test
  - Check: `api.spec.ts` → request validation

- [ ] **SDK 0.0.51**: All API calls remain compatible
  - Check: `billing.spec.ts` → billing/verify endpoint
  - Check: No 500 errors in any test

- [ ] **UI Health**: Dashboard renders on all viewports
  - Check: `dashboard.spec.ts` → mobile/tablet tests
  - Check: No console errors

## Troubleshooting

### Tests Won't Run
```bash
# Ensure dev server is running
npm run dev

# Or configure webServer in playwright.config.ts
```

### Tests Timeout
```bash
# Increase timeout in playwright.config.ts
timeout: 60 * 1000

# Or set globally
PLAYWRIGHT_TIMEOUT=60000
```

### Browser Installation Issues
```bash
# Reinstall browser binaries
npx playwright install
npx playwright install-deps
```

### Can't Find Elements
```bash
# Use debug mode to inspect DOM
npx playwright test --debug

# Or view trace
npx playwright show-trace trace.zip
```

## Best Practices

1. **Keep Tests Independent**: Each test should not rely on another
2. **Use Data Attributes**: Add `data-testid` to important elements
3. **Wait for Network**: Use `waitForLoadState('networkidle')` for async operations
4. **Handle Flakiness**: Use proper waits and timeouts, not `waitForTimeout()`
5. **Clean Up**: Each test creates new data, no cleanup needed for stateless tests
6. **Parallel Safe**: Tests should not interfere with each other

## Future Enhancements

- [ ] Video upload integration test (actual file upload)
- [ ] Worker processing validation (check S3 output)
- [ ] Whop OAuth flow integration test
- [ ] Performance benchmarks
- [ ] Load testing (multiple concurrent users)
- [ ] Visual regression testing
- [ ] Accessibility audit (axe-core integration)

## Support

For issues or questions:
1. Check Playwright docs: https://playwright.dev
2. Review test logs in `playwright-report/`
3. Check for console errors in test output
4. Enable debug mode for detailed step tracing
