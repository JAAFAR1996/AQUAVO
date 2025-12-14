import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals';

/**
 * Web Vitals monitoring utility
 * Reports Core Web Vitals metrics to console (can be extended to send to analytics)
 */

interface VitalsConfig {
    reportToConsole?: boolean;
    reportToAnalytics?: (metric: Metric) => void;
}

const defaultConfig: VitalsConfig = {
    reportToConsole: true,
};

/**
 * Report a Web Vital metric
 */
function reportMetric(metric: Metric, config: VitalsConfig) {
    const { name, value, rating } = metric;

    if (config.reportToConsole && import.meta.env.DEV) {
        const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌';
        console.log(`${emoji} ${name}:`, {
            value: `${Math.round(value)}ms`,
            rating,
            metric,
        });
    }

    // Send to analytics service (e.g., Google Analytics, Vercel Analytics)
    if (config.reportToAnalytics) {
        config.reportToAnalytics(metric);
    }
}

/**
 * Initialize Web Vitals monitoring
 * Call this in your main.tsx or App.tsx
 */
export function initWebVitals(config: VitalsConfig = {}) {
    const mergedConfig = { ...defaultConfig, ...config };

    // Largest Contentful Paint (LCP) - measures loading performance
    // Good: < 2.5s
    onLCP((metric) => reportMetric(metric, mergedConfig));

    // First Contentful Paint (FCP) - measures when first content appears
    // Good: < 1.8s
    onFCP((metric) => reportMetric(metric, mergedConfig));

    // Cumulative Layout Shift (CLS) - measures visual stability
    // Good: < 0.1
    onCLS((metric) => reportMetric(metric, mergedConfig));

    // Interaction to Next Paint (INP) - measures interactivity
    // Good: < 200ms
    onINP((metric) => reportMetric(metric, mergedConfig));

    // Time to First Byte (TTFB) - measures server response time
    // Good: < 800ms
    onTTFB((metric) => reportMetric(metric, mergedConfig));
}

/**
 * Example: Send to Google Analytics
 */
export function sendToGoogleAnalytics(metric: Metric) {
    if (typeof window !== 'undefined' && 'gtag' in window) {
        const { name, value, id } = metric;
        (window as any).gtag('event', name, {
            value: Math.round(name === 'CLS' ? value * 1000 : value),
            event_category: 'Web Vitals',
            event_label: id,
            non_interaction: true,
        });
    }
}

/**
 * Example: Send to Vercel Analytics
 */
export function sendToVercelAnalytics(metric: Metric) {
    if (typeof window !== 'undefined' && 'va' in window) {
        const { name, value, id } = metric;
        (window as any).va('event', {
            name,
            data: {
                value: Math.round(name === 'CLS' ? value * 1000 : value),
                id,
            },
        });
    }
}
