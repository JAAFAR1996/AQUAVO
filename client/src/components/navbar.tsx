import { Link, useLocation } from "wouter";
import { Search, ShoppingCart, Menu, Fish, Calculator, Home, Package, SearchIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { FontSizeControllerCompact } from "@/components/ui/font-size-controller";
import { EasterEggs } from "@/components/effects/easter-eggs";
import { Separator } from "@/components/ui/separator";
import { CheckoutDialog } from "@/components/cart/checkout-dialog";
import { InvoiceDialog } from "@/components/cart/invoice-dialog";
import { formatIQD, generateOrderNumber } from "@/lib/utils";
import { useCart, CartItem } from "@/contexts/cart-context";
import { SearchDialog } from "@/components/search/search-dialog";

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

  const { items: cartItems, removeItem, totalItems, totalPrice } = useCart();

  const handleCheckoutComplete = (data: { customerInfo: OrderData['customerInfo']; items: CartItem[]; total: number }) => {
    const newOrderData: OrderData = {
      ...data,
      orderNumber: generateOrderNumber(),
      orderDate: new Date()
    };
    setOrderData(newOrderData);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    setIsInvoiceOpen(true);
  };

  const navLinks = [
    { href: "/", label: "الرئيسية", icon: Home },
    { href: "/products", label: "المنتجات", icon: Package },
    { href: "/calculators", label: "الحاسبات", icon: Calculator },
    { href: "/journey", label: "رحلتك", icon: Fish },
    { href: "/fish-finder", label: "مكتشف الأسماك", icon: SearchIcon },
  ];

  return (
    <>
      <nav
        className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 transition-colors duration-300"
        role="navigation"
        aria-label="التنقل الرئيسي"
      >
        <EasterEggs />
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="فتح قائمة التنقل"
                  aria-expanded={isMenuOpen}
                >
                  <Menu className="h-6 w-6" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col gap-4 mt-8">
                  {navLinks.map((link) => (
                    <Link key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)}>
                      <span className={`flex items-center gap-3 text-lg px-4 py-2 rounded-md transition-colors ${
                        location === link.href ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
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
          <Link href="/" aria-label="الصفحة الرئيسية - Fish Web">
            <div className="flex items-center gap-2 cursor-pointer group">
              <div className="bg-primary/10 p-2 rounded-full group-hover:animate-pulse">
                <Fish className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-l from-primary to-blue-600 group-hover:to-purple-500 transition-all">
                Fish Web
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer flex items-center gap-2 ${
                  location === link.href ? "text-primary" : "text-muted-foreground"
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

            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex"
              aria-label="البحث"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </Button>

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
                      <ShoppingCart className="h-16 w-16 mb-4 opacity-20" />
                      <p>السلة فارغة</p>
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

        <SearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />

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
