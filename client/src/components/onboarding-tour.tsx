import { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step, Styles } from 'react-joyride';
import { useLocation } from 'wouter';

export function OnboardingTour() {
    const [run, setRun] = useState(false);
    const [location] = useLocation();

    // Define steps for the tour
    // We use CSS selectors or class names to target elements
    const steps: Step[] = [
        {
            target: 'body',
            content: (
                <div className="text-right" dir="rtl">
                    <h2 className="text-xl font-bold mb-2">مرحباً بك في AQUAVO! 👋</h2>
                    <p>دعنا نأخذك في جولة سريعة لنعرفك على مميزات الموقع وكيفية الطلب.</p>
                </div>
            ),
            placement: 'center',
            disableBeacon: true,
        },
        {
            target: '[data-tour="navbar-search"]', // We need to add this data attribute to the search bar
            content: (
                <div className="text-right" dir="rtl">
                    <h3 className="font-bold mb-2">البحث الذكي 🔍</h3>
                    <p>يمكنك البحث عن أي منتج، سمكة، أو معلومة بسهولة من هنا.</p>
                </div>
            ),
        },
        {
            target: '[data-tour="navbar-categories"]', // We need to add this to categories menu
            content: (
                <div className="text-right" dir="rtl">
                    <h3 className="font-bold mb-2">الأقسام 📂</h3>
                    <p>تصفح جميع منتجاتنا حسب الفئة: أحواض، فلاتر، إضاءة، وغيرها.</p>
                </div>
            ),
        },
        {
            target: '[data-tour="navbar-cart"]', // We need to add this to cart icon
            content: (
                <div className="text-right" dir="rtl">
                    <h3 className="font-bold mb-2">سلة المشتريات 🛒</h3>
                    <p>هنا تجد جميع المنتجات التي اخترتها ويمكنك إتمام عملية الشراء.</p>
                </div>
            ),
        },
        {
            target: '[data-tour="hero-cta"]', // Main CTA button on home page
            content: (
                <div className="text-right" dir="rtl">
                    <h3 className="font-bold mb-2">ابدأ التسوق 🚀</h3>
                    <p>اضغط هنا لاستكشاف أحدث العروض والمنتجات المميزة.</p>
                </div>
            ),
        },
    ];

    useEffect(() => {
        // Check if user has already seen the tour
        const tourSeen = localStorage.getItem('aquavo_tour_seen');

        // Only run on homepage and if not seen before
        if (!tourSeen && location === '/') {
            // Small delay to ensure page is loaded
            setTimeout(() => {
                setRun(true);
            }, 1000);
        }
    }, [location]);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const difficultStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (difficultStatuses.includes(status)) {
            // Save that user has seen the tour
            localStorage.setItem('aquavo_tour_seen', 'true');
            setRun(false);
        }
    };

    const tourStyles: Styles = {
        options: {
            zIndex: 10000,
            primaryColor: '#0ea5e9', // Sky blue-500 matching theme
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
                skip: 'تخطي الجولة',
            }}
            styles={tourStyles}
            callback={handleJoyrideCallback}
        />
    );
}
