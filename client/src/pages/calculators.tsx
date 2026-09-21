import { MetaTags } from "@/components/seo/meta-tags";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Thermometer, Droplets, Waves, Calendar, Fish, Box, Beaker } from "lucide-react";

import { BackToTop } from "@/components/back-to-top";
import { Link } from "wouter";

// Import extracted calculators
import { TankSizeCalculator } from "@/components/calculators/tank-size-calculator";
import { HeaterCalculator } from "@/components/calculators/heater-calculator";
import { FilterCalculator } from "@/components/calculators/filter-calculator";
import { SaltCalculator } from "@/components/calculators/salt-calculator";
import { MaintenanceCalculator } from "@/components/calculators/maintenance-calculator";
import { WaterParametersCalculator } from "@/components/calculators/water-parameters-calculator";
import { useTranslation } from "react-i18next";

export default function Calculators() {
  const { t } = useTranslation("tools");
  return (
    <div className="flex-1 flex flex-col bg-background font-sans">      <MetaTags
        title={t("calculators.s1")}
        description={t("calculators.s2")}
        keywords={[t("calculators.s3"), t("calculators.s4"), t("calculators.s5"), t("calculators.s6"), t("calculators.s7"), t("calculators.s8")]}
      />
      <main id="main-content" className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground">{t("calculators.s1")}</h1>
            <p className="text-xl text-muted-foreground">{t("calculators.s9")}</p>
          </div>

          <Tabs defaultValue="tank" className="w-full">
            <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7 h-auto p-1 gap-1 bg-muted/50 rounded-xl" data-tour="calculators-tabs">
              <TabsTrigger value="tank" className="data-[state=active]:bg-card data-[state=active]:shadow-sm py-2 sm:py-3 text-xs sm:text-sm rounded-lg flex flex-col sm:flex-row items-center gap-1">
                <Box className="h-4 w-4 sm:h-5 sm:w-5 sm:ml-2" />
                <span className="hidden sm:inline">{t("calculators.s10")}</span>
                <span className="sm:hidden text-[10px]">{t("calculators.s11")}</span>
              </TabsTrigger>
              <TabsTrigger value="heater" className="data-[state=active]:bg-card data-[state=active]:shadow-sm py-2 sm:py-3 text-xs sm:text-sm rounded-lg flex flex-col sm:flex-row items-center gap-1">
                <Thermometer className="h-4 w-4 sm:h-5 sm:w-5 sm:ml-2" />
                <span className="hidden sm:inline">{t("calculators.s12")}</span>
                <span className="sm:hidden text-[10px]">{t("calculators.s13")}</span>
              </TabsTrigger>
              <TabsTrigger value="filter" className="data-[state=active]:bg-card data-[state=active]:shadow-sm py-2 sm:py-3 text-xs sm:text-sm rounded-lg flex flex-col sm:flex-row items-center gap-1">
                <Droplets className="h-4 w-4 sm:h-5 sm:w-5 sm:ml-2" />
                <span className="hidden sm:inline">{t("calculators.s14")}</span>
                <span className="sm:hidden text-[10px]">{t("calculators.s15")}</span>
              </TabsTrigger>
              <TabsTrigger value="salt" className="data-[state=active]:bg-card data-[state=active]:shadow-sm py-2 sm:py-3 text-xs sm:text-sm rounded-lg flex flex-col sm:flex-row items-center gap-1">
                <Waves className="h-4 w-4 sm:h-5 sm:w-5 sm:ml-2" />
                <span className="hidden sm:inline">{t("calculators.s16")}</span>
                <span className="sm:hidden text-[10px]">{t("calculators.s17")}</span>
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="data-[state=active]:bg-card data-[state=active]:shadow-sm py-2 sm:py-3 text-xs sm:text-sm rounded-lg flex flex-col sm:flex-row items-center gap-1">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 sm:ml-2" />
                <span className="hidden sm:inline">{t("calculators.s18")}</span>
                <span className="sm:hidden text-[10px]">{t("calculators.s19")}</span>
              </TabsTrigger>
              <TabsTrigger value="water" className="data-[state=active]:bg-card data-[state=active]:shadow-sm py-2 sm:py-3 text-xs sm:text-sm rounded-lg flex flex-col sm:flex-row items-center gap-1">
                <Beaker className="h-4 w-4 sm:h-5 sm:w-5 sm:ml-2" />
                <span className="hidden sm:inline">{t("calculators.s20")}</span>
                <span className="sm:hidden text-[10px]">{t("calculators.s21")}</span>
              </TabsTrigger>
              <TabsTrigger value="breeding" className="data-[state=active]:bg-card data-[state=active]:shadow-sm py-2 sm:py-3 text-xs sm:text-sm rounded-lg flex flex-col sm:flex-row items-center gap-1">
                <Fish className="h-4 w-4 sm:h-5 sm:w-5 sm:ml-2" />
                <span className="hidden sm:inline">{t("calculators.s22")}</span>
                <span className="sm:hidden text-[10px]">{t("calculators.s23")}</span>
              </TabsTrigger>
            </TabsList>

            <div data-tour="calculators-content">
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
              <TabsContent value="water" className="mt-8">
                <WaterParametersCalculator />
              </TabsContent>
              <TabsContent value="breeding" className="mt-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-right">{t("calculators.s24")}</CardTitle>
                    <CardDescription className="text-right">{t("calculators.s25")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 text-right">
                    <div className="p-6 bg-primary/5 rounded-xl text-center space-y-4 border border-primary/10">
                      <Fish className="w-16 h-16 mx-auto text-primary opacity-80" />
                      <h3 className="text-2xl font-bold text-foreground">{t("calculators.s26")}</h3>
                      <p className="text-muted-foreground max-w-lg mx-auto">
                        {t("calculators.s27")}
                      </p>
                      <Link href="/fish-breeding-calculator">
                        <Button size="lg" className="mt-4 gap-2">
                          <Fish className="w-5 h-5" />
                          {t("calculators.s28")}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>

      <BackToTop />    </div>
  );
}
