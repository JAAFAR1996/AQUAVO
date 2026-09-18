import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Heart,
  Home,
  LogOut,
  Menu,
  MoreHorizontal,
  Package,
  Search,
  ShoppingCart,
  Trash2,
  User,
  Wrench,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CartSuggestions } from "@/components/cart/cart-suggestions";
import { ShippingProgress } from "@/components/cart/shipping-progress";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { thumbImage } from "@/lib/cloudinary";
import { useAuth } from "@/contexts/auth-context";
import { useCart } from "@/contexts/cart-context";
import { useWishlist } from "@/contexts/wishlist-context";
import { useLocale } from "@/i18n/locale-context";
import { formatLocalizedPrice } from "@/i18n/format";
import { trackCartOpen } from "@/lib/analytics";
import { useFlowGateNav } from "@/lib/motion/flow-gate-context";
import { isEligibleSection, prefetchSection } from "@/lib/motion/flow-gate-routes";

const GlobalSearch = lazy(() => import("@/components/search/global-search").then((module) => ({ default: module.GlobalSearch })));

type NavKey = "home" | "shop" | "journey" | "guides" | "orderTracking" | "about" | "wishlist" | "contact";
interface NavLink {
  href: string;
  key: NavKey;
  icon: typeof Package;
}

const primaryLinks: NavLink[] = [
  { href: "/products", key: "shop", icon: Package },
  { href: "/journey", key: "journey", icon: Wrench },
  { href: "/guides", key: "guides", icon: BookOpen },
  { href: "/order-tracking", key: "orderTracking", icon: ShoppingCart },
  { href: "/about", key: "about", icon: User },
];

const mobileLinks: NavLink[] = [
  { href: "/", key: "home", icon: Home },
  ...primaryLinks,
  { href: "/wishlist", key: "wishlist", icon: Heart },
  { href: "/contact", key: "contact", icon: User },
];

const tabletOverflowLinks: NavLink[] = [
  { href: "/order-tracking", key: "orderTracking", icon: ShoppingCart },
  { href: "/about", key: "about", icon: User },
  { href: "/wishlist", key: "wishlist", icon: Heart },
  { href: "/contact", key: "contact", icon: User },
];

export default function Navbar() {
  const [location, setLocation] = useLocation();
  const { t } = useTranslation("nav");
  const { t: tc } = useTranslation("common");
  const { locale, dir, href } = useLocale();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { items: cartItems, removeItem, updateQuantity, totalItems, totalPrice } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const { user, logout } = useAuth();
  const flowGateNav = useFlowGateNav();
  const warm = (href: string) => () => { if (isEligibleSection(href)) prefetchSection(href); };
  const price = (value: number) => formatLocalizedPrice(value, locale);
  // The drawer opens from the leading edge and the cart from the trailing edge in both directions.
  const menuSide = dir === "rtl" ? "right" : "left";
  const cartSide = dir === "rtl" ? "left" : "right";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("open-cart") === "1") {
      setIsCartOpen(true);
      window.history.replaceState({}, "", href("/"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const finePointer = window.matchMedia?.("(pointer: fine)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (!finePointer || saveData) return;

    const warmStore = () => prefetchSection("/products");
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(warmStore, { timeout: 2000 });
      return () => window.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(warmStore, 1200);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const openCart = (open: boolean) => {
    setIsCartOpen(open);
    if (open) trackCartOpen(cartItems.map((item) => ({
      id: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    })), totalPrice);
  };

  const wishlistLabel = wishlistCount > 0 ? t("wishlist.withCount", { count: wishlistCount }) : t("wishlist.empty");
  const cartLabel = totalItems > 0 ? t("cart.withCount", { count: totalItems }) : t("cart.empty");

  return (
    <>
      <nav
        className="aq-site-header sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md"
        aria-label={t("mainNav")}
        dir={dir}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:px-5 lg:px-6">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 lg:hidden"
                aria-label={t("openMenu")}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-menu"
              >
                <Menu className="h-6 w-6" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent id="mobile-menu" side={menuSide} className="w-[88vw] max-w-sm border-border bg-background p-0">
              <SheetHeader className="border-b border-border px-5 py-5 text-start">
                <SheetTitle className="text-foreground">{t("menuTitle")}</SheetTitle>
                <SheetDescription className="sr-only">{t("menuDescription")}</SheetDescription>
              </SheetHeader>
              <div className="flex h-full flex-col px-3 py-4">
                <div className="space-y-1" aria-label={t("siteLinks")}>
                  {mobileLinks.map((link) => {
                    const Icon = link.icon;
                    const active = location === link.href;
                    const linkClassName = `flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active ? "bg-primary/15 text-primary" : "text-foreground/75 hover:bg-foreground/5 hover:text-foreground"
                    }`;
                    const content = (
                      <>
                        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                        {t(`links.${link.key}`)}
                      </>
                    );

                    if (link.href === "/guides") {
                      return (
                        <a key={link.href} href={href(link.href)} onClick={() => setIsMenuOpen(false)} className={linkClassName}>
                          {content}
                        </a>
                      );
                    }

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsMenuOpen(false)}
                        className={linkClassName}
                      >
                        {content}
                      </Link>
                    );
                  })}
                </div>

                <div className="mt-5 border-t border-border pt-5">
                  <p className="px-3 text-xs leading-6 text-muted-foreground">
                    {t("deliveryNote")}
                    <br />
                    {t("paymentNote")}
                  </p>
                </div>

                <div className="mt-auto space-y-3 border-t border-border px-3 py-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground/70">{tc("language.label")}</span>
                    <LanguageSwitcher variant="full" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground/70">{tc("theme.label")}</span>
                    <ThemeSwitcher />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/" aria-label={t("homeLink")} className="shrink-0" onClick={flowGateNav("/")}>
            <img
              data-aqv-brand-mark
              src="/brand/aquavo-v2-horizontal.svg"
              alt="AQUAVO"
              width="180"
              height="50"
              className="h-8 w-auto max-w-28 object-contain sm:h-9 sm:max-w-36"
            />
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {primaryLinks.map((link, index) => {
              const active = location === link.href;
              const responsiveVisibility = index >= 3 ? "hidden xl:inline-flex" : "inline-flex";
              const linkClassName = `relative items-center rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors xl:px-3 ${responsiveVisibility} ${
                active ? "text-foreground" : "text-foreground/65 hover:text-foreground"
              }`;
              const content = (
                <>
                  {t(`links.${link.key}`)}
                  {active && <span className="absolute inset-x-3 -bottom-[9px] h-0.5 bg-primary" aria-hidden="true" />}
                </>
              );

              if (link.href === "/guides") {
                return (
                  <a key={link.href} href={href(link.href)} className={linkClassName}>
                    {content}
                  </a>
                );
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={linkClassName}
                  onClick={flowGateNav(link.href, warm(link.href))}
                  onPointerEnter={warm(link.href)}
                  onFocus={warm(link.href)}
                >
                  {content}
                </Link>
              );
            })}
          </div>

          <div className="hidden lg:block xl:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t("moreLinks")}>
                  <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>{t("more")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {tabletOverflowLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link href={link.href} className="flex w-full cursor-pointer items-center gap-2">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {t(`links.${link.key}`)}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <div className="flex items-center justify-between px-2 py-2">
                  <span className="text-sm text-muted-foreground">{tc("language.label")}</span>
                  <LanguageSwitcher />
                </div>
                <div className="flex items-center justify-between px-2 py-2">
                  <span className="text-sm text-muted-foreground">{tc("theme.label")}</span>
                  <ThemeSwitcher />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="ms-auto flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="hidden min-h-10 min-w-40 items-center gap-2 rounded-lg border border-border bg-foreground/5 px-3 text-sm text-muted-foreground transition-colors hover:border-primary/45 hover:text-foreground lg:flex xl:min-w-48"
              aria-label={t("search.button")}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              <span className="hidden xl:inline">{t("search.placeholder")}</span>
              <span className="xl:hidden">{t("search.short")}</span>
              <kbd className="ms-auto hidden rounded border border-border px-1.5 py-0.5 font-interface text-[10px] xl:inline">Ctrl K</kbd>
            </button>

            <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("search.open")} onClick={() => setIsSearchOpen(true)}>
              <Search className="h-5 w-5" aria-hidden="true" />
            </Button>

            <div className="hidden xl:flex xl:items-center xl:gap-2">
              <LanguageSwitcher />
              <ThemeSwitcher />
            </div>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hidden rounded-full sm:inline-flex" aria-label={t("account.menu")}>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={undefined} alt={user.fullName || user.email} />
                      <AvatarFallback className="bg-primary/15 text-primary">
                        {(user.fullName || user.email).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-medium">{user.fullName}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex w-full cursor-pointer items-center gap-2">
                      <User className="h-4 w-4" aria-hidden="true" />
                      {t("account.profile")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile?tab=orders" className="flex w-full cursor-pointer items-center gap-2">
                      <Package className="h-4 w-4" aria-hidden="true" />
                      {t("account.orders")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-destructive">
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    {t("account.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                href="/login"
                className="hidden min-h-10 items-center rounded-lg px-3 text-sm font-medium text-foreground/70 hover:bg-foreground/5 hover:text-foreground sm:inline-flex"
                aria-label={t("account.login")}
              >
                <User className="h-5 w-5 xl:hidden" aria-hidden="true" />
                <span className="hidden xl:inline">{t("account.login")}</span>
              </Link>
            )}

            <Link
              href="/wishlist"
              className="relative hidden h-10 w-10 items-center justify-center rounded-lg text-foreground/70 hover:bg-foreground/5 hover:text-foreground sm:inline-flex"
              aria-label={wishlistLabel}
            >
              <Heart className="h-5 w-5" aria-hidden="true" />
              {wishlistCount > 0 && (
                <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <Sheet open={isCartOpen} onOpenChange={openCart}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="relative border-border bg-transparent"
                  data-aqv-cart-target
                  aria-label={cartLabel}
                >
                  <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                  {totalItems > 0 && (
                    <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                      {totalItems}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side={cartSide} className="w-full max-w-md border-border bg-background sm:w-[420px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                    {t("cart.title")}
                  </SheetTitle>
                  <SheetDescription className="sr-only">{t("cart.description")}</SheetDescription>
                </SheetHeader>
                <div className="mt-6 flex h-[calc(100vh-180px)] flex-col" aria-live="polite" aria-atomic="false">
                  {cartItems.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground" role="status">
                      <ShoppingCart className="mb-4 h-14 w-14 opacity-20" aria-hidden="true" />
                      <p className="text-lg font-medium text-foreground">{t("cart.emptyTitle")}</p>
                      <p className="mt-1 max-w-64 text-sm">{t("cart.emptyHint")}</p>
                      <Link
                        href="/products"
                        onClick={() => setIsCartOpen(false)}
                        className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-primary/40 px-4 text-sm font-bold text-primary hover:bg-primary/10"
                      >
                        {tc("actions.browseProducts")}
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4">
                        <ShippingProgress />
                      </div>
                      <ul className="flex-1 space-y-3 overflow-auto pe-1" aria-label={t("cart.itemsList")}>
                        {cartItems.map((item) => (
                          <li
                            key={item.id}
                            className="flex gap-3 rounded-lg border border-border bg-card p-3"
                            aria-label={t("cart.itemSummary", {
                              name: item.name,
                              variant: item.variantLabel ? t("cart.variantSuffix", { variant: item.variantLabel }) : "",
                              quantity: item.quantity,
                              price: price(item.price),
                            })}
                          >
                            <img src={thumbImage(item.image) || "/brand/aquavo-v2-icon.svg"} alt="" aria-hidden="true" className="h-16 w-16 rounded-md bg-card object-contain p-1" loading="lazy" decoding="async" width={64} height={64} />
                            <div className="min-w-0 flex-1">
                              <h4 className="truncate text-sm font-medium">{item.name}</h4>
                              {item.variantLabel && <p className="truncate text-xs text-muted-foreground">{t("cart.variant", { variant: item.variantLabel })}</p>}
                              <p className="mt-1 font-bold text-foreground">{price(item.price)}</p>
                              <div className="mt-2 flex items-center justify-between">
                                <div className="flex items-center gap-1" role="group" aria-label={t("cart.quantityGroup", { name: item.name })}>
                                  <Button variant="outline" size="icon" className="h-11 w-11 md:h-11 md:w-11" onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label={t("cart.decrease", { name: item.name })}>
                                    <span aria-hidden="true">−</span>
                                  </Button>
                                  <span className="w-6 text-center text-sm font-semibold" aria-hidden="true">{item.quantity}</span>
                                  <span className="sr-only">{tc("quantityValue", { count: item.quantity })}</span>
                                  <Button variant="outline" size="icon" className="h-11 w-11 md:h-11 md:w-11" onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label={t("cart.increase", { name: item.name })}>
                                    <span aria-hidden="true">+</span>
                                  </Button>
                                </div>
                                <Button variant="ghost" size="icon" className="h-11 w-11 md:h-11 md:w-11 text-destructive" onClick={() => removeItem(item.id)} aria-label={t("cart.remove", { name: item.name })}>
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <Separator className="my-4" />
                      <CartSuggestions />
                      <div className="space-y-3">
                        <dl className="flex items-center justify-between">
                          <dt className="font-medium">{t("cart.total")}</dt>
                          <dd className="text-xl font-bold text-foreground" aria-live="polite">{price(totalPrice)}</dd>
                        </dl>
                        <Button
                          type="button"
                          className="w-full"
                          size="lg"
                          onClick={() => {
                            setIsCartOpen(false);
                            setLocation("/checkout");
                          }}
                        >
                          {t("cart.checkout")}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {isSearchOpen && (
        <Suspense fallback={null}>
          <GlobalSearch open={isSearchOpen} onOpenChange={setIsSearchOpen} />
        </Suspense>
      )}
    </>
  );
}
