import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import JourneyPage from '../journey';
import * as useJourneyHook from '@/hooks/use-journey';
import { normalizeWizardData } from '@/components/journey/utils';
import { STEPS } from '@/components/journey/constants';
import { i18next } from '@/i18n';
import React from 'react';

// Mock wouter
vi.mock('wouter', () => ({
    useLocation: () => ['/journey', vi.fn()],
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock the hook
vi.mock('@/hooks/use-journey', () => ({
    useJourney: vi.fn(),
}));

// Mock CartContext for Summary step
vi.mock('@/contexts/cart-context', () => ({
    useCart: () => ({
        items: [],
        addItem: vi.fn(),
        removeItem: vi.fn(),
        updateQuantity: vi.fn(),
        clearCart: vi.fn(),
        totalItems: 0,
        totalPrice: 0,
    }),
}));

// Mock WishlistContext
vi.mock('@/contexts/wishlist-context', () => ({
    useWishlist: () => ({
        items: [],
        itemCount: 0,
        addItem: vi.fn(),
        removeItem: vi.fn(),
        isInWishlist: vi.fn(() => false),
        clearWishlist: vi.fn(),
        totalItems: 0,
    }),
}));

// Mock AuthContext
vi.mock('@/contexts/auth-context', () => ({
    useAuth: () => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
    }),
}));

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}));

// Mock api
vi.mock('@/lib/api', () => ({
    fetchProducts: vi.fn(() => Promise.resolve({ products: [] })),
}));

// Mock navbar preferences context
vi.mock('@/hooks/use-navbar-preferences', () => ({
    useNavbarPreferences: () => ({
        isCompact: false,
        setIsCompact: vi.fn(),
        isVisible: true,
        setIsVisible: vi.fn(),
        style: 'default',
        setStyle: vi.fn(),
    }),
    NavbarPreferencesProvider: ({ children }: { children: React.ReactNode }) => children,
    NAVBAR_STYLES: [{ value: 'default', label: 'Default' }],
}));

// Mock NavbarStyleSwitcher
vi.mock('@/components/navbar/NavbarStyleSwitcher', () => ({
    NavbarStyleSwitcher: () => null,
}));

const createWrapper = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('JourneyPage', () => {
    const mockUpdateData = vi.fn();
    const mockNextStep = vi.fn();
    const mockPrevStep = vi.fn();
    const mockSaveJourney = vi.fn();
    const mockSetCurrentStep = vi.fn();
    const mockContinueJourney = vi.fn();

    const defaultHookValues = {
        currentStep: 0,
        setCurrentStep: mockSetCurrentStep,
        wizardData: {
            tankSize: '',
            tankLiters: 0,
            tankType: 'freshwater-community',
            location: [],
            filterType: 'hob',
            heaterWattage: 100,
            lightingType: 'basic-led',
            substrateType: 'gravel',
            decorations: [],
            waterSource: 'tap',
            cyclingMethod: 'fishless',
            fishTypes: [],
            selectedSpecies: [],
            stockingLevel: 'light',
            maintenancePreference: 'moderate'
        },
        updateData: mockUpdateData,
        continueJourney: mockContinueJourney,
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
        saveJourney: mockSaveJourney,
        resetJourney: vi.fn(),
        savedPlan: null,
        hasActiveSession: false,
        isLoadingSavedPlan: false,
        isSaving: false,
        steps: STEPS
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useJourneyHook.useJourney).mockReturnValue(defaultHookValues);
    });

    it('renders loading state when loading saved plan', () => {
        vi.mocked(useJourneyHook.useJourney).mockReturnValue({
            ...defaultHookValues,
            isLoadingSavedPlan: true
        });

        render(<JourneyPage />, { wrapper: createWrapper() });
        // The bespoke "جاري تحميل رحلتك" text was replaced by the shared
        // <PageLoader />, which announces the wait through role="status".
        expect(screen.getByRole('status', { name: /جارٍ تحميل الصفحة/ })).toBeInTheDocument();
    });

    it('renders Step 1 initially', () => {
        render(<JourneyPage />, { wrapper: createWrapper() });
        expect(screen.getByText(/اختيار الحوض المناسب/i)).toBeInTheDocument();
        // Use getAllByText for text that appears multiple times
        expect(screen.getAllByText(/حجم الحوض/i).length).toBeGreaterThan(0);
    });

    it('calls updateData when selecting an option in Step 1', () => {
        render(<JourneyPage />, { wrapper: createWrapper() });

        const mediumOption = screen.getByText(/متوسط \(60-150 لتر\)/i);
        fireEvent.click(mediumOption);

        expect(mockUpdateData).toHaveBeenCalledWith('tankSize', 'medium');
    });

    it('renders Step 2 when currentStep is 1', () => {
        vi.mocked(useJourneyHook.useJourney).mockReturnValue({
            ...defaultHookValues,
            currentStep: 1
        });

        render(<JourneyPage />, { wrapper: createWrapper() });
        expect(screen.getByText(/موقع ومكان الحوض/i)).toBeInTheDocument();
    });

    it('calls nextStep when Next button is clicked', () => {
        render(<JourneyPage />, { wrapper: createWrapper() });

        const nextButton = screen.getByText(/التالي/i);
        fireEvent.click(nextButton);

        expect(mockNextStep).toHaveBeenCalled();
    });

    it('renders Summary (Step 9) when currentStep is 8', () => {
        vi.mocked(useJourneyHook.useJourney).mockReturnValue({
            ...defaultHookValues,
            currentStep: 8,
            wizardData: { ...defaultHookValues.wizardData, tankSize: 'medium' }
        });

        render(<JourneyPage />, { wrapper: createWrapper() });

        expect(screen.getByRole('heading', { name: 'خطة حوضك للمراجعة' })).toBeInTheDocument();
        expect(screen.getByText(/إكمال هالأسئلة ما يعني إن الحوض جاهز للأسماك/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /راجع اختياراتي على واتساب/ })).toHaveAttribute('href', expect.stringContaining('text='));
        expect(screen.queryByText(/مبروك! خطتك جاهزة/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/أضف جميع المنتجات/)).not.toBeInTheDocument();
        // Navigation buttons should be hidden on summary
        expect(screen.queryByText(/التالي/i)).not.toBeInTheDocument();
    });

    it.each([false, true])('uses the in-memory session to decide whether to offer an account plan (active: %s)', (hasActiveSession) => {
        vi.mocked(useJourneyHook.useJourney).mockReturnValue({
            ...defaultHookValues,
            hasActiveSession,
            wizardData: { ...defaultHookValues.wizardData, tankLiters: 81 },
            savedPlan: { data: normalizeWizardData({ tankSize: 'medium' }), currentStep: 0, createdAt: null },
        });

        render(<JourneyPage />, { wrapper: createWrapper() });

        if (hasActiveSession) {
            expect(screen.getByRole('heading', { name: /اختيار الحوض المناسب/ })).toBeInTheDocument();
            expect(screen.getByDisplayValue('81')).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'متابعة من حيث توقفت' })).not.toBeInTheDocument();
        } else {
            expect(screen.getByRole('button', { name: 'متابعة من حيث توقفت' })).toBeInTheDocument();
        }
    });

    it('includes the recorded dimensions, cycling, location, maintenance and fish groups in printable answers', () => {
        vi.mocked(useJourneyHook.useJourney).mockReturnValue({
            ...defaultHookValues,
            currentStep: 8,
            hasActiveSession: true,
            wizardData: {
                ...defaultHookValues.wizardData, tankSize: 'medium', tankLiters: 81,
                tankLengthCm: 60, tankWidthCm: 30, tankHeightCm: 45,
                location: ['stable-surface', 'near-power'], cyclingMethod: 'fishless',
                maintenancePreference: 'moderate', fishTypes: ['centerpiece'], selectedSpecies: ['betta'],
            },
        });
        vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ litres: 81, groups: [] }), { status: 200 }));
        const print = vi.fn();
        vi.stubGlobal('print', print);
        render(<JourneyPage />, { wrapper: createWrapper() });

        const answers = screen.getByTestId('journey-recorded-answers');
        for (const value of [
            /60 × 30 × 45/, 'دورة نيتروجين بدون أسماك', 'صيانة متوسطة',
            i18next.t('tools:location-setup.s6'), i18next.t('tools:location-setup.s8'),
            i18next.t('tools:journey-labels.fishTypes.centerpiece'),
        ]) {
            const field = within(answers).getByText(value);
            expect(field).toBeInTheDocument();
            expect(field.closest('[class~="print:hidden"]')).toBeNull();
        }
        expect(within(answers).getByText(/بيتا/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: i18next.t('tools:journey-summary.s68') }));
        expect(print).toHaveBeenCalledTimes(1);
    });

});
