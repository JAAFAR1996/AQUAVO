import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

import { BackToTop } from "@/components/back-to-top";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Truck,
    MapPin,
    Clock,
    Phone,
    CheckCircle,
    Package,
    Shield,
    MessageCircle,
    Info,
    AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";

interface ShippingZone {
    region: string;
    cities: string[];
    price: string;
    deliveryTime: string;
    available: boolean;
}

const shippingZones: ShippingZone[] = [
    {
        region: "بغداد",
        cities: ["جميع المناطق"],
        price: "5,000 د.ع",
        deliveryTime: "1-2 يوم",
        available: true,
    },
    {
        region: "المحافظات الوسطى",
        cities: ["كربلاء", "النجف", "بابل", "الديوانية", "واسط"],
        price: "10,000 د.ع",
        deliveryTime: "2-3 أيام",
        available: true,
    },
    {
        region: "المحافظات الجنوبية",
        cities: ["البصرة", "ذي قار", "ميسان", "المثنى"],
        price: "12,000 د.ع",
        deliveryTime: "3-4 أيام",
        available: true,
    },
    {
        region: "المحافظات الشمالية",
        cities: ["نينوى", "صلاح الدين", "كركوك", "ديالى"],
        price: "12,000 د.ع",
        deliveryTime: "3-4 أيام",
        available: true,
    },
    {
        region: "إقليم كردستان",
        cities: ["أربيل", "السليمانية", "دهوك"],
        price: "15,000 د.ع",
        deliveryTime: "4-5 أيام",
        available: true,
    },
    {
        region: "الأنبار",
        cities: ["الرمادي", "الفلوجة", "هيت"],
        price: "15,000 د.ع",
        deliveryTime: "4-5 أيام",
        available: true,
    },
];

const features = [
    {
        icon: Package,
        title: "تغليف آمن",
        description: "نغلف كل منتج بعناية فائقة لضمان وصوله سليماً",
    },
    {
        icon: Truck,
        title: "تتبع الشحنة",
        description: "تتبع طلبك لحظة بلحظة عبر رقم التتبع",
    },
    {
        icon: Shield,
        title: "ضمان الوصول",
        description: "إذا وصل المنتج تالفاً، نستبدله فوراً مجاناً",
    },
    {
        icon: Clock,
        title: "توصيل سريع",
        description: "نسعى لتوصيل طلبك بأسرع وقت ممكن",
    },
];

export default function Shipping() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Navbar />

            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-900 dark:via-purple-900 dark:to-pink-900 py-20 overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/asfalt-light.png')] opacity-10" />
                <div className="container mx-auto px-4 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-3xl mx-auto text-center text-white"
                    >
                        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/30 px-6 py-2 rounded-full mb-6">
                            <Truck className="h-5 w-5" />
                            <span className="font-bold">التوصيل والشحن</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-extrabold mb-4">
                            معلومات التوصيل
                        </h1>
                        <p className="text-xl text-purple-100">
                            نوصل لجميع محافظات العراق بأسرع وقت وأفضل سعر
                        </p>
                    </motion.div>
                </div>
            </section>

            <main id="main-content" className="flex-1 py-12">
                <div className="container mx-auto px-4">
                    {/* Features */}
                    <div className="grid md:grid-cols-4 gap-6 mb-12">
                        {features.map((feature, index) => (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="text-center h-full hover:shadow-lg transition-shadow">
                                    <CardContent className="p-6">
                                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                            <feature.icon className="w-7 h-7 text-primary" />
                                        </div>
                                        <h3 className="font-bold mb-2">{feature.title}</h3>
                                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    {/* Shipping Zones Table */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className="mb-12">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-primary" />
                                    مناطق التوصيل والأسعار
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table role="table" className="w-full">
                                        <caption className="sr-only">مناطق التوصيل والأسعار في العراق</caption>
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th scope="col" className="text-right p-4 font-bold">المنطقة</th>
                                                <th scope="col" className="text-right p-4 font-bold">المدن المشمولة</th>
                                                <th scope="col" className="text-right p-4 font-bold">سعر التوصيل</th>
                                                <th scope="col" className="text-right p-4 font-bold">مدة التوصيل</th>
                                                <th scope="col" className="text-right p-4 font-bold">الحالة</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {shippingZones.map((zone, index) => (
                                                <tr key={zone.region} className="border-b hover:bg-muted/30 transition-colors">
                                                    <td className="p-4 font-semibold">{zone.region}</td>
                                                    <td className="p-4 text-muted-foreground text-sm">
                                                        {zone.cities.join("، ")}
                                                    </td>
                                                    <td className="p-4">
                                                        <Badge variant="secondary" className="font-bold">
                                                            {zone.price}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="flex items-center gap-1 text-sm">
                                                            <Clock className="w-4 h-4 text-muted-foreground" />
                                                            {zone.deliveryTime}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        {zone.available ? (
                                                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                                <CheckCircle className="w-3 h-3 ml-1" />
                                                                متاح
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="destructive">غير متاح</Badge>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Important Notes */}
                    <div className="grid md:grid-cols-2 gap-6 mb-12">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <Card className="h-full">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Info className="w-5 h-5 text-blue-500" />
                                        معلومات مهمة
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-3 text-sm">
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                            <span>الدفع عند الاستلام متاح لجميع المناطق</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                            <span>شحن مجاني للطلبات فوق 100,000 د.ع داخل بغداد</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                            <span>نتواصل معك قبل الشحن لتأكيد العنوان</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                            <span>نتواصل قبل الوصول بـ30 دقيقة</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                            <span>يمكنك تتبع طلبك من صفحة تتبع الطلب</span>
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <Card className="h-full border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg text-amber-800 dark:text-amber-300">
                                        <AlertCircle className="w-5 h-5" />
                                        ملاحظات خاصة
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-3 text-sm text-amber-900 dark:text-amber-200">
                                        <li className="flex items-start gap-2">
                                            <span className="font-bold">•</span>
                                            <span>الأسماك الحية: تتطلب تنسيقاً خاصاً للشحن. تواصل معنا أولاً.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="font-bold">•</span>
                                            <span>الأحواض الكبيرة (+100 لتر): قد تحتاج ترتيباً خاصاً للنقل.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="font-bold">•</span>
                                            <span>المناطق النائية: قد تستغرق وقتاً إضافياً 1-2 يوم.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="font-bold">•</span>
                                            <span>أيام الجمعة والعطل الرسمية: لا يتم الشحن.</span>
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Contact CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-0">
                            <CardContent className="p-8 text-center">
                                <h2 className="text-2xl font-bold mb-3">عندك استفسار عن التوصيل؟</h2>
                                <p className="text-muted-foreground mb-6">
                                    فريقنا جاهز للإجابة على أي سؤال
                                </p>
                                <div className="flex flex-wrap gap-4 justify-center">
                                    <Button size="lg" className="gap-2">
                                        <MessageCircle className="w-5 h-5" />
                                        تواصل عبر واتساب
                                    </Button>
                                    <Button size="lg" variant="outline" className="gap-2">
                                        <Phone className="w-5 h-5" />
                                        اتصل بنا
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </main>


            <BackToTop />
            <Footer />
        </div>
    );
}
