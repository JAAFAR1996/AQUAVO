# FIST-LIVE: Premium Aquarium E-Commerce Platform

## Product Overview

**FIST-LIVE** is a full-stack e-commerce platform specializing in aquarium equipment, fish, and accessories. Built for the Iraqi market with Arabic RTL support, the platform provides a comprehensive shopping experience for aquarium enthusiasts.

- **Target Market**: Iraq (IQD currency)
- **Languages**: Arabic (RTL) / English
- **Tech Stack**: React 19, Express.js, PostgreSQL (NEON), Cloudflare R2
- **Base URL**: `http://localhost:5000`

---

## Core Features

### 1. Product Catalog (`/api/products`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/products` | GET | List all products with pagination, filtering, sorting |
| `/api/products/:id` | GET | Get single product by ID |
| `/api/products/:id` | PUT | Update product (Admin) |
| `/api/products/:id` | DELETE | Delete product (Admin) |
| `/api/products/category/:category` | GET | Filter by category |
| `/api/products/search` | GET | Search products by name/description |

**Product Categories**:
- Aquariums & Tanks
- Filters & Pumps
- Heaters & Thermometers
- Lighting Systems
- Decorations & Substrates
- Fish Food & Supplements
- Water Treatment
- Accessories

**Product Fields**:
- `id`, `slug`, `name`, `brand`, `category`, `subcategory`
- `price`, `originalPrice`, `currency` (IQD)
- `images[]`, `thumbnail`
- `stock`, `lowStockThreshold`
- `rating`, `reviewCount`
- `isNew`, `isBestSeller`, `isProductOfWeek`
- `specifications` (JSON)

---

### 2. User Authentication (`/api/auth`, `/api/users`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | User login (session-based) |
| `/api/auth/logout` | POST | User logout |
| `/api/auth/me` | GET | Get current user session |
| `/api/users/profile` | GET | Get user profile |
| `/api/users/profile` | PUT | Update user profile |
| `/api/auth/forgot-password` | POST | Request password reset |
| `/api/auth/reset-password` | POST | Reset password with token |
| `/api/auth/verify-email` | GET | Verify email address |

**User Roles**:
- `user` - Regular customer
- `admin` - Administrator access

**Security Features**:
- Session-based authentication with cookies
- Password hashing (bcrypt)
- Email verification
- Password reset via email
- Loyalty points system (bronze/silver/gold tiers)

---

### 3. Shopping Cart (`/api/cart`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cart` | GET | Get user's cart |
| `/api/cart` | POST | Add item to cart |
| `/api/cart/:itemId` | PUT | Update cart item quantity |
| `/api/cart/:itemId` | DELETE | Remove item from cart |
| `/api/cart/clear` | DELETE | Clear entire cart |

**Features**:
- Persistent cart for logged-in users
- Quantity validation against stock
- Real-time price calculation

---

### 4. Orders (`/api/orders`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/orders` | GET | Get user's orders |
| `/api/orders` | POST | Create new order |
| `/api/orders/:id` | GET | Get order details |
| `/api/orders/:id/status` | PUT | Update order status (Admin) |
| `/api/orders/:id/cancel` | POST | Cancel order |

**Order Statuses**:
- `pending` - Awaiting processing
- `confirmed` - Order confirmed
- `processing` - Being prepared
- `shipped` - In transit
- `delivered` - Successfully delivered
- `cancelled` - Order cancelled

**Payment Methods**:
- Cash on Delivery
- Credit Card
- ZainCash (local payment)

---

### 5. Product Reviews (`/api/reviews`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/reviews/product/:productId` | GET | Get product reviews |
| `/api/reviews` | POST | Submit review |
| `/api/reviews/:id/helpful` | POST | Mark review as helpful |

**Features**:
- 1-5 star rating
- Title and comment
- Image attachments (up to 5)
- Verified purchase badge
- Helpful votes

---

### 6. Favorites/Wishlist (`/api/favorites`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/favorites` | GET | Get user's favorites |
| `/api/favorites` | POST | Add to favorites |
| `/api/favorites/:productId` | DELETE | Remove from favorites |

---

### 7. Coupons & Discounts (`/api/coupons`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/coupons/validate` | POST | Validate coupon code |
| `/api/coupons` | GET | List active coupons (Admin) |
| `/api/coupons` | POST | Create coupon (Admin) |

**Coupon Types**:
- `percentage` - Percentage discount
- `fixed` - Fixed amount discount
- `free_shipping` - Free shipping

---

### 8. Fish Encyclopedia (`/api/fish`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/fish` | GET | List all fish species |
| `/api/fish/:id` | GET | Get fish species details |
| `/api/fish/compatibility` | POST | Check fish compatibility |

**Fish Data**:
- Common name, Arabic name, Scientific name
- Care level (beginner/intermediate/advanced)
- Tank size requirements
- Water parameters (pH, temperature, hardness)
- Compatibility information
- Diet and breeding info

---

### 9. Community Gallery (`/api/gallery`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/gallery` | GET | Get approved submissions |
| `/api/gallery` | POST | Submit aquarium photo |
| `/api/gallery/:id/vote` | POST | Vote for submission |
| `/api/gallery/winners` | GET | Get monthly winners |

**Features**:
- Customer aquarium photo sharing
- Monthly competition with prizes
- Like/voting system
- Winner celebration animation

---

### 10. Journey Wizard (`/api/journey`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/journey` | GET | Get saved journey plan |
| `/api/journey` | POST | Save/update journey plan |
| `/api/journey/recommendations` | GET | Get product recommendations |

**Journey Steps**:
1. Tank Size Selection
2. Tank Type (freshwater/saltwater)
3. Location Setup
4. Filtration System
5. Heating Requirements
6. Lighting Selection
7. Substrate Choice
8. Decorations
9. Water Source
10. Cycling Method
11. Fish Selection
12. Stocking Level
13. Maintenance Schedule

---

### 11. Newsletter (`/api/newsletter`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/newsletter/subscribe` | POST | Subscribe to newsletter |
| `/api/newsletter/unsubscribe` | POST | Unsubscribe from newsletter |

---

### 12. Admin Dashboard (`/api/admin`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/stats` | GET | Dashboard statistics |
| `/api/admin/products` | GET/POST/PUT/DELETE | Product management |
| `/api/admin/orders` | GET/PUT | Order management |
| `/api/admin/users` | GET/PUT | User management |
| `/api/admin/reviews` | GET/PUT/DELETE | Review moderation |
| `/api/admin/gallery` | GET/PUT | Gallery moderation |
| `/api/admin/coupons` | GET/POST/PUT/DELETE | Coupon management |
| `/api/admin/settings` | GET/PUT | Store settings |

**Admin Features**:
- Real-time sales analytics
- Inventory management with low-stock alerts
- Order processing workflow
- Customer management
- Content moderation (reviews/gallery)
- Discount/coupon creation
- Store settings configuration

---

## Client Pages

| Page | Path | Description |
|------|------|-------------|
| Home | `/` | Landing page with featured products |
| Products | `/products` | Product catalog with filters |
| Product Details | `/products/:slug` | Single product view |
| Search | `/search` | Search results |
| Deals | `/deals` | Discounted products |
| Cart | `/cart` | Shopping cart |
| Wishlist | `/wishlist` | User favorites |
| Login | `/login` | User login |
| Register | `/register` | User registration |
| Profile | `/profile` | User profile |
| Orders | `/orders` | Order history |
| Order Tracking | `/orders/:id` | Track specific order |
| Fish Encyclopedia | `/fish-encyclopedia` | Fish database |
| Fish Finder | `/fish-finder` | Fish search tool |
| Fish Health | `/fish-health-diagnosis` | Health diagnosis tool |
| Breeding Calculator | `/fish-breeding-calculator` | Breeding calculator |
| Community Gallery | `/community-gallery` | Customer aquariums |
| Journey | `/journey` | Aquarium setup wizard |
| Blog | `/blog` | Educational articles |
| FAQ | `/faq` | Frequently asked questions |
| Calculators | `/calculators` | Aquarium calculators |
| Admin Login | `/admin/login` | Admin authentication |
| Admin Dashboard | `/admin/dashboard` | Admin panel |

---

## Database Schema (NEON PostgreSQL)

**Core Tables**:
- `users` - User accounts with loyalty system
- `products` - Product catalog
- `categories` - Product categories
- `orders` - Customer orders
- `order_items_relational` - Order line items
- `cart_items` - Shopping cart
- `favorites` - User wishlists
- `reviews` - Product reviews
- `review_ratings` - Review helpfulness votes
- `coupons` - Discount coupons
- `discounts` - Product discounts
- `payments` - Payment records

**Feature Tables**:
- `fish_species` - Fish encyclopedia data
- `gallery_submissions` - Community photos
- `gallery_votes` - Photo votes
- `gallery_prizes` - Monthly prizes
- `journey_plans` - Wizard progress
- `newsletter_subscriptions` - Email subscribers

**System Tables**:
- `sessions` - User sessions
- `password_reset_tokens` - Password resets
- `audit_logs` - Admin activity logs
- `settings` - Store configuration
- `translations` - Multi-language support

---

## File Storage (Cloudflare R2)

- Product images
- Review images
- Gallery submissions
- User profile images

**Allowed Formats**: JPEG, PNG, WebP, GIF  
**Max Size**: 5MB per file

---

## Security Requirements

1. **Authentication**: Session-based with secure cookies
2. **Authorization**: Role-based (user/admin)
3. **Input Validation**: Zod schemas for all endpoints
4. **SQL Injection**: Prevented via Drizzle ORM
5. **XSS Protection**: Input sanitization
6. **CORS**: Configured for frontend origin
7. **Rate Limiting**: Applied to sensitive endpoints
8. **Password Security**: bcrypt hashing

---

## Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Common Error Codes**:
- `AUTH_REQUIRED` - Authentication needed
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid input
- `INTERNAL_ERROR` - Server error

---

## Test Credentials

**Admin Account**:
- Email: `admin@fishstore.com`
- Password: `Admin123!@#`

**Test User**:
- Email: `test@example.com`
- Password: `Test123!@#`

---

## Running the Application

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Server runs on http://localhost:5000
```
