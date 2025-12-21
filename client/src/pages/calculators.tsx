import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Thermometer, Droplets, Waves, Calendar, Fish, Box } from "lucide-react";
import { WhatsAppWidget } from "@/components/whatsapp-widget";
import { BackToTop } from "@/components/back-to-top";
import { Link } from "wouter";

// Import extracted calculators
import { TankSizeCalculator } from "@/components/calculators/tank-size-calculator";
import { HeaterCalculator } from "@/components/calculators/heater-calculator";
import { FilterCalculator } from "@/components/calculators/filter-calculator";
import { SaltCalculator } from "@/components/calculators/salt-calculator";
import { MaintenanceCalculator } from "@/components/calculators/maintenance-calculator";

export default function Calculators() {
  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <Navbar />
      <main id="main-content" className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground">حاسبات أحواض الأسماك</h1>
            <p className="text-xl text-muted-foreground">أدوات دقيقة لمساعدتك في الحفاظ على بيئة مثالية لأسماكك</p>
          </div>

          <Tabs defaultValue="tank" className="w-full">
            <TabsList className="grid w-full grid-cols-6 h-auto p-1 bg-muted/50 rounded-xl">
              <TabsTrigger value="tank" className="data-[state=active]:bg-card data-[state=active]:shadow-sm py-3 text-sm sm:text-lg rounded-lg">
                <Box className="h-5 w-5 ml-2" />
                حجم الحوض
              </TabsTrigger>
              <TabsTrigger value="heater" className="data-[state=active]:bg-card data-[state=active]:shadow-sm py-3 text-sm sm:text-lg rounded-lg">
                <Thermometer className="h-5 w-5 ml-2" />
                حاسبة السخان
              </TabsTrigger>
              <TabsTrigger value="filter" className="data-[state=active]:bg-card data-[state=active]:shadow-sm py-3 text-sm sm:text-lg rounded-lg">
                <Droplets className="h-5 w-5 ml-2" />
                حاسبة الفلترة
              </TabsTrigger>
              <TabsTrigger value="salt" className="data-[state=active]:bg-card data-[state=active]:shadow-sm py-3 text-sm sm:text-lg rounded-lg">
                <Waves className="h-5 w-5 ml-2" />
                حاسبة الملوحة
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="data-[state=active]:bg-card data-[state=active]:shadow-sm py-3 text-sm sm:text-lg rounded-lg">
                <Calendar className="h-5 w-5 ml-2" />
                جدول الصيانة
              </TabsTrigger>
              <TabsTrigger value="breeding" className="data-[state=active]:bg-card data-[state=active]:shadow-sm py-3 text-sm sm:text-lg rounded-lg">
                <Fish className="h-5 w-5 ml-2" />
                حاسبة التكاثر
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tank" className="mt-8">
              <TankSizeCalculator />
            </TabsContent>

            <TabsContent value="heater" className="mt-8">
              <HeaterCalculator />
            </TabsContent>
            <TabsContent value="filter" className="mt-8">
              <FilterCalculator />
            </TabsContent>
            <TabsContent value="salt" className="mt-8">
              <SaltCalculator />
            </TabsContent>
            <TabsContent value="maintenance" className="mt-8">
              <MaintenanceCalculator />
            </TabsContent>
            <TabsContent value="breeding" className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-right">حاسبة تكاثر الأسماك</CardTitle>
                  <CardDescription className="text-right">أداة متقدمة لحساب الجداول الزمنية لتكاثر الأسماك ومراحل نمو الصغار.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 text-right">
                  <div className="p-6 bg-primary/5 rounded-xl text-center space-y-4 border border-primary/10">
                    <Fish className="w-16 h-16 mx-auto text-primary opacity-80" />
                    <h3 className="text-2xl font-bold text-foreground">حاسبة التكاثر الشاملة</h3>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                      احصل على خطة زمنية دقيقة لدورة حياة أسماكك، من التزاوج إلى الفقس ونمو الصغار، مع نصائح التغذية لكل مرحلة وقائمة المستلزمات الضرورية.
                    </p>
                    <Link href="/fish-breeding-calculator">
                      <Button size="lg" className="mt-4 gap-2">
                        <Fish className="w-5 h-5" />
                        الذهاب إلى حاسبة التكاثر
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <WhatsAppWidget />
      <BackToTop />
      <Footer />
    </div>
  );
}
