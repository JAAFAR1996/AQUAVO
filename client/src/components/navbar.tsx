import { Link, useLocation } from "wouter";
import { Search, ShoppingCart, Menu, Fish, Calculator, Home, Package, SearchIcon, Trash2, Tag, BookOpen, Camera, Heart, Box, Stethoscope, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { FontSizeControllerCompact } from "@/components/ui/font-size-controller";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CheckoutDialog } from "@/components/cart/checkout-dialog";
import { InvoiceDialog } from "@/components/cart/invoice-dialog";
import { formatIQD, generateOrderNumber } from "@/lib/utils";
import { useCart, CartItem } from "@/contexts/cart-context";
import { useWishlist } from "@/contexts/wishlist-context";
import { GlobalSearch } from "@/components/search/global-search";
import { useAuth } from "@/contexts/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, Package as PackageIcon } from "lucide-react";
import { ShrimpMascot } from "@/components/gamification/shrimp-mascot";

interface OrderData {
  customerInfo: {
    name: string;
    phone: string;
    address: string;
    notes: string;
  };
  items: CartItem[];
  total: number;
  orderNumber: string;
  orderDate: Date;
}

export default function Navbar() {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [orderData, setOrderData] = useState<OrderData | null>(null);

  const { items: cartItems, removeItem, clearCart, totalItems, totalPrice } = useCart();
  const { totalItems: wishlistCount } = useWishlist();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCheckoutComplete = (data: { customerInfo: OrderData['customerInfo']; items: CartItem[]; total: number; orderId?: string; orderNumber?: string }) => {
    const newOrderData: OrderData = {
      ...data,
      orderNumber: data.orderNumber || generateOrderNumber(),
      orderDate: new Date()
    };
    setOrderData(newOrderData);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    clearCart();
    setIsInvoiceOpen(true);
  };

  const navLinks = [
    { href: "/", label: "الرئيسية", icon: Home },
    { href: "/products", label: "المنتجات", icon: Package },
    { href: "/deals", label: "العروض", icon: Tag },
    { href: "/wishlist", label: "المفضلة", icon: Heart },
    { href: "/fish-encyclopedia", label: "موسوعة الأسماك", icon: BookOpen },
    { href: "/calculators", label: "الحاسبات", icon: Calculator },
    { href: "/fish-health-diagnosis", label: "طبيب الأسماك", icon: Stethoscope },
    { href: "/community-gallery", label: "ألبوم العائلة", icon: Camera },
    { href: "/journey", label: "رحلتك", icon: Fish },
  ];

  return (
    <>
      <nav
        className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 transition-colors duration-300"
        role="navigation"
        aria-label="التنقل الرئيسي"
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="md:hidden">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="فتح القائمة الرئيسية"
                  aria-expanded={isMenuOpen}
                  aria-controls="mobile-menu"
                >
                  <Menu className="h-6 w-6" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col gap-4 mt-8">
                  {navLinks.map((link) => (
                    <Link key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)}>
                      <span className={`flex items-center gap-3 text-lg px-4 py-2 rounded-md transition-colors ${location === link.href ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                        }`}>
                        <link.icon className="h-5 w-5" />
                        {link.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Logo */}
          <Link href="/" aria-label="الصفحة الرئيسية - AQUAVO">
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <img
                  src="/logo_aquavo_icon.webp"
                  alt="AQUAVO Logo"
                  className="h-10 w-10 object-contain group-hover:scale-110 transition-transform duration-300 drop-shadow-md"
                />
              </div>
              <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-teal-600 tracking-tighter group-hover:to-cyan-300 transition-all font-sans">
                AQUAVO
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-3 lg:gap-4">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer flex items-center gap-1.5 ${location === link.href ? "text-primary" : "text-muted-foreground"
                  }`}>
                  {link.icon && <link.icon className="h-4 w-4 opacity-50" />}
                  {link.label}
                </span>
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeSwitcher />
            <FontSizeControllerCompact />

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" alt={user.fullName || user.email} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {(user.fullName || user.email).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.fullName}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer w-full flex items-center">
                      <User className="mr-2 h-4 w-4 ml-2" />
                      <span>الملف الشخصي</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile?tab=orders" className="cursor-pointer w-full flex items-center">
                      <PackageIcon className="mr-2 h-4 w-4 ml-2" />
                      <span>طلباتي</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4 ml-2" />
                    <span>تسجيل الخروج</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button variant="default" size="sm" className="hidden md:flex">
                  تسجيل الدخول
                </Button>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="relative group"
              aria-label="البحث (Ctrl+K)"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="h-5 w-5" aria-hidden="true" />
              <Badge
                variant="outline"
                className="hidden sm:block absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1 py-0 pointer-events-none whitespace-nowrap"
              >
                Ctrl+K
              </Badge>
            </Button>

            <Link href="/wishlist">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label={`المفضلة${wishlistCount > 0 ? ` - ${wishlistCount} منتج` : " - فارغة"}`}
              >
                <Heart className="h-5 w-5" aria-hidden="true" />
                {wishlistCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
                    aria-label={`${wishlistCount} منتج في المفضلة`}
                  >
                    {wishlistCount}
                  </span>
                )}
              </Button>
            </Link>

            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="relative"
                  aria-label={`سلة المشتريات${totalItems > 0 ? ` - ${totalItems} منتج` : " - فارغة"}`}
                >
                  <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                  {totalItems > 0 && (
                    <span
                      className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
                      aria-label={`${totalItems} منتج في السلة`}
                    >
                      {totalItems}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[350px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    سلة التسوق
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex flex-col h-[calc(100vh-180px)]">
                  {cartItems.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                      <ShrimpMascot mood="sad" size="xl" className="mb-4 grayscale hover:grayscale-0 transition-all" />
                      <p className="font-medium text-lg mt-4">السلة فارغة...</p>
                      <p className="text-sm font-bold text-primary mt-2">الجمبري زعلان 😢</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 overflow-auto space-y-4">
                        {cartItems.map((item) => (
                          <div key={item.id} className="flex gap-3 p-3 rounded-lg border bg-card">
                            <img
                              src={item.image}
                              alt={`صورة منتج ${item.name}`}
                              className="w-16 h-16 object-cover rounded-md"
                              loading="lazy"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{item.name}</h4>
                              <p className="text-primary font-bold mt-1">
                                {formatIQD(item.price)}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-muted-foreground">الكمية: {item.quantity}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => removeItem(item.id)}
                                  aria-label={`إزالة ${item.name} من السلة`}
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Separator className="my-4" />
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">المجموع:</span>
                          <span className="text-xl font-bold text-primary">{formatIQD(totalPrice)}</span>
                        </div>
                        <div className="flex items-center gap-4 bg-primary/5 p-3 rounded-lg border border-primary/10">
                          <ShrimpMascot mood="excited" size="sm" animate />
                          <p className="text-xs font-bold text-primary">خيار ممتاز! الأسماك بانتظارك 🐠</p>
                        </div>
                        <Button className="w-full" size="lg" onClick={() => setIsCheckoutOpen(true)}>
                          إتمام الشراء
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <GlobalSearch open={isSearchOpen} onOpenChange={setIsSearchOpen} />

        <CheckoutDialog
          open={isCheckoutOpen}
          onOpenChange={setIsCheckoutOpen}
          cartItems={cartItems}
          cartTotal={totalPrice}
          onCheckoutComplete={handleCheckoutComplete}
        />

        <InvoiceDialog
          open={isInvoiceOpen}
          onOpenChange={setIsInvoiceOpen}
          orderData={orderData}
        />
      </nav>
    </>
  );
}
