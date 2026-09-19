import { useState, useEffect } from 'react';
import { Joyride, STATUS, type EventData, type Options, type Step, type Styles } from 'react-joyride';
import { useLocation } from 'wouter';
import { useTranslation } from "react-i18next";

export function OnboardingTour() {
  const { t } = useTranslation("pages");
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
                            <h2 className="text-xl font-extrabold mb-2 text-primary">{t("onboarding-tour.s1")}</h2>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                {t("onboarding-tour.s2")}
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
                            <h3 className="font-bold mb-2 text-primary">{t("onboarding-tour.s3")}</h3>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                {t("onboarding-tour.s4")}
                            </p>
                        </div>
                    ),
                },
                {
                    target: '[data-tour="health-results"]',
                    content: (
                        <div className="text-right font-sans" dir="rtl">
                            <h3 className="font-bold mb-2 text-primary">{t("onboarding-tour.s5")}</h3>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                {t("onboarding-tour.s6")}
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
                            <h2 className="text-xl font-extrabold mb-2 text-primary">{t("onboarding-tour.s7")}</h2>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                {t("onboarding-tour.s8")}
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
                            <h3 className="font-bold mb-2 text-primary">{t("onboarding-tour.s9")}</h3>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                {t("onboarding-tour.s10")}
                            </p>
                        </div>
                    ),
                },
                {
                    target: '[data-tour="calculators-content"]',
                    content: (
                        <div className="text-right font-sans" dir="rtl">
                            <h3 className="font-bold mb-2 text-primary">{t("onboarding-tour.s11")}</h3>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                {t("onboarding-tour.s12")}
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
                            <h2 className="text-xl font-extrabold mb-2 text-primary">{t("onboarding-tour.s13")}</h2>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                {t("onboarding-tour.s14")}
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
                            <h3 className="font-bold mb-2 text-primary">{t("onboarding-tour.s15")}</h3>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                {t("onboarding-tour.s16")}
                            </p>
                        </div>
                    ),
                },
                {
                    target: '[data-tour="gallery-grid"]',
                    content: (
                        <div className="text-right font-sans" dir="rtl">
                            <h3 className="font-bold mb-2 text-primary">{t("onboarding-tour.s17")}</h3>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                {t("onboarding-tour.s18")}
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
                            <h2 className="text-xl font-extrabold mb-2 text-primary">{t("onboarding-tour.s19")}</h2>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                {t("onboarding-tour.s20")}
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
                            <h3 className="font-bold mb-2 text-primary">{t("onboarding-tour.s21")}</h3>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                {t("onboarding-tour.s22")}
                            </p>
                        </div>
                    ),
                },
                {
                    target: '[data-tour="journey-content"]',
                    content: (
                        <div className="text-right font-sans" dir="rtl">
                            <h3 className="font-bold mb-2 text-primary">{t("onboarding-tour.s23")}</h3>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                {t("onboarding-tour.s24")}
                            </p>
                        </div>
                    ),
                },
                {
                    target: '[data-tour="journey-nav"]',
                    content: (
                        <div className="text-right font-sans" dir="rtl">
                            <h3 className="font-bold mb-2 text-primary">{t("onboarding-tour.s25")}</h3>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                {t("onboarding-tour.s26")}
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
                back: t("onboarding-tour.s27"),
                close: t("onboarding-tour.s28"),
                last: t("onboarding-tour.s29"),
                next: t("onboarding-tour.s30"),
                skip: t("onboarding-tour.s31"),
            }}
            styles={tourStyles}
            onEvent={handleJoyrideCallback}
            floatingOptions={{
                hideArrow: false,
            }}
        />
    );
}
