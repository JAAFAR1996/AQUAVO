# Fish Web - Aquarium E-commerce Platform

## Overview

Fish Web is an immersive, award-winning aquarium e-commerce platform built for the Iraqi market. The application combines cutting-edge UX/UI design with practical e-commerce functionality, featuring animated themes, 3D visualizations, guided shopping experiences, and a strong focus on sustainability. The platform helps both beginners and experts discover, compare, and purchase aquarium equipment while promoting eco-friendly practices.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18+ with TypeScript for type-safe component development
- Vite as the build tool and development server for fast Hot Module Replacement (HMR)
- Wouter for lightweight client-side routing instead of React Router

**Styling & Theming**
- Tailwind CSS with custom theme system supporting 5 distinct visual modes (Light, Dark, Neon Ocean, Pastel, Monochrome)
- CSS custom properties for dynamic theme switching without page reloads
- Framer Motion for declarative animations and transitions
- shadcn/ui component library built on Radix UI primitives for accessible, customizable components

**State Management & Data Fetching**
- TanStack Query (React Query) for server state management, caching, and automatic background refetching
- Local component state via React hooks
- Session storage and localStorage for wizard progress persistence

**3D & Visual Effects**
- React Three Fiber (R3F) and Three.js for WebGL-based 3D aquarium scenes
- @react-three/drei for helper components (Environment, Float, etc.)
- @react-three/postprocessing for bloom, vignette, and other visual effects
- Canvas Confetti for celebration animations
- Custom CSS animations (wave, bubble-rise, fish-swim, glow-pulse)

**Key Features**
- Fish Finder Wizard: Multi-step form with answer persistence guiding users to suitable products
- Journey Progress Tracker: Visual stepper showing aquarium setup stages
- Product Comparison: Side-by-side comparison table for equipment
- Exploded View Component: Interactive hotspot-based equipment visualization
- AR Viewer: Google Model Viewer integration for augmented reality product previews
- Feature Flags: Toggle advanced features (3D scenes, AR, sustainability metrics) via configuration

### Backend Architecture

**Server Framework**
- Express.js as the HTTP server framework
- Custom middleware for JSON parsing, session management, and static file serving
- Session management via express-session with in-memory store (MemoryStore) for development

**Authentication & Security**
- Password hashing using crypto.pbkdf2Sync with salt (15,000 iterations, SHA-512)
- Timing-safe password comparison to prevent timing attacks
- Session-based authentication with secure cookies in production
- Custom requireAuth middleware for protected routes

**API Design**
- RESTful API endpoints under `/api/*` namespace
- Health check endpoint at `/api/health`
- User authentication endpoints (login, register, logout)
- Product CRUD operations with filtering support
- Order management endpoints
- Review submission and retrieval

**Storage Interface Pattern**
- Abstract IStorage interface defines all data access methods
- DbStorage class implements the interface for database operations
- Enables easy swapping of storage backends or mocking for tests

### Data Storage

**Database**
- PostgreSQL via Neon serverless driver (@neondatabase/serverless)
- Drizzle ORM for type-safe schema definition and queries
- Schema includes users, products, orders, and reviews tables
- JSONB columns for flexible product specifications, order items, and shipping addresses

**Schema Design**
- Products table with rich metadata: category, subcategory, brand, pricing, stock levels, ratings
- Support for product variants via specifications JSONB field
- Orders table with status tracking and relational link to users
- Reviews table with composite ratings and user attribution

**Migration Strategy**
- Drizzle Kit for schema migrations
- Migrations stored in `/migrations` directory
- Push-based workflow via `npm run db:push` command

### Build & Deployment

**Development Workflow**
- Separate client and server development modes
- Vite dev server proxied through Express in development
- TypeScript compilation checking via `npm run check`
- Source maps preserved for debugging

**Production Build**
- Custom build script using esbuild for server bundling
- Vite for optimized client bundle with code splitting
- Server dependencies selectively bundled (allowlist approach) to reduce syscalls
- Static assets served from `dist/public` directory
- Single-file server output (`dist/index.js`) for streamlined deployment

**Environment Configuration**
- DATABASE_URL for PostgreSQL connection
- JWT_SECRET for authentication (minimum 32 characters)
- SESSION_SECRET for session encryption
- R2 storage credentials (Cloudflare R2) for asset storage
- Email service configuration (Resend API)
- Analytics configuration (Plausible)

## External Dependencies

### Third-Party Services

**Database**
- Neon Serverless PostgreSQL: Cloud-hosted Postgres with automatic scaling

**Email**
- Resend API: Transactional email service for order confirmations and notifications

**Storage**
- Cloudflare R2: S3-compatible object storage for product images and assets

**Analytics**
- Plausible: Privacy-focused web analytics platform

### Key Libraries

**UI Components**
- Radix UI: Headless, accessible component primitives (30+ components)
- Lucide React: Icon library
- React Hook Form + Zod: Form validation and schema-based validation

**Animation & 3D**
- Framer Motion: Declarative animations and gesture handling
- Three.js ecosystem: 3D rendering engine
- @react-spring/web: Physics-based animations
- @use-gesture/react: Gesture recognition

**Utilities**
- date-fns: Date manipulation
- nanoid: Unique ID generation
- class-variance-authority: CSS class composition
- tailwind-merge: Tailwind class conflict resolution

**Development Tools**
- Replit plugins: Runtime error overlay, cartographer (code navigation), dev banner
- ESBuild: Fast JavaScript bundler
- PostCSS + Autoprefixer: CSS processing

### Integration Points

**Google Model Viewer**
- Dynamically loaded CDN script for AR product visualization
- Supports AR modes for iOS (Quick Look) and Android (Scene Viewer)

**Internationalization**
- JSON-based message files for Arabic (ar.json) and English (en.json)
- Support for RTL (right-to-left) layout in Arabic mode

**PWA Support**
- Service worker configuration for offline caching
- Install prompt for "Add to Home Screen" functionality
- IndexedDB for offline product data
