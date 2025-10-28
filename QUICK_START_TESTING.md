# Quick Start: Run Automated QA Tests

## 30-Second Setup

```bash
# 1. Install test framework
npm install

# 2. Install browsers
npx playwright install

# 3. Start dev server (in new terminal)
npm run dev

# 4. Run all tests (in another terminal)
npm test

# 5. View results
npm run test:report
```

## One-Liner Commands

```bash
# Everything at once (requires dev server running)
npm install && npx playwright install && npm test

# Run specific test suite
npm run test:auth        # Authentication tests
npm run test:upload      # Upload flow tests (validates B2)
npm run test:dashboard   # Dashboard UI tests
npm run test:download    # Download auth tests (validates B3)
npm run test:billing     # Billing tests
npm run test:api         # API endpoint tests

# Debug mode (step through tests)
npm run test:debug

# With browser visible
npm run test:headed

# Interactive UI
npm run test:ui
```

## What Gets Tested

### 45+ Automated Tests Covering:

✅ **Authentication** (7 tests)
- Guest access
- Cookie persistence
- No auth errors

✅ **Upload Flow** (8 tests)
- Presigned POST generation
- **Job creation before response** (B2 fix)
- Usage tracking

✅ **Dashboard UI** (11 tests)
- Mobile responsive
- Tablet responsive
- Accessibility

✅ **Download Auth** (8 tests)
- **User ownership enforcement** (B3 fix)
- 403 on unauthorized access
- S3 redirects

✅ **Billing** (11 tests)
- Plan limits (FREE: 5, PRO: 100, ENT: unlimited)
- Plan features
- Webhook validation

✅ **API** (12 tests)
- Endpoint format
- Error handling
- SQL injection prevention
- XSS sanitization
- Concurrent request safety

## Understanding Test Results

### All Pass ✅
```
45 passed (45s)
```
Everything working correctly!

### Some Fail ❌
```
43 passed, 2 failed
```
Check the HTML report: `npm run test:report`

### Test Timeout ⏱️
```
waiting for locator
```
Dev server not running or page loading slow. Start: `npm run dev`

## Validating the 3 Bug Fixes

### B1: Worker Error Handler
**Test**: `npm run test:api`
**Look for**: "database operations maintain integrity" ✅

### B2: Upload Init Race Condition
**Test**: `npm run test:upload`
**Look for**: "Upload init creates job record" ✅

### B3: Download Authorization
**Test**: `npm run test:download`
**Look for**: "Download endpoint requires user ownership" ✅

## Expected Output

```
Running 45 tests using 1 worker
✓ [chromium] › tests/e2e/auth.spec.ts:8:5 › landing page loads
✓ [chromium] › tests/e2e/auth.spec.ts:12:5 › guest user can access
✓ [chromium] › tests/e2e/upload.spec.ts:8:5 › upload init returns
✓ [chromium] › tests/e2e/upload.spec.ts:13:5 › upload init creates job ← B2
✓ [chromium] › tests/e2e/download.spec.ts:20:5 › download requires ownership ← B3
✓ [chromium] › tests/e2e/billing.spec.ts:8:5 › billing verify returns
✓ [chromium] › tests/e2e/dashboard.spec.ts:10:5 › dashboard loads
... (39 more tests)

45 passed (2m 15s)
```

## Troubleshooting

| Problem | Solution |
| --- | --- |
| "Cannot find module" | Run `npm install` |
| "Cannot find browser" | Run `npx playwright install` |
| "Connection refused" | Run `npm run dev` in another terminal |
| "Element not found" | Run `npm run test:debug` and inspect |
| "Test timeout" | Increase timeout or ensure stable connection |

## Files You Created

```
tests/
├── e2e/
│   ├── auth.spec.ts          ← 7 tests
│   ├── upload.spec.ts        ← 8 tests (B2 validation)
│   ├── dashboard.spec.ts     ← 11 tests
│   ├── download.spec.ts      ← 8 tests (B3 validation)
│   ├── billing.spec.ts       ← 11 tests
│   └── api.spec.ts           ← 12 tests
└── README.md

playwright.config.ts
TESTING_GUIDE.md
QA_SUMMARY.md
QUICK_START_TESTING.md (← you are here)
```

## Next Steps

1. ✅ Install and run: `npm install && npm test`
2. ✅ View report: `npm run test:report`
3. ✅ Validate fixes: Check for B1, B2, B3 test results
4. ✅ Set up CI/CD: Add GitHub Actions (see TESTING_GUIDE.md)
5. ✅ Monitor: Keep watching for test failures

## Full Documentation

For more details, see:
- **TESTING_GUIDE.md** — Complete testing guide
- **tests/README.md** — Test reference
- **QA_SUMMARY.md** — Full QA report
- **playwright.config.ts** — Test configuration

## Questions?

See TESTING_GUIDE.md for comprehensive troubleshooting and support.

---

**TL;DR**:
```bash
npm install && npx playwright install && npm run dev &
npm test && npm run test:report
```
