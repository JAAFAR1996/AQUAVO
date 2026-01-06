import { Switch, Route, useLocation } from "wouter";
import { lazy, Suspense, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/cart-context";
import { WishlistProvider } from "@/contexts/wishlist-context";
import { AuthProvider } from "@/contexts/auth-context";
import { RequireAdmin } from "@/components/auth/require-admin";
import { ScrollProgress } from "@/components/effects/scroll-progress";
import { FloatingActionButton } from "@/components/effects/floating-action-button";

import { initGA, trackPageView } from "@/lib/analytics";
import { useDeviceDetection } from "@/hooks/use-device-detection";
import "@/lib/sentry"; // Auto-initializes on import

import { WinnerNotificationBanner } from "@/components/notifications/winner-notification-banner";

import { ComparisonProvider } from "@/contexts/comparison-context";
import { NavbarPreferencesProvider } from "@/hooks/use-navbar-preferences";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { LiveChatWidget } from "@/components/chat/live-chat-widget";
import { AIChatBot } from "@/components/chat/ai-chat-bot";

// Direct imports for critical pages (needed for fast first paint)
import Home from "@/pages/home";
import Products from "@/pages/products";
import NotFound from "@/pages/404";

// Lazy load heavy pages for better performance (code splitting)
const Journey = lazy(() => import("@/pages/journey"));

const AdminDashboard = lazy(() => import("@/pages/admin-dashboard"));
const FishBreedingCalculator = lazy(() => import("@/pages/fish-breeding-calculator"));
const FishEncyclopedia = lazy(() => import("@/pages/fish-encyclopedia"));
const CommunityGallery = lazy(() => import("@/pages/community-gallery"));
const ProductDetails = lazy(() => import("@/pages/product-details"));
const Profile = lazy(() => import("@/pages/profile"));
const FAQ = lazy(() => import("@/pages/faq"));
const Calculators = lazy(() => import("@/pages/calculators"));
const FishHealthDiagnosis = lazy(() => import("@/pages/fish-health-diagnosis"));

const Blog = lazy(() => import("@/pages/blog"));
const BlogPost = lazy(() => import("@/pages/blog-post"));
const OrderConfirmation = lazy(() => import("@/pages/order-confirmation"));
const Register = lazy(() => import("@/pages/register"));
const Compare = lazy(() => import("@/pages/compare"));
const AquariumWizard = lazy(() => import("@/pages/aquarium-wizard"));
const FishCompatibility = lazy(() => import("@/pages/fish-compatibility"));
const MergeProductsPage = lazy(() => import("@/pages/admin/merge-products"));
const AdminAI = lazy(() => import("@/pages/admin/admin-ai"));
const InvestPage = lazy(() => import("@/pages/invest"));
const AITools = lazy(() => import("@/pages/ai-tools"));
const BeginnerGuide = lazy(() => import("@/pages/beginner-guide"));


// Medium-weight pages (direct imports for faster navigation)

import Deals from "@/pages/deals";
import Wishlist from "@/pages/wishlist";
import SearchResults from "@/pages/search-results";

import Sustainability from "@/pages/sustainability";

import EcoFriendlyGuide from "@/pages/guides-eco-friendly";
import ReturnPolicy from "@/pages/return-policy";
import PrivacyPolicy from "@/pages/privacy-policy";
import Terms from "@/pages/terms";
import OrderTracking from "@/pages/order-tracking";
import AdminLogin from "@/pages/admin-login";
import Shipping from "@/pages/shipping";
import Login from "@/pages/login";
import ForgotPassword from "@/pages/forgot-password";




// Loading component for lazy-loaded pages
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-primary/40 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">جاري التحميل...</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/ar" component={Home} />
      <Route path="/products" component={Products} />

      {/* Aquarium Setup Wizard */}
      <Route path="/aquarium-wizard">
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <AquariumWizard />
          </Suspense>
        </ErrorBoundary>
      </Route>


      {/* Lazy loaded product details */}
      <Route path="/products/:slug">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <ProductDetails />
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      <Route path="/guides/eco-friendly" component={EcoFriendlyGuide} />

      {/* Beginner Guide */}
      <Route path="/beginner-guide">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <BeginnerGuide />
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* Lazy loaded calculators */}
      <Route path="/calculators">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Calculators />
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* Lazy loaded routes */}
      <Route path="/journey">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Journey />
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* AI Tools - Visual Analyzer */}
      <Route path="/ai-tools">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <AITools />
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>





      {/* Lazy loaded fish encyclopedia */}
      <Route path="/fish-encyclopedia">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <FishEncyclopedia />
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* Fish Compatibility Calculator */}
      <Route path="/fish-compatibility">
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <FishCompatibility />
          </Suspense>
        </ErrorBoundary>
      </Route>
      {/* Alias for /encyclopedia */}
      <Route path="/encyclopedia">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <FishEncyclopedia />
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      <Route path="/deals" component={Deals} />
      <Route path="/wishlist" component={Wishlist} />
      <Route path="/search" component={SearchResults} />

      {/* Lazy loaded compare page */}
      <Route path="/compare">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Compare />
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* Lazy loaded community gallery */}
      <Route path="/community-gallery">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <CommunityGallery />
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* Lazy loaded fish health diagnosis */}
      <Route path="/fish-health-diagnosis">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <FishHealthDiagnosis />
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>



      {/* Lazy loaded fish breeding calculator */}
      <Route path="/fish-breeding-calculator">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <FishBreedingCalculator />
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      <Route path="/sustainability" component={Sustainability} />
      <Route path="/return-policy" component={ReturnPolicy} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms" component={Terms} />



      {/* Lazy loaded FAQ */}
      <Route path="/faq">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <FAQ />
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      <Route path="/order-confirmation/:id">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <OrderConfirmation />
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      <Route path="/order-tracking" component={OrderTracking} />

      {/* Lazy loaded blog */}
      <Route path="/blog">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Blog />
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* Blog Post Detail */}
      <Route path="/blog/:id">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <BlogPost />
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* Invest Page */}
      <Route path="/invest">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <InvestPage />
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      <Route path="/shipping" component={Shipping} />
      <Route path="/login" component={Login} />

      {/* Lazy loaded register */}
      <Route path="/register">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Register />
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* Lazy loaded profile */}
      <Route path="/profile">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Profile />
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      <Route path="/forgot-password" component={ForgotPassword} />

      <Route path="/admin/login" component={AdminLogin} />

      {/* Lazy loaded admin dashboard */}
      <Route path="/admin">
        {() => (
          <ErrorBoundary>
            <RequireAdmin>
              <Suspense fallback={<PageLoader />}>
                <AdminDashboard />
              </Suspense>
            </RequireAdmin>
          </ErrorBoundary>
        )}
      </Route>

      {/* Admin: Merge Products */}
      <Route path="/admin/merge-products">
        {() => (
          <ErrorBoundary>
            <RequireAdmin>
              <Suspense fallback={<PageLoader />}>
                <MergeProductsPage />
              </Suspense>
            </RequireAdmin>
          </ErrorBoundary>
        )}
      </Route>

      {/* Alias for merge-product (singular) */}
      <Route path="/admin/merge-product">
        {() => (
          <ErrorBoundary>
            <RequireAdmin>
              <Suspense fallback={<PageLoader />}>
                <MergeProductsPage />
              </Suspense>
            </RequireAdmin>
          </ErrorBoundary>
        )}
      </Route>

      {/* Admin: AI Dashboard */}
      <Route path="/admin/ai">
        {() => (
          <ErrorBoundary>
            <RequireAdmin>
              <Suspense fallback={<PageLoader />}>
                <AdminAI />
              </Suspense>
            </RequireAdmin>
          </ErrorBoundary>
        )}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize device detection (adds body classes automatically)
  useDeviceDetection();

  useEffect(() => {
    // Initialize Google Analytics
    initGA();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>

            <ComparisonProvider>
              <NavbarPreferencesProvider>
                <TooltipProvider>
                  <PageViewTracker />
                  {/* Skip to main content for keyboard navigation */}
                  <a href="#main-content" className="skip-to-main">
                    الانتقال إلى المحتوى الرئيسي
                  </a>
                  <ScrollProgress />
                  <FloatingActionButton />

                  <WinnerNotificationBanner />

                  <Toaster />
                  <LiveChatWidget />
                  <AIChatBot />
                  <Router />
                </TooltipProvider>
              </NavbarPreferencesProvider>
            </ComparisonProvider>

          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

// Track page views on route changes
function PageViewTracker() {
  const [location] = useLocation();

  useEffect(() => {
    trackPageView(location);
  }, [location]);

  return null;
}

export default App;
