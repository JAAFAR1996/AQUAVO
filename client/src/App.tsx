import { Switch, Route, Redirect, useLocation } from "wouter";
import { lazy, Suspense, useEffect, useState, useRef, useCallback, type ReactNode } from "react";
import { PageLoader, AppInitLoader } from "@/components/ui/loaders";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/cart-context";
import { WishlistProvider } from "@/contexts/wishlist-context";
import { AuthProvider } from "@/contexts/auth-context";
import { RequireAdmin } from "@/components/auth/require-admin";
// Lazy-load heavy effects that read DOM geometry and cause forced reflows
const ScrollProgress = lazy(() => import("@/components/effects/scroll-progress").then(m => ({ default: m.ScrollProgress })));
const FloatingActionButton = lazy(() => import("@/components/effects/floating-action-button").then(m => ({ default: m.FloatingActionButton })));
const Analytics = lazy(() => import("@vercel/analytics/react").then(m => ({ default: m.Analytics })));
const SpeedInsights = lazy(() => import("@vercel/speed-insights/react").then(m => ({ default: m.SpeedInsights })));

import { initGA, trackPageView } from "@/lib/analytics";
import { useMetaPixelInit, useMetaPageView } from "@/hooks/use-meta-pixel";
import { useDeviceDetection } from "@/hooks/use-device-detection";

import { ComparisonProvider } from "@/contexts/comparison-context";
import { NavbarPreferencesProvider } from "@/hooks/use-navbar-preferences";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { PageTransition } from "@/components/ui/page-transition";

// Direct imports for critical pages only (needed for fast first paint)
import Home from "@/pages/home";
const Products = lazy(() => import("@/pages/products"));

// Lazy load ALL non-critical pages for better performance (code splitting)
const NotFound = lazy(() => import("@/pages/404"));
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
const CheckoutPage = lazy(() => import("@/pages/checkout"));
const Register = lazy(() => import("@/pages/register"));
const Compare = lazy(() => import("@/pages/compare"));
const AquariumWizard = lazy(() => import("@/pages/aquarium-wizard"));
const FishCompatibility = lazy(() => import("@/pages/fish-compatibility"));
const MergeProductsPage = lazy(() => import("@/pages/admin/merge-products"));
const AdminAI = lazy(() => import("@/pages/admin/admin-ai"));
const InvestPage = lazy(() => import("@/pages/invest"));
const AITools = lazy(() => import("@/pages/ai-tools"));
const BeginnerGuide = lazy(() => import("@/pages/beginner-guide"));
const SocialAnalytics = lazy(() => import("@/pages/admin/social-analytics"));
const Wishlist = lazy(() => import("@/pages/wishlist"));
const SearchResults = lazy(() => import("@/pages/search-results"));
const Sustainability = lazy(() => import("@/pages/sustainability"));
const EcoFriendlyGuide = lazy(() => import("@/pages/guides-eco-friendly"));
const About = lazy(() => import("@/pages/about"));
const WhyAquavo = lazy(() => import("@/pages/why-aquavo"));
const ReturnPolicy = lazy(() => import("@/pages/return-policy"));
const PrivacyPolicy = lazy(() => import("@/pages/privacy-policy"));
const Terms = lazy(() => import("@/pages/terms"));
const VerifyCertificate = lazy(() => import("@/pages/verify-certificate"));
const OrderTracking = lazy(() => import("@/pages/order-tracking"));
const AdminLogin = lazy(() => import("@/pages/admin-login"));
const Shipping = lazy(() => import("@/pages/shipping"));
const Login = lazy(() => import("@/pages/login"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password"));
const FishPatientsPage = lazy(() => import("@/pages/fish-patients"));
const CulturalTwin = lazy(() => import("@/pages/cultural-twin"));
const LinksPage = lazy(() => import("@/pages/links"));
const TemperatureGuide = lazy(() => import("@/pages/temperature-guide"));
const InvoiceView = lazy(() => import("@/pages/invoice-view"));
const Contact = lazy(() => import("@/pages/contact"));

// Lazy load heavy global components
const AIChatBot = lazy(() => import("@/components/chat/ai-chat-bot").then(m => ({ default: m.AIChatBot })));
const OnboardingTour = lazy(() => import("@/components/onboarding-tour").then(m => ({ default: m.OnboardingTour })));
const InstallPrompt = lazy(() => import("@/components/pwa/pwa-components").then(m => ({ default: m.InstallPrompt })));
const OfflineIndicator = lazy(() => import("@/components/pwa/pwa-components").then(m => ({ default: m.OfflineIndicator })));
const UpdateBanner = lazy(() => import("@/components/pwa/pwa-components").then(m => ({ default: m.UpdateBanner })));

// Deferred OnboardingTour: checks localStorage BEFORE importing heavy Joyride library.
// Returns null immediately for returning users (zero JS cost).
// For new users, defers import to requestIdleCallback (after paint).
function DeferredOnboardingTour() {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    // Quick localStorage check — if tour already seen, never import Joyride
    const path = location;
    const seenKey = `aquavo_tour_seen_${path === '/' ? 'home' : path.split('/')[1]}`;
    if (localStorage.getItem(seenKey)) return;

    let idleId: number | undefined;
    const timer = window.setTimeout(() => {
      idleId = (window as any).requestIdleCallback?.(
        () => setShouldLoad(true),
        { timeout: 2000 }
      );
      if (!idleId) setShouldLoad(true);
    }, 30000);

    return () => {
      window.clearTimeout(timer);
      if (idleId) (window as any).cancelIdleCallback(idleId);
    };
  }, [location]);

  if (!shouldLoad) return null;
  return <OnboardingTour />;
}

function IdleMount({ children, timeout = 5000 }: { children: ReactNode; timeout?: number }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const mount = () => setMounted(true);
    let idleId: number | undefined;
    const timer = window.setTimeout(() => {
      idleId = (window as any).requestIdleCallback?.(mount, { timeout: 2000 });
      if (!idleId) mount();
    }, timeout);

    return () => {
      window.clearTimeout(timer);
      if (idleId) (window as any).cancelIdleCallback(idleId);
    };
  }, [timeout]);

  if (!mounted) return null;
  return <>{children}</>;
}

function DeferredSentryInit() {
  useEffect(() => {
    const load = () => import("@/lib/sentry");
    let idleId: number | undefined;
    const timer = window.setTimeout(() => {
      idleId = (window as any).requestIdleCallback?.(load, { timeout: 2000 });
      if (!idleId) void load();
    }, 7000);

    return () => {
      window.clearTimeout(timer);
      if (idleId) (window as any).cancelIdleCallback(idleId);
    };
  }, []);

  return null;
}

function isHostedAnalyticsOrigin() {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname.toLowerCase();
  return (
    hostname === "www.aquavoiq.com" ||
    hostname === "aquavoiq.com" ||
    hostname.endsWith(".vercel.app")
  );
}

function DeferredThirdPartyAnalytics() {
  useEffect(() => {
    if (!isHostedAnalyticsOrigin()) return;

    const load = () => {
      void import("@/lib/third-party-analytics").then(({ loadThirdPartyAnalytics }) => {
        loadThirdPartyAnalytics();
      });
    };

    let idleId: number | undefined;
    const timer = window.setTimeout(() => {
      idleId = (window as any).requestIdleCallback?.(load, { timeout: 2500 });
      if (!idleId) load();
    }, 8000);

    return () => {
      window.clearTimeout(timer);
      if (idleId) (window as any).cancelIdleCallback(idleId);
    };
  }, []);

  return null;
}


// PageLoader and AppInitLoader are imported from @/components/ui/loaders

function Router() {
  return (
    <Switch>
      <Route path="/">{() => <PageTransition><Home /></PageTransition>}</Route>
      <Route path="/ar">{() => <PageTransition><Home /></PageTransition>}</Route>
      <Route path="/products">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PageTransition><Products /></PageTransition>
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* Aquarium Setup Wizard */}
      <Route path="/aquarium-wizard">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PageTransition><AquariumWizard /></PageTransition>
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>


      {/* Lazy loaded product details */}
      <Route path="/products/:slug">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PageTransition><ProductDetails /></PageTransition>
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      <Route path="/guides/eco-friendly">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PageTransition><EcoFriendlyGuide /></PageTransition>
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* Beginner Guide */}
      <Route path="/beginner-guide">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PageTransition><BeginnerGuide /></PageTransition>
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* Lazy loaded calculators */}
      <Route path="/calculators">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PageTransition><Calculators /></PageTransition>
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* Lazy loaded routes */}
      <Route path="/journey">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PageTransition><Journey /></PageTransition>
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* AI Tools - Visual Analyzer */}
      <Route path="/ai-tools">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PageTransition><AITools /></PageTransition>
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>





      {/* Lazy loaded fish encyclopedia */}
      <Route path="/fish-encyclopedia">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PageTransition><FishEncyclopedia /></PageTransition>
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* Fish Compatibility Calculator */}
      <Route path="/fish-compatibility">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PageTransition><FishCompatibility /></PageTransition>
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>
      {/* Alias for /encyclopedia */}
      <Route path="/encyclopedia">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PageTransition><FishEncyclopedia /></PageTransition>
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      <Route path="/wishlist">
        {() => (<ErrorBoundary><Suspense fallback={<PageLoader />}><PageTransition><Wishlist /></PageTransition></Suspense></ErrorBoundary>)}
      </Route>
      <Route path="/search">
        {() => (<ErrorBoundary><Suspense fallback={<PageLoader />}><PageTransition><SearchResults /></PageTransition></Suspense></ErrorBoundary>)}
      </Route>

      {/* Lazy loaded compare page */}
      <Route path="/compare">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PageTransition><Compare /></PageTransition>
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* Lazy loaded community gallery */}
      <Route path="/community-gallery">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PageTransition><CommunityGallery /></PageTransition>
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* Lazy loaded fish health diagnosis */}
      <Route path="/fish-health-diagnosis">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PageTransition><FishHealthDiagnosis /></PageTransition>
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* Fish Patient Records */}
      <Route path="/fish-patients">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PageTransition><FishPatientsPage /></PageTransition>
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* Cultural Twin — التوأم الثقافي */}
      <Route path="/cultural-twin">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PageTransition><CulturalTwin /></PageTransition>
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* Lazy loaded fish breeding calculator */}
      <Route path="/fish-breeding-calculator">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PageTransition><FishBreedingCalculator /></PageTransition>
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      <Route path="/sustainability">
        {() => (<ErrorBoundary><Suspense fallback={<PageLoader />}><PageTransition><Sustainability /></PageTransition></Suspense></ErrorBoundary>)}
      </Route>
      <Route path="/about">
        {() => (<ErrorBoundary><Suspense fallback={<PageLoader />}><PageTransition><About /></PageTransition></Suspense></ErrorBoundary>)}
      </Route>
      <Route path="/why-aquavo">
        {() => (<ErrorBoundary><Suspense fallback={<PageLoader />}><PageTransition><WhyAquavo /></PageTransition></Suspense></ErrorBoundary>)}
      </Route>
      <Route path="/return-policy">
        {() => (<ErrorBoundary><Suspense fallback={<PageLoader />}><PageTransition><ReturnPolicy /></PageTransition></Suspense></ErrorBoundary>)}
      </Route>
      <Route path="/privacy-policy">
        {() => (<ErrorBoundary><Suspense fallback={<PageLoader />}><PageTransition><PrivacyPolicy /></PageTransition></Suspense></ErrorBoundary>)}
      </Route>
      <Route path="/terms">
        {() => (<ErrorBoundary><Suspense fallback={<PageLoader />}><PageTransition><Terms /></PageTransition></Suspense></ErrorBoundary>)}
      </Route>
      <Route path="/verify-certificate/:id">
        {() => (<ErrorBoundary><Suspense fallback={<PageLoader />}><PageTransition><VerifyCertificate /></PageTransition></Suspense></ErrorBoundary>)}
      </Route>



      {/* Contact page */}
      <Route path="/contact">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PageTransition><Contact /></PageTransition>
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* Lazy loaded FAQ */}
      <Route path="/faq">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PageTransition><FAQ /></PageTransition>
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      <Route path="/order-confirmation/:id">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PageTransition><OrderConfirmation /></PageTransition>
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      <Route path="/order-tracking">
        {() => (<ErrorBoundary><Suspense fallback={<PageLoader />}><PageTransition><OrderTracking /></PageTransition></Suspense></ErrorBoundary>)}
      </Route>

      {/* Lazy loaded blog */}
      <Route path="/blog">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PageTransition><Blog /></PageTransition>
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* Blog Post Detail */}
      <Route path="/blog/:id">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PageTransition><BlogPost /></PageTransition>
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* Invest Page */}
      <Route path="/invest">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <PageTransition><InvestPage /></PageTransition>
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* Redirects for common 404s */}
      <Route path="/cart">{() => <Redirect to="/" />}</Route>
      <Route path="/admin-login">{() => <Redirect to="/admin/login" />}</Route>
      <Route path="/returns">{() => <Redirect to="/return-policy" />}</Route>
      <Route path="/fish-doctor">{() => <Redirect to="/fish-health-diagnosis" />}</Route>
      <Route path="/auth">{() => <Redirect to="/login" />}</Route>

      <Route path="/shipping">
        {() => (<ErrorBoundary><Suspense fallback={<PageLoader />}><PageTransition><Shipping /></PageTransition></Suspense></ErrorBoundary>)}
      </Route>
      <Route path="/login">
        {() => (<ErrorBoundary><Suspense fallback={<PageLoader />}><Login /></Suspense></ErrorBoundary>)}
      </Route>

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
              <PageTransition><Profile /></PageTransition>
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      <Route path="/forgot-password">
        {() => (<ErrorBoundary><Suspense fallback={<PageLoader />}><ForgotPassword /></Suspense></ErrorBoundary>)}
      </Route>

      <Route path="/admin/login">
        {() => (<ErrorBoundary><Suspense fallback={<PageLoader />}><AdminLogin /></Suspense></ErrorBoundary>)}
      </Route>

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

      {/* Admin: Social Media Analytics */}
      <Route path="/admin/social-analytics">
        {() => (
          <ErrorBoundary>
            <RequireAdmin>
              <Suspense fallback={<PageLoader />}>
                <SocialAnalytics />
              </Suspense>
            </RequireAdmin>
          </ErrorBoundary>
        )}
      </Route>

      {/* Checkout Page - Full page checkout (replaces dialog on mobile) */}
      <Route path="/checkout">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <CheckoutPage />
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* Links Page - QR Code Landing - No navbar/footer */}
      <Route path="/links">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <LinksPage />
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* Temperature Guide — Story 4 Lead Magnet (standalone, no navbar) */}
      <Route path="/temperature-guide">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <TemperatureGuide />
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      {/* Manual Invoice View (Standalone) */}
      <Route path="/invoice/:token">
        {() => (
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <InvoiceView />
            </Suspense>
          </ErrorBoundary>
        )}
      </Route>

      <Route>
        {() => (<Suspense fallback={<PageLoader />}><NotFound /></Suspense>)}
      </Route>
    </Switch>
  );
}

function AppShell() {
  // Initialize device detection (adds body classes automatically)
  useDeviceDetection();
  const [location] = useLocation();

  // Initialize Meta Pixel (deferred to idle callback for performance)
  useMetaPixelInit();
  useMetaPageView();

  // Standalone pages that should NOT show global UI (chatbot, FAB, scroll progress, etc.)
  const isStandalonePage = ['/links', '/temperature-guide', '/checkout'].includes(location) || location.startsWith('/invoice/');
  const shouldLoadHostedAnalytics = isHostedAnalyticsOrigin();

  useEffect(() => {
    // Defer GA init to after first idle to reduce TBT
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => initGA(), { timeout: 4000 });
    } else {
      setTimeout(() => initGA(), 3000);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>

            <ComparisonProvider>
              <NavbarPreferencesProvider>
                <TooltipProvider>
                  {shouldLoadHostedAnalytics && (
                    <IdleMount timeout={4500}>
                      <Suspense fallback={null}>
                        <Analytics />
                        <SpeedInsights />
                      </Suspense>
                    </IdleMount>
                  )}
                  <DeferredThirdPartyAnalytics />
                  <DeferredSentryInit />
                  <PageViewTracker />
                  {/* Skip to main content for keyboard navigation */}
                  {!isStandalonePage && (
                    <a href="#main-content" className="skip-to-main">
                      الانتقال إلى المحتوى الرئيسي
                    </a>
                  )}
                  {!isStandalonePage && (
                    <IdleMount timeout={30000}>
                      <Suspense fallback={null}>
                        <ScrollProgress />
                      </Suspense>
                    </IdleMount>
                  )}
                  {!isStandalonePage && (
                    <IdleMount timeout={30000}>
                      <Suspense fallback={null}>
                        <FloatingActionButton />
                      </Suspense>
                    </IdleMount>
                  )}

                  <IdleMount timeout={22000}>
                    <Suspense fallback={null}>
                      <UpdateBanner />
                      <OfflineIndicator />
                    </Suspense>
                  </IdleMount>

                  <Toaster />
                  {!isStandalonePage && (
                    <IdleMount timeout={30000}>
                      <Suspense fallback={null}>
                        <AIChatBot />
                      </Suspense>
                    </IdleMount>
                  )}
                  <Router />
                  {!isStandalonePage && (
                    <Suspense fallback={null}>
                      <DeferredOnboardingTour />
                    </Suspense>
                  )}
                  {!isStandalonePage && (
                    <IdleMount timeout={30000}>
                      <Suspense fallback={null}>
                        <InstallPrompt className="fixed bottom-20 left-4 right-4 z-40 max-w-sm mx-auto" />
                      </Suspense>
                    </IdleMount>
                  )}
                </TooltipProvider>
              </NavbarPreferencesProvider>
            </ComparisonProvider>

          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

// Generate or reuse a client-side session ID (persists across page loads in same tab)
function getClientSessionId(): string {
  let sid = sessionStorage.getItem("aq_sid");
  if (!sid) {
    sid = `cs_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem("aq_sid", sid);
  }
  return sid;
}

// Track page views on route changes + scroll to top + dwell time
function PageViewTracker() {
  const [location] = useLocation();

  // Refs to track current page view state without causing re-renders
  const viewIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const locationRef = useRef<string>(location);

  // Send duration for the previous page view
  const sendDuration = useCallback(() => {
    const vid = viewIdRef.current;
    if (!vid) return;
    const durationSec = Math.round((Date.now() - startTimeRef.current) / 1000);
    if (durationSec < 1) return; // ignore sub-second visits

    // Use sendBeacon for reliability on tab close, fallback to fetch
    const payload = JSON.stringify({ viewId: vid, duration: durationSec });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics/update-visit", new Blob([payload], { type: "application/json" }));
    } else {
      fetch("/api/analytics/update-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
    viewIdRef.current = null;
  }, []);

  // Disable browser's automatic scroll restoration
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Handle tab visibility changes (send duration when tab is hidden/closed)
  useEffect(() => {
    const handleVisChange = () => {
      if (document.visibilityState === "hidden") sendDuration();
    };
    document.addEventListener("visibilitychange", handleVisChange);
    return () => document.removeEventListener("visibilitychange", handleVisChange);
  }, [sendDuration]);

  useEffect(() => {
    // Send duration for the PREVIOUS page before tracking the new one
    if (locationRef.current !== location) {
      sendDuration();
    }
    locationRef.current = location;

    // Immediate scroll
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    // Delayed scroll to handle lazy-loaded content
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }, 100);
    trackPageView(location);

    // ── Start new page view tracking ──────────────────────────
    startTimeRef.current = Date.now();
    viewIdRef.current = null;

    const trackVisit = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const utmSource   = params.get("utm_source")   ?? undefined;
        const utmMedium   = params.get("utm_medium")   ?? undefined;
        const utmCampaign = params.get("utm_campaign") ?? undefined;
        const referrer    = document.referrer || undefined;
        const clientSessionId = getClientSessionId();

        fetch("/api/analytics/track-visit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ pagePath: location, referrer, utmSource, utmMedium, utmCampaign, clientSessionId }),
        })
          .then(r => r.json())
          .then(data => { if (data?.viewId) viewIdRef.current = data.viewId; })
          .catch(() => {});
      } catch { /* never crash the app */ }
    };

    let idleId: number | undefined;
    const visitTimer = window.setTimeout(() => {
      idleId = (window as any).requestIdleCallback?.(trackVisit, { timeout: 2500 });
      if (!idleId) trackVisit();
    }, 5000);

    // Heartbeat — tells the server "I'm still on this page" every 45s
    const sendHeartbeat = () => {
      try {
        fetch("/api/analytics/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ sessionId: getClientSessionId(), pagePath: location }),
        }).catch(() => {});
      } catch { /* never crash */ }
    };
    sendHeartbeat(); // immediate on page load
    const heartbeatTimer = window.setInterval(sendHeartbeat, 45_000);

    return () => {
      clearTimeout(timer);
      window.clearTimeout(visitTimer);
      window.clearInterval(heartbeatTimer);
      if (idleId) (window as any).cancelIdleCallback(idleId);
    };
  }, [location, sendDuration]);

  return null;
}

function hasSeenInitLoader() {
  try {
    if (typeof window === "undefined") return true;
    return window.sessionStorage.getItem("aq_init") === "1";
  } catch {
    return false;
  }
}

function markInitLoaderSeen() {
  try {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem("aq_init", "1");
  } catch {
    // Storage can be unavailable in private/sandboxed browser contexts.
  }
}

// Aurora init loader shown once per session (first paint only), then AppShell takes over
function App() {
  const [initDone, setInitDone] = useState(hasSeenInitLoader);
  const handleInitDone = useCallback(() => {
    markInitLoaderSeen();
    setInitDone(true);
  }, []);

  if (!initDone) return <AppInitLoader onDone={handleInitDone} />;
  return <AppShell />;
}

export default App;
