import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

/**
 * Available navbar styles for 2025 design
 */
export type NavbarStyle =
    | 'glassmorphism'    // 1. زجاجي - Frosted glass effect
    | 'micro-interactions' // 2. تفاعلي - Hover animations
    | 'ultra-minimal'    // 3. بسيط - Clean minimal
    | 'ai-personalized'  // 4. ذكي - Default, adapts to user
    | 'device-adaptive'  // 5. متكيف - Changes based on device
    | 'immersive';       // 6. غامر - Full screen menu

export interface NavbarPreferences {
    style: NavbarStyle;
    lastVisitedCategories: string[];
    visitCount: number;
}

const STORAGE_KEY = 'aquavo-navbar-preferences';
const DEFAULT_STYLE: NavbarStyle = 'ai-personalized';

const DEFAULT_PREFERENCES: NavbarPreferences = {
    style: DEFAULT_STYLE,
    lastVisitedCategories: [],
    visitCount: 0,
};

interface NavbarPreferencesContextType {
    preferences: NavbarPreferences;
    style: NavbarStyle;
    setStyle: (style: NavbarStyle) => void;
    addVisitedCategory: (category: string) => void;
    resetPreferences: () => void;
    isFirstVisit: boolean;
}

const NavbarPreferencesContext = createContext<NavbarPreferencesContextType | null>(null);

function loadPreferences(): NavbarPreferences {
    if (typeof window === 'undefined') {
        return DEFAULT_PREFERENCES;
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored) as Partial<NavbarPreferences>;
            return {
                ...DEFAULT_PREFERENCES,
                ...parsed,
            };
        }
    } catch (error) {
        console.warn('Failed to load navbar preferences:', error);
    }

    return DEFAULT_PREFERENCES;
}

export function NavbarPreferencesProvider({ children }: { children: ReactNode }) {
    const [preferences, setPreferences] = useState<NavbarPreferences>(() => {
        return loadPreferences();
    });

    // Save to localStorage whenever preferences change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
        } catch (error) {
            console.warn('Failed to save navbar preferences:', error);
        }
    }, [preferences]);

    // Track visit count on mount
    useEffect(() => {
        setPreferences(prev => ({
            ...prev,
            visitCount: prev.visitCount + 1,
        }));
    }, []);

    const setStyle = useCallback((style: NavbarStyle) => {
        setPreferences(prev => ({ ...prev, style }));
    }, []);

    const addVisitedCategory = useCallback((category: string) => {
        setPreferences(prev => {
            const categories = [category, ...prev.lastVisitedCategories.filter(c => c !== category)];
            return {
                ...prev,
                lastVisitedCategories: categories.slice(0, 5),
            };
        });
    }, []);

    const resetPreferences = useCallback(() => {
        setPreferences(DEFAULT_PREFERENCES);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.warn('Failed to clear navbar preferences:', error);
        }
    }, []);

    return (
        <NavbarPreferencesContext.Provider
            value={{
                preferences,
                style: preferences.style,
                setStyle,
                addVisitedCategory,
                resetPreferences,
                isFirstVisit: preferences.visitCount <= 1,
            }}
        >
            {children}
        </NavbarPreferencesContext.Provider>
    );
}

/**
 * Hook to access navbar preferences from context
 */
export function useNavbarPreferences(): NavbarPreferencesContextType {
    const context = useContext(NavbarPreferencesContext);
    if (!context) {
        throw new Error('useNavbarPreferences must be used within a NavbarPreferencesProvider');
    }
    return context;
}

export const NAVBAR_STYLES: { value: NavbarStyle; label: string; labelAr: string; icon: string }[] = [
    { value: 'glassmorphism', label: 'Glassmorphism', labelAr: 'زجاجي', icon: '🪟' },
    { value: 'micro-interactions', label: 'Micro-interactions', labelAr: 'تفاعلي', icon: '✨' },
    { value: 'ultra-minimal', label: 'Ultra-minimal', labelAr: 'بسيط', icon: '🔲' },
    { value: 'ai-personalized', label: 'AI-Personalized', labelAr: 'ذكي', icon: '🤖' },
    { value: 'device-adaptive', label: 'Device-Adaptive', labelAr: 'متكيف', icon: '📱' },
    { value: 'immersive', label: 'Immersive', labelAr: 'غامر', icon: '🖥️' },
];

export default useNavbarPreferences;
