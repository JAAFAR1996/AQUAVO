/**
 * Fish Health Diagnosis Page Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('wouter', () => ({
    useLocation: () => ['/fish-health-diagnosis', vi.fn()],
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

vi.mock('@/components/navbar', () => ({
    default: () => <nav data-testid="navbar">Navbar</nav>,
}));

vi.mock('@/components/footer', () => ({
    default: () => <footer data-testid="footer">Footer</footer>,
}));

vi.mock('@/components/whatsapp-widget', () => ({
    WhatsAppWidget: () => <div data-testid="whatsapp">WhatsApp</div>,
}));

vi.mock('@/components/back-to-top', () => ({
    BackToTop: () => <button data-testid="back-to-top">Back to Top</button>,
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import FishHealthDiagnosis from '../fish-health-diagnosis';

describe('Fish Health Diagnosis Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('should render fish health diagnosis page', () => {
            render(<FishHealthDiagnosis />);
            expect(screen.getByTestId('navbar')).toBeInTheDocument();
            expect(screen.getByTestId('footer')).toBeInTheDocument();
        });

        it('should have main content area', () => {
            render(<FishHealthDiagnosis />);
            expect(screen.getByRole('main')).toBeInTheDocument();
        });

        it('should display page title', () => {
            render(<FishHealthDiagnosis />);
            const heading = screen.getByRole('heading', { level: 1 });
            expect(heading).toBeInTheDocument();
        });

        it('should display AI diagnosis badge with Dr. AQUAVO branding', () => {
            render(<FishHealthDiagnosis />);
            const elements = screen.getAllByText(/Dr\. AQUAVO/);
            expect(elements.length).toBeGreaterThan(0);
        });

        it('should have upload section', () => {
            render(<FishHealthDiagnosis />);
            expect(screen.getByText(/ارفع صورة السمكة/)).toBeInTheDocument();
        });

        it('should display diagnosis result placeholder', () => {
            render(<FishHealthDiagnosis />);
            expect(screen.getByText(/نتيجة التشخيص/)).toBeInTheDocument();
        });

        it('should display disease categories reference section', () => {
            render(<FishHealthDiagnosis />);
            expect(screen.getByText(/قاعدة بيانات الأمراض/)).toBeInTheDocument();
        });

        it('should display all 4 disease category cards', () => {
            render(<FishHealthDiagnosis />);
            expect(screen.getByText('طفيلية')).toBeInTheDocument();
            expect(screen.getByText('بكتيرية')).toBeInTheDocument();
            expect(screen.getByText(/فطرية/)).toBeInTheDocument();
            expect(screen.getByText(/بيئية/)).toBeInTheDocument();
        });

        it('should show upload tips', () => {
            render(<FishHealthDiagnosis />);
            expect(screen.getByText(/نصائح لأفضل نتيجة/)).toBeInTheDocument();
        });
    });

    describe('Diagnosis Tool', () => {
        it('should display diagnosis form or tool', () => {
            render(<FishHealthDiagnosis />);
            expect(screen.getByRole('main')).toBeInTheDocument();
        });

        it('should have upload and camera buttons', () => {
            render(<FishHealthDiagnosis />);
            expect(screen.getByText('رفع صورة')).toBeInTheDocument();
            expect(screen.getByText('التقاط صورة')).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('should have proper heading structure', () => {
            render(<FishHealthDiagnosis />);
            const headings = screen.getAllByRole('heading');
            expect(headings.length).toBeGreaterThan(0);
        });

        it('should have disclaimer notice', () => {
            render(<FishHealthDiagnosis />);
            expect(screen.getByText(/تقديري يعتمد على الذكاء الاصطناعي/)).toBeInTheDocument();
        });
    });
});
