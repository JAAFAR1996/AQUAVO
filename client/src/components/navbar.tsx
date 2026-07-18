import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  BookOpen,
  Heart,
  Home,
  LogOut,
  Menu,
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
import { thumbImage } from "@/lib/cloudinary";
import { useAuth } from "@/contexts/auth-context";
import { useCart } from "@/contexts/cart-context";
import { useWishlist } from "@/contexts/wishlist-context";
import { formatIQD } from "@/lib/utils";
import { trackCartOpen } from "@/lib/analytics";

const GlobalSearch = lazy(() => import("@/components/search/global-search").then((module) => ({ default: module.GlobalSearch })));

const primaryLinks = [
  { href: "/products", label: "المتجر", icon: Package },
  { href: "/tank-builder", label: "اختار المناسب", icon: Wrench },
  { href: "/guides", label: "أدلة AQUAVO", icon: BookOpen },
  { href: "/order-tracking", label: "تتبع طلبك", icon: ShoppingCart },
  { href: "/about", label: "منو AQUAVO", icon: User },
];

const mobileLinks = [
  { href: "/", label: "الرئيسية", icon: Home },
  ...primaryLinks,
  { href: "/wishlist", label: "المفضلة", icon: Heart },
  { href: "/contact", label: "تواصل ويانا", icon: User },
];

export default function Navbar() {
  const [location, setLocation] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { items: cartItems, removeItem, updateQuantity, totalItems, totalPrice } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const { user, logout } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("open-cart") === "1") {
      setIsCartOpen(true);
      window.history.replaceState({}, "", "/");
    }
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

  return (
    <>
      <nav
        className="aq-site-header sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md"
        aria-label="التنقل الرئيسي"
        dir="rtl"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:px-5 lg:px-6">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 xl:hidden"
                aria-label="فتح القائمة الرئيسية"
                aria-expanded={isMenuOpen}
                aria-controls="mobile-menu"
              >
                <Menu className="h-6 w-6" aria-hidden="true" />
              </Button>
            </SheetTrigger>
              <SheetContent id="mobile-menu" side="right" className="w-[88vw] max-w-sm border-border bg-background p-0">
                <SheetHeader className="border-b border-border px-5 py-5 text-right">
                  <SheetTitle className="text-foreground">القائمة الرئيسية</SheetTitle>
                  <SheetDescription className="sr-only">روابط المتجر والأدلة وحسابك وخيارات العرض.</SheetDescription>
              </SheetHeader>
              <div className="flex h-full flex-col px-3 py-4">
                <div className="space-y-1" aria-label="روابط الموقع">
                  {mobileLinks.map((link) => {
                    const Icon = link.icon;
                    const active = location === link.href;
                    const linkClassName = `flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active ? "bg-primary/15 text-primary" : "text-foreground/75 hover:bg-foreground/5 hover:text-foreground"
                    }`;
                    const content = (
                      <>
                        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                        {link.label}
                      </>
                    );

                    if (link.href === "/guides") {
                      return (
                        <a key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)} className={linkClassName}>
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
                    توصيل خلال 24 ساعة لكل العراق
                    <br />
                    الدفع عند الاستلام — التوصيل 5,000 د.ع
                  </p>
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-border px-3 py-5">
                  <span className="text-sm text-foreground/70">المظهر</span>
                  <ThemeSwitcher />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/" aria-label="الصفحة الرئيسية - AQUAVO" className="shrink-0">
            <img
              src="/brand/aquavo-v2-horizontal.svg"
              alt="AQUAVO"
              width="180"
              height="50"
              className="h-8 w-auto max-w-28 object-contain sm:h-9 sm:max-w-36"
            />
          </Link>

          <div className="hidden items-center gap-1 xl:flex">
            {primaryLinks.map((link) => {
              const active = location === link.href;
              const linkClassName = `relative rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
                active ? "text-foreground" : "text-foreground/65 hover:text-foreground"
              }`;
              const content = (
                <>
                  {link.label}
                  {active && <span className="absolute inset-x-3 -bottom-[9px] h-0.5 bg-primary" aria-hidden="true" />}
                </>
              );

              if (link.href === "/guides") {
                return (
                  <a key={link.href} href={link.href} className={linkClassName}>
                    {content}
                  </a>
                );
              }

              return (
                <Link key={link.href} href={link.href} className={linkClassName}>
                  {content}
                </Link>
              );
            })}
          </div>

          <div className="ms-auto flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="hidden min-h-10 min-w-48 items-center gap-2 rounded-lg border border-border bg-foreground/5 px-3 text-sm text-muted-foreground transition-colors hover:border-primary/45 hover:text-foreground lg:flex"
              aria-label="البحث عن منتج (Ctrl+K)"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              <span>ابحث عن منتج...</span>
              <kbd className="ms-auto rounded border border-border px-1.5 py-0.5 font-interface text-[10px]">Ctrl K</kbd>
            </button>

            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="البحث" onClick={() => setIsSearchOpen(true)}>
              <Search className="h-5 w-5" aria-hidden="true" />
            </Button>

            <div className="hidden xl:block">
              <ThemeSwitcher />
            </div>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hidden rounded-full sm:inline-flex" aria-label="قائمة الحساب الشخصي">
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
                      الملف الشخصي
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile?tab=orders" className="flex w-full cursor-pointer items-center gap-2">
                      <Package className="h-4 w-4" aria-hidden="true" />
                      طلباتي
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-destructive">
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                href="/login"
                className="hidden min-h-10 items-center rounded-lg px-3 text-sm font-medium text-foreground/70 hover:bg-foreground/5 hover:text-foreground sm:inline-flex"
                aria-label="تسجيل الدخول"
              >
                <User className="h-5 w-5 xl:hidden" aria-hidden="true" />
                <span className="hidden xl:inline">تسجيل الدخول</span>
              </Link>
            )}

            <Link
              href="/wishlist"
              className="relative hidden h-10 w-10 items-center justify-center rounded-lg text-foreground/70 hover:bg-foreground/5 hover:text-foreground sm:inline-flex"
              aria-label={`المفضلة${wishlistCount > 0 ? ` - ${wishlistCount} منتج` : " - فارغة"}`}
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
                  aria-label={`سلة المشتريات${totalItems > 0 ? ` - ${totalItems} منتج` : " - فارغة"}`}
                >
                  <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                  {totalItems > 0 && (
                    <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                      {totalItems}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full max-w-md border-border bg-background sm:w-[420px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                    سلة التسوق
                  </SheetTitle>
                  <SheetDescription className="sr-only">راجع المنتجات والكميات والمجموع، وبعدها كمل معلومات التوصيل.</SheetDescription>
                </SheetHeader>
                <div className="mt-6 flex h-[calc(100vh-180px)] flex-col" aria-live="polite" aria-atomic="false">
                  {cartItems.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground" role="status">
                      <ShoppingCart className="mb-4 h-14 w-14 opacity-20" aria-hidden="true" />
                      <p className="text-lg font-medium text-foreground">السلة فارغة</p>
                      <p className="mt-1 max-w-64 text-sm">شوف المنتجات واختار القطعة حسب حجم حوضك.</p>
                      <Link
                        href="/products"
                        onClick={() => setIsCartOpen(false)}
                        className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-primary/40 px-4 text-sm font-bold text-primary hover:bg-primary/10"
                      >
                        شوف المنتجات
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4">
                        <ShippingProgress />
                      </div>
                      <ul className="flex-1 space-y-3 overflow-auto pe-1" aria-label="المنتجات في السلة">
                        {cartItems.map((item) => (
                          <li
                            key={item.id}
                            className="flex gap-3 rounded-lg border border-border bg-card p-3"
                            aria-label={`${item.name}${item.variantLabel ? `، الخيار ${item.variantLabel}` : ""}، الكمية ${item.quantity}، السعر ${formatIQD(item.price)}`}
                          >
                            <img src={thumbImage(item.image) || "/brand/aquavo-v2-icon.svg"} alt="" aria-hidden="true" className="h-16 w-16 rounded-md bg-card object-contain p-1" loading="lazy" decoding="async" width={64} height={64} />
                            <div className="min-w-0 flex-1">
                              <h4 className="truncate text-sm font-medium">{item.name}</h4>
                              {item.variantLabel && <p className="truncate text-xs text-muted-foreground">الخيار: {item.variantLabel}</p>}
                              <p className="mt-1 font-bold text-foreground">{formatIQD(item.price)}</p>
                              <div className="mt-2 flex items-center justify-between">
                                <div className="flex items-center gap-1" role="group" aria-label={`كمية ${item.name}`}>
                                  <Button variant="outline" size="icon" className="h-11 w-11 md:h-11 md:w-11" onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label={`تقليل كمية ${item.name}`}>
                                    <span aria-hidden="true">−</span>
                                  </Button>
                                  <span className="w-6 text-center text-sm font-semibold" aria-hidden="true">{item.quantity}</span>
                                  <span className="sr-only">الكمية: {item.quantity}</span>
                                  <Button variant="outline" size="icon" className="h-11 w-11 md:h-11 md:w-11" onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label={`زيادة كمية ${item.name}`}>
                                    <span aria-hidden="true">+</span>
                                  </Button>
                                </div>
                                <Button variant="ghost" size="icon" className="h-11 w-11 md:h-11 md:w-11 text-destructive" onClick={() => removeItem(item.id)} aria-label={`إزالة ${item.name} من السلة`}>
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
                          <dt className="font-medium">المجموع</dt>
                          <dd className="text-xl font-bold text-foreground" aria-live="polite">{formatIQD(totalPrice)}</dd>
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
                          كمل معلومات التوصيل
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
