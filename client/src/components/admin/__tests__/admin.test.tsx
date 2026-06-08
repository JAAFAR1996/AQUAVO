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

vi.mock('@/components/ui/alert-dialog', () => ({
    AlertDialog: ({ children, open }: any) => open ? <div data-testid="alert-dialog">{children}</div> : null,
    AlertDialogAction: ({ children, onClick }: any) => <button data-testid="alert-dialog-action" onClick={onClick}>{children}</button>,
    AlertDialogCancel: ({ children }: any) => <button data-testid="alert-dialog-cancel">{children}</button>,
    AlertDialogContent: ({ children }: any) => <div>{children}</div>,
    AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
    AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
    AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
    AlertDialogTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock('lucide-react', () => ({
    Settings: () => <span data-testid="settings-icon">⚙️</span>,
    Save: () => <span data-testid="save-icon">💾</span>,
    Loader2: () => <span data-testid="loader-icon">⏳</span>,
    ShieldCheck: () => <span data-testid="shield-icon">🛡️</span>,
    Users: () => <span data-testid="users-icon">👥</span>,
    Package: () => <span data-testid="package-icon">📦</span>,
    AlertTriangle: () => <span data-testid="alert-triangle-icon">!</span>,
    Truck: () => <span data-testid="truck-icon">truck</span>,
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

const stableSettingsData = {
    store_name: 'AQUAVO',
    support_email: 'info@aquavoiq.com',
    maintenance_mode: 'false',
    orders_enabled: 'true',
};

const defaultQueryResult = {
    data: stableSettingsData,
    isLoading: false,
    isError: false,
};

vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn(() => defaultQueryResult),
    useMutation: vi.fn((options) => ({
        mutate: vi.fn((data) => {
            options.onSuccess?.();
        }),
        isPending: false,
    })),
    useQueryClient: () => mockQueryClient,
}));

import SettingsManagement from '../settings-management';
import { useQuery } from '@tanstack/react-query';

describe('SettingsManagement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render the settings form', () => {
        render(<SettingsManagement />);
        expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
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

    it('should confirm before enabling maintenance mode switch', async () => {
        render(<SettingsManagement />);
        const switchEl = screen.getByTestId('switch-maintenance_mode');
        expect(switchEl).not.toBeChecked();

        fireEvent.click(switchEl);
        await waitFor(() => expect(screen.getByTestId('alert-dialog')).toBeInTheDocument());
        expect(switchEl).not.toBeChecked();

        fireEvent.click(screen.getByTestId('alert-dialog-action'));
        await waitFor(() => expect(switchEl).toBeChecked());
    });
});

describe('SettingsManagement loading state', () => {
    beforeEach(() => {
        vi.mocked(useQuery).mockReturnValue({
            data: null,
            isLoading: true,
            isError: false,
        } as any);
    });

    it('should show loading state', () => {
        render(<SettingsManagement />);
        expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });
});

describe('SettingsManagement error state', () => {
    beforeEach(() => {
        vi.mocked(useQuery).mockReturnValue({
            data: null,
            isLoading: false,
            isError: true,
        } as any);
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
