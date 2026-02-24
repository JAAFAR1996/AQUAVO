import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock UI components
vi.mock('@/components/ui/card', () => ({
    Card: ({ children }: any) => <div data-testid="card">{children}</div>,
    CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
    CardDescription: ({ children }: any) => <p>{children}</p>,
    CardHeader: ({ children }: any) => <div>{children}</div>,
    CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
}));

vi.mock('@/components/ui/label', () => ({
    Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock('@/components/ui/input', () => ({
    Input: (props: any) => <input {...props} data-testid={props.id || 'input'} />,
}));

vi.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, disabled, variant }: any) => (
        <button onClick={onClick} disabled={disabled} data-testid="button">
            {children}
        </button>
    ),
}));

vi.mock('@/components/ui/switch', () => ({
    Switch: ({ id, checked, onCheckedChange }: any) => (
        <input
            type="checkbox"
            id={id}
            checked={checked}
            onChange={(e) => onCheckedChange(e.target.checked)}
            data-testid={`switch-${id}`}
        />
    ),
}));

vi.mock('lucide-react', () => ({
    Settings: () => <span data-testid="settings-icon">⚙️</span>,
    Save: () => <span data-testid="save-icon">💾</span>,
    Loader2: () => <span data-testid="loader-icon">⏳</span>,
    ShieldCheck: () => <span data-testid="shield-icon">🛡️</span>,
    Users: () => <span data-testid="users-icon">👥</span>,
    Package: () => <span data-testid="package-icon">📦</span>,
}));

vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}));

vi.mock('@/lib/csrf', () => ({
    addCsrfHeader: (headers: any) => headers,
}));

// Mock React Query
const mockQueryClient = {
    invalidateQueries: vi.fn(),
};

vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn(() => ({
        data: {
            store_name: 'AQUAVO',
            support_email: 'info@aquavoiq.com',
            maintenance_mode: 'false',
            orders_enabled: 'true',
        },
        isLoading: false,
        isError: false,
    })),
    useMutation: vi.fn((options) => ({
        mutate: vi.fn((data) => {
            options.onSuccess?.();
        }),
        isPending: false,
    })),
    useQueryClient: () => mockQueryClient,
}));

import SettingsManagement from '../settings-management';

describe('SettingsManagement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render the settings form', () => {
        render(<SettingsManagement />);
        expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('should display store name input', () => {
        render(<SettingsManagement />);
        expect(screen.getByTestId('store_name')).toBeInTheDocument();
    });

    it('should display support email input', () => {
        render(<SettingsManagement />);
        expect(screen.getByTestId('support_email')).toBeInTheDocument();
    });

    it('should display maintenance mode switch', () => {
        render(<SettingsManagement />);
        expect(screen.getByTestId('switch-maintenance_mode')).toBeInTheDocument();
    });

    it('should display orders enabled switch', () => {
        render(<SettingsManagement />);
        expect(screen.getByTestId('switch-orders_enabled')).toBeInTheDocument();
    });

    it('should have save button', () => {
        render(<SettingsManagement />);
        expect(screen.getByTestId('button')).toBeInTheDocument();
    });

    it('should display settings icon in title', () => {
        render(<SettingsManagement />);
        expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
    });

    it('should update store name on input change', async () => {
        render(<SettingsManagement />);
        const input = screen.getByTestId('store_name');
        await userEvent.clear(input);
        await userEvent.type(input, 'New Store Name');
        expect(input).toHaveValue('New Store Name');
    });

    it('should toggle maintenance mode switch', async () => {
        render(<SettingsManagement />);
        const switchEl = screen.getByTestId('switch-maintenance_mode');
        expect(switchEl).not.toBeChecked();

        fireEvent.click(switchEl);
        expect(switchEl).toBeChecked();
    });
});

describe('SettingsManagement loading state', () => {
    beforeEach(() => {
        const { useQuery } = require('@tanstack/react-query');
        useQuery.mockReturnValue({
            data: null,
            isLoading: true,
            isError: false,
        });
    });

    it('should show loading state', () => {
        render(<SettingsManagement />);
        expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });
});

describe('SettingsManagement error state', () => {
    beforeEach(() => {
        const { useQuery } = require('@tanstack/react-query');
        useQuery.mockReturnValue({
            data: null,
            isLoading: false,
            isError: true,
        });
    });

    it('should show error message', () => {
        render(<SettingsManagement />);
        expect(screen.getByText(/فشل في تحميل الإعدادات/)).toBeInTheDocument();
    });

    it('should have retry button', () => {
        render(<SettingsManagement />);
        expect(screen.getByText('إعادة المحاولة')).toBeInTheDocument();
    });
});
