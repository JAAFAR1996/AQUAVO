import { useState, useEffect } from 'react';
import { Joyride, STATUS, type EventData, type Options, type Step, type Styles } from 'react-joyride';
import { useLocation } from 'wouter';

export function OnboardingTour() {
    const [run, setRun] = useState(false);
    const [steps, setSteps] = useState<Step[]>([]);
    const [location] = useLocation();
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile screen sizes
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Set steps and run state based on the current location
    useEffect(() => {
        let pageSteps: Step[] = [];
        const path = location;

        // 1. FISH DOCTOR PAGE STEPS (طبيب الأسماك)
        if (path === '/fish-health-diagnosis') {
            pageSteps = [
                {
                    target: 'body',
                    content: (
                        <div className="text-right font-sans" dir="rtl">
                            <h2 className="text-xl font-extrabold mb-2 text-primary">طبيب أسماك ذكي بجيبك 🩺</h2>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                هالفكرة مو خيال، هسه تكدر بضغطة وحدة تشخص حالة سمكتك وتعرف شنو اللي مأذيها بدون حيرة.
                            </p>
                        </div>
                    ),
                    placement: 'center',
                    skipBeacon: true,
                },
                {
                    target: '[data-tour="health-upload"]',
                    content: (
                        <div className="text-right font-sans" dir="rtl">
                            <h3 className="font-bold mb-2 text-primary">ارفع صورة سمكتك 📷</h3>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                كل اللي تحتاجه هو صورة واضحة من الجانب لسمكتك المريضة، ارفعها هنا والـ AI راح يحلل الأعراض والالتهابات بدقة عالية.
                            </p>
                        </div>
                    ),
                },
                {
                    target: '[data-tour="health-results"]',
                    content: (
                        <div className="text-right font-sans" dir="rtl">
                            <h3 className="font-bold mb-2 text-primary">نتيجة التشخيص 📋</h3>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                هنا راح تطلعلك النتيجة بالتفصيل الممل، مع خطة علاج يومية وتوصيات دقيقة للمي والجرعات المناسبة حتى ترجع سمكتك بكامل صحتها.
                            </p>
                        </div>
                    ),
                },
            ];
        }
        // 2. CALCULATORS PAGE STEPS (الحاسبات)
        else if (path === '/calculators') {
            pageSteps = [
                {
                    target: 'body',
                    content: (
                        <div className="text-right font-sans" dir="rtl">
                            <h2 className="text-xl font-extrabold mb-2 text-primary">حسابات الأحواض بدون دوخة راس 🧮</h2>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                صممنا هالقسم حتى نخلصك من الحسابات المعقدة وتجهز حوضك بالملي وبدون أي غلطة.
                            </p>
                        </div>
                    ),
                    placement: 'center',
                    skipBeacon: true,
                },
                {
                    target: '[data-tour="calculators-tabs"]',
                    content: (
                        <div className="text-right font-sans" dir="rtl">
                            <h3 className="font-bold mb-2 text-primary">تنقل بين الحاسبات بكل سهولة 📊</h3>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                حجم الحوض، قوة السخان، الفلتر المناسب، كمية الملح، وحتى جدول الصيانة، كلشي تحتاجه بمكان واحد.
                            </p>
                        </div>
                    ),
                },
                {
                    target: '[data-tour="calculators-content"]',
                    content: (
                        <div className="text-right font-sans" dir="rtl">
                            <h3 className="font-bold mb-2 text-primary">اكتب القياسات ✍️</h3>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                اكتب القياسات والمعلومات هنا وراح تطلعلك الأرقام الصحيحة والتوصيات مباشرة بدون أي تعقيد.
                            </p>
                        </div>
                    ),
                },
            ];
        }
        // 3. FAMILY ALBUM PAGE STEPS (ألبوم العائلة)
        else if (path === '/community-gallery') {
            pageSteps = [
                {
                    target: 'body',
                    content: (
                        <div className="text-right font-sans" dir="rtl">
                            <h2 className="text-xl font-extrabold mb-2 text-primary">ألبوم العائلة ومجتمع الهواة 📸</h2>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                هذا مكانك الخاص ومجتمع هواة الأحواض بالعراق. شاركنا إبداعك وشوف أحواض بقية العائلة واستمتع بجمال تصاميمهم.
                            </p>
                        </div>
                    ),
                    placement: 'center',
                    skipBeacon: true,
                },
                {
                    target: '[data-tour="gallery-upload"]',
                    content: (
                        <div className="text-right font-sans" dir="rtl">
                            <h3 className="font-bold mb-2 text-primary">شارك حوضك ويا العائلة 🌟</h3>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                اضغط هنا حتى ترفع صورة حوضك وتشارك قصتك ويا الأسماك والنباتات وتدخل ويانا بالمسابقة الشهرية وتنافس على الجوائز.
                            </p>
                        </div>
                    ),
                },
                {
                    target: '[data-tour="gallery-grid"]',
                    content: (
                        <div className="text-right font-sans" dir="rtl">
                            <h3 className="font-bold mb-2 text-primary">تصفح وتفاعل 💬</h3>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                تصفح معرض الأحواض، انطي لايك للتصاميم اللي تعجبك وتفاعل ويا بقية المربين بالبلد.
                            </p>
                        </div>
                    ),
                },
            ];
        }
        // 4. YOUR JOURNEY PAGE STEPS (رحلتك)
        else if (path === '/journey') {
            pageSteps = [
                {
                    target: 'body',
                    content: (
                        <div className="text-right font-sans" dir="rtl">
                            <h2 className="text-xl font-extrabold mb-2 text-primary">رحلتك ويا الحوض تبدي من هنا 🚀</h2>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                خطوة بخطوة نحو حوض أحلامك. هذا الدليل التفاعلي راح يمشي وياك من الصفر لحد ما يكمل حوضك بكل تفاصيله.
                            </p>
                        </div>
                    ),
                    placement: 'center',
                    skipBeacon: true,
                },
                {
                    target: '[data-tour="journey-progress"]',
                    content: (
                        <div className="text-right font-sans" dir="rtl">
                            <h3 className="font-bold mb-2 text-primary">تتبع خطواتك 📍</h3>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                شريط التقدم هذا يوضحلك وين واصل برحلتك، وتكدر تحفظ مسودتك وترجع تكمل بأي وقت يعجبك.
                            </p>
                        </div>
                    ),
                },
                {
                    target: '[data-tour="journey-content"]',
                    content: (
                        <div className="text-right font-sans" dir="rtl">
                            <h3 className="font-bold mb-2 text-primary">ركز على تفاصيل حوضك 🛠️</h3>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                كل خطوة هنا تركز على جانب مهم: حجم الحوض، الأجهزة، الديكورات، معايير المياه، وحتى اختيار الأسماك المناسبة.
                            </p>
                        </div>
                    ),
                },
                {
                    target: '[data-tour="journey-nav"]',
                    content: (
                        <div className="text-right font-sans" dir="rtl">
                            <h3 className="font-bold mb-2 text-primary">التنقل بين الخطوات ➡️</h3>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                استخدم الأزرار هنا حتى تتنقل بين الخطوات بعد ما تكمل اختيار كل مرحلة وتنتقل للي بعدها.
                            </p>
                        </div>
                    ),
                },
            ];
        }

        setSteps(pageSteps);

        if (pageSteps.length > 0) {
            setRun(true);
        } else {
            setRun(false);
        }
    }, [location, isMobile]);

    const handleJoyrideCallback = (data: EventData) => {
        const { status } = data;
        const difficultStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        const path = location;
        const pageName = path.split('/')[1];
        const seenKey = `aquavo_tour_seen_${pageName}`;

        if (difficultStatuses.includes(status)) {
            localStorage.setItem(seenKey, 'true');
            localStorage.setItem('aquavo_tours_dismissed', 'true');
            setRun(false);
        }
    };

    const tourOptions: Partial<Options> = {
        zIndex: 10000,
        primaryColor: '#0ea5e9',
        textColor: '#334155',
        backgroundColor: '#ffffff',
        arrowColor: '#ffffff',
        overlayClickAction: 'close',
    };

    const tourStyles: Partial<Styles> = {
        buttonPrimary: {
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
            scrollToFirstStep
            options={tourOptions}
            locale={{
                back: 'السابق',
                close: 'إغلاق',
                last: 'إنهاء',
                next: 'التالي →',
                skip: 'تخطي',
            }}
            styles={tourStyles}
            onEvent={handleJoyrideCallback}
            floatingOptions={{
                hideArrow: false,
            }}
        />
    );
}
