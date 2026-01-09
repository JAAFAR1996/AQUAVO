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

        setSteps(pageSteps);

        // Check if THIS specific page's tour has been seen
        const seenKey = `aquavo_tour_seen_${path === '/' ? 'home' : path.split('/')[1]}`;
        const hasSeen = localStorage.getItem(seenKey);

        if (!hasSeen && pageSteps.length > 0) {
            // Small delay to ensure DOM is ready
            const timer = setTimeout(() => {
                setRun(true);
            }, 1500); // Increased delay for stability
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
            showProgress
            showSkipButton
            scrollToFirstStep
            disableOverlayClose
            locale={{
                back: 'السابق',
                close: 'إغلاق',
                last: 'إنهاء',
                next: 'التالي',
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
