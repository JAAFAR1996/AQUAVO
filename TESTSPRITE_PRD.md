# Product Requirements Document (PRD) - Fish Store E-Commerce Platform

## Project Overview
Fish Store is a comprehensive e-commerce platform for aquarium equipment and fish supplies, built with modern web technologies.

## Technology Stack
- **Frontend**: React 19 with TypeScript, Vite, TailwindCSS, Radix UI
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Testing**: Vitest with Happy-DOM
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form with Zod validation

## Core Features

### 1. User Authentication & Authorization
- User registration and login
- Admin authentication with role-based access
- Password reset functionality
- Session management with express-session

### 2. Product Management
- Product catalog with categories
- Product details with images, videos, and AR viewer
- Product specifications table
- Bundle recommendations
- Frequently bought together suggestions
- Product transparency information
- Luxury product showcase

### 3. Shopping Cart & Checkout
- Add/remove items from cart
- Cart persistence
- Coupon/discount codes
- Order processing
- Multiple payment options

### 4. User Features
- Wishlist/Favorites
- Product reviews and ratings with images
- User profile management
- Newsletter subscription
- Order history tracking

### 5. Admin Features
- Product management (CRUD)
- Order management
- Coupon management
- User management
- System settings
- Analytics dashboard

### 6. Fish-Specific Features
- Fish compatibility badges
- Care difficulty indicators
- Fish gallery
- Interactive fish journey/guide

### 7. UI/UX Features
- Responsive design
- Progressive Web App (PWA) capabilities
- Accessibility features (a11y)
- Dark mode support
- Arabic RTL support
- WhatsApp integration
- Search functionality
- Image zoom
- Quick view modals
- Skeleton loading states
- Toast notifications

### 8. Effects & Animations
- Bubble trail effects
- Water ripple buttons
- Wave scroll effects
- Scroll progress indicator
- Floating action buttons
- Animated counters

## API Endpoints (Backend Routes)

### Authentication
- POST /api/admin/login
- POST /api/users/register
- POST /api/users/login
- POST /api/users/logout
- POST /api/users/forgot-password
- POST /api/users/reset-password

### Products
- GET /api/products
- GET /api/products/:id
- POST /api/products (admin)
- PUT /api/products/:id (admin)
- DELETE /api/products/:id (admin)

### Cart
- GET /api/cart
- POST /api/cart/add
- PUT /api/cart/update
- DELETE /api/cart/remove

### Orders
- GET /api/orders
- GET /api/orders/:id
- POST /api/orders
- PUT /api/orders/:id/status (admin)

### Reviews
- GET /api/reviews/:productId
- POST /api/reviews
- PUT /api/reviews/:id
- DELETE /api/reviews/:id

### Coupons
- GET /api/coupons (admin)
- POST /api/coupons (admin)
- POST /api/coupons/validate
- DELETE /api/coupons/:id (admin)

### Favorites
- GET /api/favorites
- POST /api/favorites/add
- DELETE /api/favorites/remove

### Fish
- GET /api/fish
- GET /api/fish/:id

### Gallery
- GET /api/gallery
- POST /api/gallery (admin)

### Newsletter
- POST /api/newsletter/subscribe

### System
- GET /api/system/health
- GET /api/system/stats (admin)

## Current Test Coverage

### Existing Tests (183 passing tests):
1. **Authentication Tests** (28 tests) - server/__tests__/auth.test.ts
   - Password hashing and verification
   - Salt generation
   - Timing-safe comparison
   - Edge cases handling

2. **Schema Tests** (31 tests) - shared/__tests__/schema.test.ts
   - Zod schema validation

3. **Utils Tests** (33 tests) - client/src/lib/__tests__/utils.test.ts
   - Utility function tests

4. **Validation Tests** (28 tests) - server/__tests__/validation.test.ts
   - Input validation

5. **API Tests** (24 tests) - client/src/lib/__tests__/api.test.ts
   - API client tests

6. **Security Tests** (6 tests) - server/__tests__/security.test.ts
   - Security validations

7. **Routes Tests** (19 tests) - server/__tests__/routes.test.ts
   - Route handlers

8. **Storage Tests** (14 tests) - server/__tests__/storage.test.ts
   - Storage operations

## Testing Gaps & Priorities

### High Priority - Missing Tests:

#### 1. End-to-End User Flows
- [ ] Complete user registration to first purchase flow
- [ ] Product search to cart to checkout flow
- [ ] Wishlist management flow
- [ ] Review submission and moderation flow
- [ ] Admin product management flow
- [ ] Coupon application in checkout flow

#### 2. Frontend Component Tests
- [ ] React component rendering tests
- [ ] User interaction tests (buttons, forms, modals)
- [ ] Accessibility tests for all components
- [ ] Responsive design tests
- [ ] Dark mode toggle tests
- [ ] RTL (Arabic) layout tests

#### 3. Integration Tests
- [ ] Database integration tests with real Neon DB
- [ ] API endpoint integration tests
- [ ] WebSocket tests for real-time features
- [ ] Session management tests
- [ ] File upload tests (images, videos)

#### 4. Performance Tests
- [ ] Page load time tests
- [ ] API response time tests
- [ ] Large dataset rendering tests
- [ ] Memory leak detection
- [ ] Bundle size analysis

#### 5. Security Tests
- [ ] SQL injection prevention
- [ ] XSS attack prevention
- [ ] CSRF protection
- [ ] Rate limiting tests
- [ ] Authentication bypass attempts
- [ ] Authorization checks for admin routes

#### 6. Edge Cases & Error Handling
- [ ] Network failure scenarios
- [ ] Database connection failures
- [ ] Invalid input handling
- [ ] Concurrent user operations
- [ ] Race condition tests

## Test Data Requirements

### Test Users
- Regular user account
- Admin user account
- User with existing orders
- User with wishlist items

### Test Products
- Standard products
- Discounted products
- Out-of-stock products
- Products with reviews
- Bundle products

### Test Orders
- Pending orders
- Completed orders
- Cancelled orders
- Orders with coupons

## Success Criteria

1. **Code Coverage**: Achieve >80% code coverage across all modules
2. **Critical Paths**: 100% coverage of critical user flows (registration, checkout, admin operations)
3. **Performance**: All API endpoints respond in <500ms under normal load
4. **Security**: Zero high-severity security vulnerabilities
5. **Accessibility**: WCAG 2.1 AA compliance
6. **Browser Compatibility**: Works on latest Chrome, Firefox, Safari, Edge

## TestSprite Actions Required

1. **Analyze** the existing codebase and identify untested areas
2. **Generate** comprehensive test plans for missing test coverage
3. **Create** test files for frontend components
4. **Implement** E2E tests for critical user flows
5. **Execute** all tests and report failures
6. **Debug** any failing tests and provide fixes
7. **Validate** against product requirements

## Environment Setup

- Node version: 20.x
- Package manager: pnpm 10.x
- Test runner: Vitest
- Test environment: happy-dom
- Database: PostgreSQL (connection string available in env)

## Admin Credentials (for testing)
- Email: admin@fishstore.com
- Password: Admin123!@#

## Next Steps for TestSprite

1. Review this PRD thoroughly
2. Analyze the project structure and existing tests
3. Generate a detailed test plan covering all gaps
4. Prioritize tests based on business impact
5. Implement tests incrementally
6. Run continuous validation
7. Provide structured feedback on test results
