import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { MessageCircle, Mail, Phone, Clock, HelpCircle, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { WHATSAPP_URL } from "@/lib/constants/shipping";

export default function Contact() {
  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      <Navbar />

      <main id="main-content" className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-3">تواصل معنا</h1>
          <p className="text-muted-foreground text-lg">
            فريق AQUAVO جاهز يساعدك — اختار الطريقة الأسهل عليك
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* WhatsApp — primary */}
          <Card className="border-green-500/30 bg-green-500/5 hover:border-green-500/60 transition-colors">
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              <div className="p-4 bg-green-500/15 rounded-full">
                <MessageCircle className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-1">واتساب</h2>
                <p className="text-sm text-muted-foreground mb-4">الأسرع — رد خلال دقائق</p>
              </div>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="w-full">
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                  <MessageCircle className="h-4 w-4 ml-2" />
                  فتح واتساب
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* Email */}
          <Card className="hover:border-primary/40 transition-colors">
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-1">البريد الإلكتروني</h2>
                <p className="text-sm text-muted-foreground mb-1">للاستفسارات التفصيلية</p>
                <p className="text-sm font-medium text-primary">info@aquavoiq.com</p>
              </div>
              <a href="mailto:info@aquavoiq.com" className="w-full">
                <Button variant="outline" className="w-full">
                  <Mail className="h-4 w-4 ml-2" />
                  أرسل إيميل
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* Phone */}
          <Card className="hover:border-primary/40 transition-colors">
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              <div className="p-4 bg-blue-500/10 rounded-full">
                <Phone className="h-8 w-8 text-blue-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-1">اتصال مباشر</h2>
                <p className="text-sm text-muted-foreground mb-1">خلال ساعات العمل</p>
                <p className="text-sm font-medium">+964 774 788 0673</p>
              </div>
              <a href="tel:+9647747880673" className="w-full">
                <Button variant="outline" className="w-full">
                  <Phone className="h-4 w-4 ml-2" />
                  اتصل الحين
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* Working hours */}
          <Card className="hover:border-primary/40 transition-colors">
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              <div className="p-4 bg-amber-500/10 rounded-full">
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-1">ساعات العمل</h2>
                <p className="text-sm text-muted-foreground">السبت — الخميس</p>
                <p className="text-sm font-medium mt-1">10:00 ص — 9:00 م</p>
                <p className="text-xs text-muted-foreground mt-1">واتساب متاح على مدار الساعة</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick links */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/faq">
            <Button variant="ghost" size="sm" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              الأسئلة الشائعة
            </Button>
          </Link>
          <Link href="/order-tracking">
            <Button variant="ghost" size="sm" className="gap-2">
              <Package className="h-4 w-4" />
              تتبع طلبي
            </Button>
          </Link>
          <Link href="/return-policy">
            <Button variant="ghost" size="sm" className="gap-2">
              سياسة الإرجاع
            </Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
