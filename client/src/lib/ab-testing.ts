// Simple A/B Testing System
// Stores variant selection in localStorage and tracks conversions

import { trackEvent } from './analytics';

type Variant = 'A' | 'B';

interface Experiment {
  name: string;
  variant: Variant;
  startTime: number;
}

class ABTestingManager {
  private experiments: Map<string, Experiment> = new Map();
  private conversions: Map<string, boolean> = new Map();

  constructor() {
    this.loadExperiments();
  }

  // Load experiments from localStorage
  private loadExperiments() {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('ab_experiments');
      if (stored) {
        const experiments = JSON.parse(stored);
        this.experiments = new Map(Object.entries(experiments));
      }
    } catch (err) {
      console.error('Failed to load AB experiments:', err);
    }
  }

  // Save experiments to localStorage
  private saveExperiments() {
    if (typeof window === 'undefined') return;

    try {
      const obj = Object.fromEntries(this.experiments);
      localStorage.setItem('ab_experiments', JSON.stringify(obj));
    } catch (err) {
      console.error('Failed to save AB experiments:', err);
    }
  }

  // Get or create variant for an experiment
  getVariant(experimentName: string, options?: { weights?: { A: number; B: number } }): Variant {
    // Check if already assigned
    const existing = this.experiments.get(experimentName);
    if (existing) {
      return existing.variant;
    }

    // Assign new variant
    const weights = options?.weights || { A: 0.5, B: 0.5 };
    const random = Math.random();
    const variant: Variant = random < weights.A / (weights.A + weights.B) ? 'A' : 'B';

    const experiment: Experiment = {
      name: experimentName,
      variant,
      startTime: Date.now(),
    };

    this.experiments.set(experimentName, experiment);
    this.saveExperiments();

    // Track in analytics
    trackEvent('experiment_view', 'ABTest', `${experimentName}_${variant}`);

    return variant;
  }

  // Track a conversion for an experiment
  trackConversion(experimentName: string, conversionName: string = 'default') {
    const experiment = this.experiments.get(experimentName);
    if (!experiment) return;

    const key = `${experimentName}_${conversionName}`;
    if (this.conversions.get(key)) return; // Already tracked

    this.conversions.set(key, true);

    // Track in analytics
    trackEvent(
      'experiment_conversion',
      'ABTest',
      `${experimentName}_${experiment.variant}_${conversionName}`
    );
  }

  // Reset all experiments (useful for testing)
  resetAll() {
    this.experiments.clear();
    this.conversions.clear();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ab_experiments');
    }
  }

  // Reset specific experiment
  resetExperiment(experimentName: string) {
    this.experiments.delete(experimentName);
    this.saveExperiments();
  }

  // Get all active experiments
  getActiveExperiments(): Experiment[] {
    return Array.from(this.experiments.values());
  }
}

// Export singleton
export const abTesting = new ABTestingManager();

// React Hook for A/B Testing
import { useState, useEffect } from 'react';

export function useABTest(
  experimentName: string,
  options?: { weights?: { A: number; B: number } }
): Variant {
  const [variant, setVariant] = useState<Variant>('A');

  useEffect(() => {
    const v = abTesting.getVariant(experimentName, options);
    setVariant(v);
  }, [experimentName]);

  return variant;
}

// Convenience function for tracking conversions
export function trackABConversion(experimentName: string, conversionName?: string) {
  abTesting.trackConversion(experimentName, conversionName);
}

// Example experiments configuration
export const EXPERIMENTS = {
  // Button text experiment
  ADD_TO_CART_BUTTON: {
    name: 'add_to_cart_button_text',
    variants: {
      A: 'أضف للسلة',
      B: 'اشتري الآن',
    },
  },

  // Product card layout
  PRODUCT_CARD_LAYOUT: {
    name: 'product_card_layout',
    variants: {
      A: 'compact',
      B: 'spacious',
    },
  },

  // Price display
  PRICE_DISPLAY: {
    name: 'price_display',
    variants: {
      A: 'simple', // Just the price
      B: 'detailed', // Price + savings + urgency
    },
  },

  // CTA button color
  CTA_COLOR: {
    name: 'cta_button_color',
    variants: {
      A: 'primary', // Blue
      B: 'accent', // Orange
    },
  },

  // Homepage hero section
  HERO_SECTION: {
    name: 'homepage_hero',
    variants: {
      A: 'video_background',
      B: 'animated_illustration',
    },
  },

  // Shrimp mascot position
  SHRIMP_POSITION: {
    name: 'shrimp_mascot_position',
    variants: {
      A: 'bottom_left',
      B: 'floating_center',
    },
  },

  // Checkout flow
  CHECKOUT_FLOW: {
    name: 'checkout_flow_steps',
    variants: {
      A: 'single_page',
      B: 'multi_step',
    },
  },

  // Product recommendations
  RECOMMENDATIONS: {
    name: 'product_recommendations_algorithm',
    variants: {
      A: 'collaborative_filtering',
      B: 'content_based',
    },
  },
} as const;

// Helper to get variant value
export function getExperimentValue<T>(
  experiment: { name: string; variants: { A: T; B: T } },
  options?: { weights?: { A: number; B: number } }
): T {
  const variant = abTesting.getVariant(experiment.name, options);
  return experiment.variants[variant];
}
