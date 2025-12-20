# TestSprite Usage Guide - Fish Store Project

## Overview
This guide will help you use TestSprite AI Testing Agent to automatically generate and run comprehensive tests for your Fish Store e-commerce platform.

---

## ✅ Prerequisites (Already Completed)

1. **TestSprite MCP Server**: ✅ Connected and Active
   ```bash
   Status: ✓ Connected
   Command: npx @testsprite/testsprite-mcp@latest
   API Key: Configured
   ```

2. **Project Setup**: ✅ Ready
   - 183 existing tests passing
   - Vitest configured
   - Test coverage enabled

---

## 🚀 How to Use TestSprite

### Method 1: Direct Interaction with Claude Code

Since TestSprite MCP is connected to Claude Code, you can now interact with TestSprite directly through natural language. Here's how:

#### Step 1: Ask TestSprite to Analyze Your Project
Simply ask:
```
"TestSprite, please analyze the Fish Store project using the TESTSPRITE_PRD.md and TESTSPRITE_TEST_PLAN.md files, and generate tests for the missing coverage areas."
```

#### Step 2: Review PRD and Test Plan
TestSprite will read:
- `TESTSPRITE_PRD.md` - Complete project requirements
- `TESTSPRITE_TEST_PLAN.md` - Detailed test scenarios
- Existing test files in `server/__tests__/` and `client/src/lib/__tests__/`

#### Step 3: Generate Tests Incrementally
Ask TestSprite to generate specific tests:

**For Frontend Components:**
```
"TestSprite, generate component tests for the Login page following the test plan."
```

**For Backend APIs:**
```
"TestSprite, create integration tests for the Product APIs."
```

**For End-to-End Flows:**
```
"TestSprite, implement the E2E test for the complete purchase journey."
```

### Method 2: Using TestSprite Commands

If TestSprite exposes specific commands, you can use them directly:

#### Run Test Planning
```bash
# Ask TestSprite to create a test plan
"TestSprite, create a test plan for the cart functionality"
```

#### Generate Test Code
```bash
# Ask TestSprite to generate test files
"TestSprite, generate test file for client/src/pages/product-details.tsx"
```

#### Execute Tests
```bash
# TestSprite can run tests and analyze results
"TestSprite, run all tests and report any failures"
```

#### Debug Failures
```bash
# TestSprite can debug failing tests
"TestSprite, analyze the failing test in auth.test.ts and suggest a fix"
```

---

## 📋 Example Workflow

### Complete Testing Cycle with TestSprite

**Step 1: Start with High-Priority Tests**
```
User: "TestSprite, let's start with Priority 1 tests from the test plan.
Begin with authentication E2E flows and security tests."

TestSprite will:
1. Review the authentication requirements
2. Generate E2E test for registration → login → purchase
3. Create security tests for SQL injection and XSS
4. Execute the tests
5. Report results
```

**Step 2: Review and Iterate**
```
User: "Show me the test coverage report and identify remaining gaps."

TestSprite will:
1. Run coverage analysis
2. Identify untested code paths
3. Suggest additional tests
4. Prioritize by business impact
```

**Step 3: Fix Failures**
```
User: "I see 3 tests failing. Please debug and fix them."

TestSprite will:
1. Analyze the failure logs
2. Identify root causes
3. Suggest code fixes
4. Re-run tests to verify
```

**Step 4: Performance Testing**
```
User: "Run performance tests for all API endpoints."

TestSprite will:
1. Execute performance benchmarks
2. Measure response times
3. Compare against targets (<500ms)
4. Report any slow endpoints
```

---

## 🎯 Test Generation Examples

### Example 1: Generate Component Test

**Request:**
```
"TestSprite, generate a comprehensive test file for the product details page
at client/src/pages/product-details.tsx. Include tests for:
- Rendering all product information
- Image gallery functionality
- Add to cart interaction
- Add to wishlist interaction
- Review display
- Related products
Follow the testing patterns in our existing tests."
```

**TestSprite will create:**
```typescript
// client/src/pages/__tests__/product-details.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProductDetails from '../product-details';

describe('Product Details Page', () => {
  // Generated tests...
});
```

### Example 2: Generate API Integration Test

**Request:**
```
"TestSprite, create integration tests for the cart API endpoints
at server/routes/cart.ts. Test all CRUD operations and edge cases."
```

**TestSprite will create:**
```typescript
// server/__tests__/cart-integration.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index';

describe('Cart API Integration Tests', () => {
  // Generated tests...
});
```

### Example 3: Generate E2E Test

**Request:**
```
"TestSprite, implement the complete purchase journey E2E test from
the test plan. Start from homepage, browse products, add to cart,
register, checkout, and verify order confirmation."
```

**TestSprite will create:**
```typescript
// e2e/__tests__/purchase-journey.test.ts
import { describe, it, expect } from 'vitest';

describe('E2E: Complete Purchase Journey', () => {
  // Generated E2E test flow...
});
```

---

## 📊 Monitoring Test Progress

### Check Current Status
```
"TestSprite, show me the current test coverage statistics."
```

Expected Response:
```
Test Coverage Summary:
- Total Tests: 183 → 350 (target)
- Code Coverage: 65% → 80% (target)
- Critical Paths: 100% ✅
- Security Tests: Implemented ✅
- Performance Tests: In Progress 🔄
```

### View Test Results
```bash
# Run tests manually
pnpm run test

# View coverage report
pnpm run test:coverage
```

Coverage report will be available at:
`./coverage/index.html`

---

## 🔧 Advanced TestSprite Usage

### Custom Test Generation

**Specify Testing Framework Preferences:**
```
"TestSprite, when generating tests:
- Use Vitest syntax
- Follow AAA pattern (Arrange, Act, Assert)
- Use descriptive test names
- Include edge cases
- Add comments for complex logic
- Match our existing test style"
```

### Targeted Coverage Improvement

**Focus on Specific Areas:**
```
"TestSprite, analyze the coverage gap in the admin components.
Generate tests specifically for:
- admin/coupons-management.tsx
- admin/product-management.tsx
Aim for >90% coverage on these files."
```

### Security-Focused Testing

**Run Security Audit:**
```
"TestSprite, perform a comprehensive security audit:
1. Test all authentication endpoints for vulnerabilities
2. Check for SQL injection in all database queries
3. Validate XSS prevention in user inputs
4. Test CSRF protection
5. Verify rate limiting
6. Check authorization on admin routes
Generate tests for any vulnerabilities found."
```

### Performance Benchmarking

**Run Performance Suite:**
```
"TestSprite, run performance benchmarks on all API endpoints.
Compare results against the targets in the test plan:
- Product List: <200ms
- Product Details: <150ms
- Search: <300ms
- Cart Operations: <100ms
- Order Creation: <500ms
Report any endpoints exceeding thresholds."
```

---

## 📝 Best Practices

### 1. Incremental Testing
- Start with critical paths (auth, checkout)
- Then move to feature testing
- Finally, edge cases and performance

### 2. Maintain Existing Tests
- Ensure new tests don't break existing ones
- Run full test suite after each generation
- Keep coverage above 80%

### 3. Review Generated Tests
- Always review TestSprite-generated tests
- Verify they match project requirements
- Ensure they follow coding standards
- Check for false positives/negatives

### 4. Continuous Integration
- Run tests on every commit
- Use `pnpm run test` in CI/CD pipeline
- Block merges if tests fail
- Track coverage trends

---

## 🐛 Troubleshooting

### Issue: Tests Not Running
```bash
# Clear test cache
pnpm run test --clearCache

# Run with verbose output
pnpm run test --verbose
```

### Issue: Low Coverage
```
"TestSprite, identify files with <50% coverage and generate tests for them."
```

### Issue: Flaky Tests
```
"TestSprite, analyze the flaky tests in the test results and make them more reliable."
```

### Issue: Slow Tests
```
"TestSprite, identify slow-running tests (>1s) and optimize them."
```

---

## 📈 Success Metrics

Track these metrics to measure testing success:

### Coverage Goals
- ✅ Overall Coverage: >80%
- ✅ Critical Paths: 100%
- ✅ Security Tests: All endpoints covered
- ✅ E2E Tests: All user flows covered

### Performance Goals
- ✅ Test Execution: <1 minute for unit tests
- ✅ API Response: All endpoints <500ms
- ✅ Page Load: All pages meet Web Vitals

### Quality Goals
- ✅ Zero high-severity bugs in production
- ✅ Accessibility: WCAG 2.1 AA compliant
- ✅ Cross-browser: Works on all major browsers

---

## 🚦 Quick Commands Reference

| Command | Description |
|---------|-------------|
| `pnpm run test` | Run all tests |
| `pnpm run test:watch` | Run tests in watch mode |
| `pnpm run test:coverage` | Generate coverage report |
| `pnpm run test:ui` | Open Vitest UI |
| `claude mcp list` | List MCP servers |
| `claude mcp get TestSprite` | Check TestSprite status |

---

## 🎓 Next Steps

1. **Start Testing Session**
   ```
   "TestSprite, let's begin testing the Fish Store project.
   Start with Priority 1 tests from the test plan."
   ```

2. **Monitor Progress**
   - Check test count daily
   - Review coverage reports
   - Track failing tests

3. **Iterate and Improve**
   - Add tests for new features
   - Update tests when code changes
   - Maintain high coverage

4. **Automate**
   - Integrate with CI/CD
   - Run tests pre-commit
   - Generate reports automatically

---

## 💡 Pro Tips

1. **Use TestSprite's Natural Language Understanding**
   - Be specific about what you want tested
   - Reference files and line numbers
   - Mention edge cases explicitly

2. **Leverage Existing Tests**
   - Ask TestSprite to follow existing patterns
   - Use similar naming conventions
   - Match the project's coding style

3. **Think in User Flows**
   - Test from user perspective
   - Cover happy paths first
   - Then add edge cases

4. **Security First**
   - Always test authentication
   - Validate all user inputs
   - Check authorization thoroughly

---

## 📚 Additional Resources

- **TestSprite Documentation**: https://www.testsprite.com
- **Vitest Documentation**: https://vitest.dev
- **Testing Library**: https://testing-library.com
- **Project PRD**: TESTSPRITE_PRD.md
- **Test Plan**: TESTSPRITE_TEST_PLAN.md

---

**Happy Testing! 🎉**

*Generated for Fish Store E-Commerce Platform*
*TestSprite AI Testing Agent - Version 2.0*
