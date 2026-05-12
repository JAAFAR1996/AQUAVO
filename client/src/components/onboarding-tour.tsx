import { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step, Styles } from 'react-joyride';
import { useLocation } from 'wouter';

export function OnboardingTour() {
    const [run, setRun] = useState(false);
    const [steps, setSteps] = useState<Step[]>([]);
    const [location] = useLocation();
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        let pageSteps: Step[] = [];
        const path = location;

        // 1. HOME PAGE STEPS
        if (path === '/') {
            pageSteps = [
                {
                    target: 'body',
                    content: (
                        <div className="text-right" dir="rtl">
                            <h2 className="text-xl font-bold mb-2">مرحباً بك في AQUAVO! 👋</h2>
                            <p>جولة سريعة لنعرفك على أهم مميزات صفحتنا الرئيسية.</p>
                        </div>
                    ),
                    placement: 'center',
                    disableBeacon: true,
                },
                // Mobile-specific step for Menu
                ...(isMobile ? [{
                    target: '[data-tour="mobile-menu-trigger"]',
                    content: (
                        <div className="text-right" dir="rtl">
                            <h3 className="font-bold mb-2">القائمة الرئيسية ☰</h3>
                            <p>اضغط هنا للوصول إلى جميع الأقسام والصفحات.</p>
                        </div>
                    ),
                }] : []),
                // Desktop-specific step for Categories
                ...(!isMobile ? [{
                    target: '[data-tour="navbar-categories"]',
                    content: (
                        <div className="text-right" dir="rtl">
                            <h3 className="font-bold mb-2">الأقسام 📂</h3>
                            <p>تصفح جميع منتجاتنا حسب الفئة بسهولة من هنا.</p>
                        </div>
                    ),
                }] : []),
                {
                    target: '[data-tour="navbar-search"]',
                    content: (
                        <div className="text-right" dir="rtl">
                            <h3 className="font-bold mb-2">البحث الذكي 🔍</h3>
                            <p>ابحث عن أي شيء تريده بالضغط هنا.</p>
                        </div>
                    ),
                },
                {
                    target: '[data-tour="navbar-cart"]',
                    content: (
                        <div className="text-right" dir="rtl">
                            <h3 className="font-bold mb-2">السلة 🛒</h3>
                            <p>منتجاتك المختارة ستجدها هنا جاهزة للشراء.</p>
                        </div>
                    ),
                },
                {
                    target: '[data-tour="hero-cta"]',
                    content: (
                        <div className="text-right" dir="rtl">
                            <h3 className="font-bold mb-2">ابدأ من هنا 🚀</h3>
                            <p>اضغط لتصفح أحدث العروض والمنتجات فوراً.</p>
                        </div>
                    ),
                },
            ];
        }
        // 2. PRODUCTS PAGE STEPS
        else if (path.startsWith('/products')) {
            pageSteps = [
                {
                    target: 'body',
                    content: (
                        <div className="text-right" dir="rtl">
                            <h2 className="text-xl font-bold mb-2">صفحة المنتجات 🛍️</h2>
                            <p>هنا تجد كل ما يحتاجه حوضك. دعنا نلقي نظرة!</p>
                        </div>
                    ),
                    placement: 'center',
                    disableBeacon: true,
                },
                {
                    target: '[data-tour="products-filter"]',
                    content: (
                        <div className="text-right" dir="rtl">
                            <h3 className="font-bold mb-2">الفلترة والترتيب ⚡</h3>
                            <p>استخدم هذه الخيارات للعثور على المنتج المناسب بسرعة.</p>
                        </div>
                    ),
                },
                {
                    target: '[data-tour="product-card-first"]', // We'll target the first product card
                    content: (
                        <div className="text-right" dir="rtl">
                            <h3 className="font-bold mb-2">تفاصيل المنتج 🏷️</h3>
                            <p>اضغط على أي منتج لعرض التفاصيل الكاملة أو إضافته للسلة.</p>
                        </div>
                    ),
                },
            ];
        }
        // 3. CALCULATORS PAGE STEPS
        else if (path === '/calculators') {
            pageSteps = [
                {
                    target: 'body',
                    content: (
                        <div className="text-right" dir="rtl">
                            <h2 className="text-xl font-bold mb-2">حاسبات الأحواض 🧮</h2>
                            <p>أدوات ذكية لحساب كل ما تحتاجه لحوضك!</p>
                        </div>
                    ),
                    placement: 'center',
                    disableBeacon: true,
                },
                {
                    target: '[data-tour="calculators-tabs"]',
                    content: (
                        <div className="text-right" dir="rtl">
                            <h3 className="font-bold mb-2">اختر نوع الحساب 📊</h3>
                            <p>حجم الحوض، الفلتر، السخان، والمزيد من الأدوات المفيدة.</p>
                        </div>
                    ),
                },
                {
                    target: '[data-tour="calculators-content"]',
                    content: (
                        <div className="text-right" dir="rtl">
                            <h3 className="font-bold mb-2">أدخل البيانات ✍️</h3>
                            <p>أدخل قياسات حوضك وستحصل على النتيجة فوراً!</p>
                        </div>
                    ),
                },
            ];
        }
        // 4. FISH ENCYCLOPEDIA PAGE STEPS
        else if (path === '/fish-encyclopedia') {
            pageSteps = [
                {
                    target: 'body',
                    content: (
                        <div className="text-right" dir="rtl">
                            <h2 className="text-xl font-bold mb-2">موسوعة الأسماك 🐠</h2>
                            <p>تعرف على أنواع الأسماك ومتطلبات كل نوع.</p>
                        </div>
                    ),
                    placement: 'center',
                    disableBeacon: true,
                },
                {
                    target: '[data-tour="encyclopedia-search"]',
                    content: (
                        <div className="text-right" dir="rtl">
                            <h3 className="font-bold mb-2">ابحث عن سمكة 🔍</h3>
                            <p>اكتب اسم السمكة التي تريد معرفة معلومات عنها.</p>
                        </div>
                    ),
                },
                {
                    target: '[data-tour="encyclopedia-filters"]',
                    content: (
                        <div className="text-right" dir="rtl">
                            <h3 className="font-bold mb-2">فلترة النتائج ⚡</h3>
                            <p>صنّف الأسماك حسب الحجم، درجة الحرارة، أو مستوى العناية.</p>
                        </div>
                    ),
                },
            ];
        }
        // 5. FISH HEALTH PAGE STEPS
        else if (path === '/fish-health-diagnosis') {
            pageSteps = [
                {
                    target: 'body',
                    content: (
                        <div className="text-right" dir="rtl">
                            <h2 className="text-xl font-bold mb-2">تشخيص صحة السمكة 🩺</h2>
                            <p>ارفع صورة سمكتك لتشخيص حالتها الصحية بالذكاء الاصطناعي!</p>
                        </div>
                    ),
                    placement: 'center',
                    disableBeacon: true,
                },
                {
                    target: '[data-tour="health-upload"]',
                    content: (
                        <div className="text-right" dir="rtl">
                            <h3 className="font-bold mb-2">ارفع صورة سمكتك 📷</h3>
                            <p>التقط صورة واضحة للسمكة ثم ارفعها هنا.</p>
                        </div>
                    ),
                },
                {
                    target: '[data-tour="health-results"]',
                    content: (
                        <div className="text-right" dir="rtl">
                            <h3 className="font-bold mb-2">نتيجة التشخيص 📋</h3>
                            <p>ستظهر هنا حالة السمكة والتوصيات العلاجية.</p>
                        </div>
                    ),
                },
            ];
        }

        setSteps(pageSteps);

        // Global dismiss: once any tour is finished/skipped, never show again
        const globalDismissed = localStorage.getItem('aquavo_tours_dismissed');
        if (globalDismissed) {
            setRun(false);
            return;
        }

        // Only auto-show the tour on the home page (first visit)
        // Other pages: user can trigger manually if needed
        const seenKey = `aquavo_tour_seen_${path === '/' ? 'home' : path.split('/')[1]}`;
        const hasSeen = localStorage.getItem(seenKey);
        const sessionDismissed = sessionStorage.getItem('aquavo_tour_session_done');

        // Never auto-show if already seen this page or dismissed this session
        if (!hasSeen && !sessionDismissed && pageSteps.length > 0 && path === '/') {
            const timer = setTimeout(() => {
                setRun(true);
            }, 5000);
            return () => clearTimeout(timer);
        } else {
            setRun(false);
        }

    }, [location, isMobile]);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const difficultStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        // Identify current page key to save
        const path = location;
        const seenKey = `aquavo_tour_seen_${path === '/' ? 'home' : path.split('/')[1]}`;

        if (difficultStatuses.includes(status)) {
            localStorage.setItem(seenKey, 'true');
            localStorage.setItem('aquavo_tours_dismissed', 'true');
            sessionStorage.setItem('aquavo_tour_session_done', 'true');
            setRun(false);
        }
    };

    const tourStyles: Partial<Styles> = {
        options: {
            zIndex: 10000,
            primaryColor: '#0ea5e9',
            textColor: '#334155',
            backgroundColor: '#ffffff',
            arrowColor: '#ffffff',
        },
        buttonNext: {
            backgroundColor: '#0ea5e9',
            color: '#ffffff',
            fontFamily: 'inherit',
            fontWeight: 'bold',
            borderRadius: '0.5rem',
            padding: '8px 16px',
        },
        buttonBack: {
            color: '#64748b',
            fontFamily: 'inherit',
            marginRight: '10px',
        },
        buttonSkip: {
            color: '#94a3b8',
            fontFamily: 'inherit',
        },
        tooltip: {
            borderRadius: '1rem',
            padding: '1.5rem',
            fontFamily: 'inherit',
        },
        tooltipContainer: {
            textAlign: 'right',
        },
        tooltipTitle: {
            margin: '0 0 10px 0',
        }
    };

    if (steps.length === 0) return null;

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous
            showSkipButton
            scrollToFirstStep
            disableOverlayClose={false}
            locale={{
                back: 'السابق',
                close: 'إغلاق',
                last: 'إنهاء',
                next: 'التالي →',
                skip: 'تخطي',
            }}
            styles={tourStyles}
            callback={handleJoyrideCallback}
            floaterProps={{
                hideArrow: false,
                disableAnimation: true, // Sometimes helps with mobile positioning
            }}
        />
    );
}
