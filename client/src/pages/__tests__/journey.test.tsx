import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import JourneyPage from '../journey';
import * as useJourneyHook from '@/hooks/use-journey';

// Mock wouter
vi.mock('wouter', () => ({
    useLocation: () => ['/journey', vi.fn()],
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

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}));

describe('JourneyPage', () => {
    const mockUpdateData = vi.fn();
    const mockNextStep = vi.fn();
    const mockPrevStep = vi.fn();
    const mockSaveJourney = vi.fn();
    const mockSetCurrentStep = vi.fn();

    const defaultHookValues = {
        currentStep: 0,
        setCurrentStep: mockSetCurrentStep,
        wizardData: {
            tankSize: '',
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
            stockingLevel: 'light',
            maintenancePreference: 'moderate',
            startedAt: new Date().toISOString()
        },
        updateData: mockUpdateData,
        nextStep: mockNextStep,
        prevStep: mockPrevStep,
        saveJourney: mockSaveJourney,
        resetJourney: vi.fn(),
        savedPlan: null,
        isLoadingSavedPlan: false,
        isSaving: false,
        products: []
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useJourneyHook.useJourney as any).mockReturnValue(defaultHookValues);
    });

    it('renders loading state when loading saved plan', () => {
        (useJourneyHook.useJourney as any).mockReturnValue({
            ...defaultHookValues,
            isLoadingSavedPlan: true
        });

        render(<JourneyPage />);
        expect(screen.getByText(/جاري تحميل رحلتك/i)).toBeInTheDocument();
    });

    it('renders Step 1 initially', () => {
        render(<JourneyPage />);
        expect(screen.getByText(/اختيار الحوض المناسب/i)).toBeInTheDocument();
        // Use getAllByText for text that appears multiple times
        expect(screen.getAllByText(/حجم الحوض/i).length).toBeGreaterThan(0);
    });

    it('calls updateData when selecting an option in Step 1', () => {
        render(<JourneyPage />);

        const mediumOption = screen.getByText(/متوسط \(60-150 لتر\)/i);
        fireEvent.click(mediumOption);

        expect(mockUpdateData).toHaveBeenCalledWith('tankSize', 'medium');
    });

    it('renders Step 2 when currentStep is 1', () => {
        (useJourneyHook.useJourney as any).mockReturnValue({
            ...defaultHookValues,
            currentStep: 1
        });

        render(<JourneyPage />);
        expect(screen.getByText(/موقع ومكان الحوض/i)).toBeInTheDocument();
    });

    it('calls nextStep when Next button is clicked', () => {
        render(<JourneyPage />);

        const nextButton = screen.getByText(/التالي/i);
        fireEvent.click(nextButton);

        expect(mockNextStep).toHaveBeenCalled();
    });

    it('renders Summary (Step 9) when currentStep is 8', () => {
        (useJourneyHook.useJourney as any).mockReturnValue({
            ...defaultHookValues,
            currentStep: 8,
            wizardData: { ...defaultHookValues.wizardData, tankSize: 'medium' }
        });

        render(<JourneyPage />);

        expect(screen.getByText(/مبروك! خطتك جاهزة/i)).toBeInTheDocument();
        expect(screen.getAllByText(/المنتجات الموصى بها/i).length).toBeGreaterThan(0);
        // Navigation buttons should be hidden on summary
        expect(screen.queryByText(/التالي/i)).not.toBeInTheDocument();
    });

});
