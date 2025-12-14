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
import { BubbleTrail } from "@/components/effects/bubble-trail";
import { initGA, trackPageView } from "@/lib/analytics";
import "@/lib/sentry"; // Auto-initializes on import
import { CelebrationOverlay } from "@/components/gallery/celebration-overlay";

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
const FishFinder = lazy(() => import("@/pages/fish-finder"));
const Blog = lazy(() => import("@/pages/blog"));
const BlogPost = lazy(() => import("@/pages/blog-post"));
const OrderConfirmation = lazy(() => import("@/pages/order-confirmation"));
const Register = lazy(() => import("@/pages/register"));



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
import ResetPassword from "@/pages/reset-password";



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


      {/* Lazy loaded product details */}
      <Route path="/products/:slug">
        {() => (
          <Suspense fallback={<PageLoader />}>
            <ProductDetails />
          </Suspense>
        )}
      </Route>

      <Route path="/guides/eco-friendly" component={EcoFriendlyGuide} />

      {/* Lazy loaded calculators */}
      <Route path="/calculators">
        {() => (
          <Suspense fallback={<PageLoader />}>
            <Calculators />
          </Suspense>
        )}
      </Route>

      {/* Lazy loaded routes */}
      <Route path="/journey">
        {() => (
          <Suspense fallback={<PageLoader />}>
            <Journey />
          </Suspense>
        )}
      </Route>





      {/* Lazy loaded fish encyclopedia */}
      <Route path="/fish-encyclopedia">
        {() => (
          <Suspense fallback={<PageLoader />}>
            <FishEncyclopedia />
          </Suspense>
        )}
      </Route>
      {/* Alias for /encyclopedia */}
      <Route path="/encyclopedia">
        {() => (
          <Suspense fallback={<PageLoader />}>
            <FishEncyclopedia />
          </Suspense>
        )}
      </Route>

      <Route path="/deals" component={Deals} />
      <Route path="/wishlist" component={Wishlist} />
      <Route path="/search" component={SearchResults} />

      {/* Lazy loaded community gallery */}
      <Route path="/community-gallery">
        {() => (
          <Suspense fallback={<PageLoader />}>
            <CommunityGallery />
          </Suspense>
        )}
      </Route>

      {/* Lazy loaded fish health diagnosis */}
      <Route path="/fish-health-diagnosis">
        {() => (
          <Suspense fallback={<PageLoader />}>
            <FishHealthDiagnosis />
          </Suspense>
        )}
      </Route>

      {/* Lazy loaded fish finder */}
      <Route path="/fish-finder">
        {() => (
          <Suspense fallback={<PageLoader />}>
            <FishFinder />
          </Suspense>
        )}
      </Route>

      {/* Lazy loaded fish breeding calculator */}
      <Route path="/fish-breeding-calculator">
        {() => (
          <Suspense fallback={<PageLoader />}>
            <FishBreedingCalculator />
          </Suspense>
        )}
      </Route>

      <Route path="/sustainability" component={Sustainability} />
      <Route path="/return-policy" component={ReturnPolicy} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms" component={Terms} />



      {/* Lazy loaded FAQ */}
      <Route path="/faq">
        {() => (
          <Suspense fallback={<PageLoader />}>
            <FAQ />
          </Suspense>
        )}
      </Route>

      <Route path="/order-confirmation/:id">
        {() => (
          <Suspense fallback={<PageLoader />}>
            <OrderConfirmation />
          </Suspense>
        )}
      </Route>

      <Route path="/order-tracking" component={OrderTracking} />

      {/* Lazy loaded blog */}
      <Route path="/blog">
        {() => (
          <Suspense fallback={<PageLoader />}>
            <Blog />
          </Suspense>
        )}
      </Route>

      {/* Blog Post Detail */}
      <Route path="/blog/:id">
        {() => (
          <Suspense fallback={<PageLoader />}>
            <BlogPost />
          </Suspense>
        )}
      </Route>

      <Route path="/shipping" component={Shipping} />
      <Route path="/login" component={Login} />

      {/* Lazy loaded register */}
      <Route path="/register">
        {() => (
          <Suspense fallback={<PageLoader />}>
            <Register />
          </Suspense>
        )}
      </Route>

      {/* Lazy loaded profile */}
      <Route path="/profile">
        {() => (
          <Suspense fallback={<PageLoader />}>
            <Profile />
          </Suspense>
        )}
      </Route>

      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/admin/login" component={AdminLogin} />

      {/* Lazy loaded admin dashboard */}
      <Route path="/admin">
        {() => (
          <RequireAdmin>
            <Suspense fallback={<PageLoader />}>
              <AdminDashboard />
            </Suspense>
          </RequireAdmin>
        )}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    // Initialize Google Analytics
    initGA();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <TooltipProvider>
              <PageViewTracker />
              {/* Skip to main content for keyboard navigation */}
              <a href="#main-content" className="skip-to-main">
                الانتقال إلى المحتوى الرئيسي
              </a>
              <ScrollProgress />
              <FloatingActionButton />
              <BubbleTrail />
              <CelebrationOverlay />
              <Toaster />
              <Router />
            </TooltipProvider>
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
