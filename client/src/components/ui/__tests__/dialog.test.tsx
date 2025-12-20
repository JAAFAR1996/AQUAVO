/**
 * Dialog Component Tests
 * Tests for the Dialog UI component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '../dialog';
import { Button } from '../button';

describe('Dialog', () => {
    describe('Basic Rendering', () => {
        it('should not render content when closed', () => {
            render(
                <Dialog>
                    <DialogTrigger>Open</DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Dialog Title</DialogTitle>
                        </DialogHeader>
                    </DialogContent>
                </Dialog>
            );

            expect(screen.queryByText('Dialog Title')).not.toBeInTheDocument();
        });

        it('should render trigger button', () => {
            render(
                <Dialog>
                    <DialogTrigger>Open Dialog</DialogTrigger>
                    <DialogContent>
                        <DialogTitle>Title</DialogTitle>
                    </DialogContent>
                </Dialog>
            );

            expect(screen.getByText('Open Dialog')).toBeInTheDocument();
        });
    });

    describe('Opening and Closing', () => {
        it('should open dialog when trigger clicked', async () => {
            const user = userEvent.setup();

            render(
                <Dialog>
                    <DialogTrigger>Open Dialog</DialogTrigger>
                    <DialogContent>
                        <DialogTitle>Test Dialog</DialogTitle>
                        <DialogDescription>This is a test dialog</DialogDescription>
                    </DialogContent>
                </Dialog>
            );

            await user.click(screen.getByText('Open Dialog'));

            await waitFor(() => {
                expect(screen.getByText('Test Dialog')).toBeInTheDocument();
                expect(screen.getByText('This is a test dialog')).toBeInTheDocument();
            });
        });

        it('should close dialog when close button clicked', async () => {
            const user = userEvent.setup();

            render(
                <Dialog>
                    <DialogTrigger>Open</DialogTrigger>
                    <DialogContent>
                        <DialogTitle>Title</DialogTitle>
                        <DialogClose>Close</DialogClose>
                    </DialogContent>
                </Dialog>
            );

            await user.click(screen.getByText('Open'));
            await waitFor(() => {
                expect(screen.getByText('Title')).toBeInTheDocument();
            });

            await user.click(screen.getByText('Close'));

            await waitFor(() => {
                expect(screen.queryByText('Title')).not.toBeInTheDocument();
            });
        });
    });

    describe('Controlled Dialog', () => {
        it('should work with external state control', async () => {
            const user = userEvent.setup();
            const onOpenChange = vi.fn();

            render(
                <Dialog open={false} onOpenChange={onOpenChange}>
                    <DialogTrigger>Open</DialogTrigger>
                    <DialogContent>
                        <DialogTitle>Controlled Dialog</DialogTitle>
                    </DialogContent>
                </Dialog>
            );

            await user.click(screen.getByText('Open'));

            expect(onOpenChange).toHaveBeenCalledWith(true);
        });
    });

    describe('Dialog Parts', () => {
        it('should render header correctly', async () => {
            const user = userEvent.setup();

            render(
                <Dialog>
                    <DialogTrigger>Open</DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Header Title</DialogTitle>
                            <DialogDescription>Header Description</DialogDescription>
                        </DialogHeader>
                    </DialogContent>
                </Dialog>
            );

            await user.click(screen.getByText('Open'));

            await waitFor(() => {
                expect(screen.getByText('Header Title')).toBeInTheDocument();
                expect(screen.getByText('Header Description')).toBeInTheDocument();
            });
        });

        it('should render footer correctly', async () => {
            const user = userEvent.setup();

            render(
                <Dialog>
                    <DialogTrigger>Open</DialogTrigger>
                    <DialogContent>
                        <DialogTitle>Title</DialogTitle>
                        <DialogFooter>
                            <Button>Cancel</Button>
                            <Button>Confirm</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            );

            await user.click(screen.getByText('Open'));

            await waitFor(() => {
                expect(screen.getByText('Cancel')).toBeInTheDocument();
                expect(screen.getByText('Confirm')).toBeInTheDocument();
            });
        });
    });

    describe('Accessibility', () => {
        it('should have dialog role when open', async () => {
            const user = userEvent.setup();

            render(
                <Dialog>
                    <DialogTrigger>Open</DialogTrigger>
                    <DialogContent>
                        <DialogTitle>Accessible Dialog</DialogTitle>
                    </DialogContent>
                </Dialog>
            );

            await user.click(screen.getByText('Open'));

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
        });

        it('should have proper title for screen readers', async () => {
            const user = userEvent.setup();

            render(
                <Dialog>
                    <DialogTrigger>Open</DialogTrigger>
                    <DialogContent>
                        <DialogTitle>Screen Reader Title</DialogTitle>
                    </DialogContent>
                </Dialog>
            );

            await user.click(screen.getByText('Open'));

            await waitFor(() => {
                expect(screen.getByText('Screen Reader Title')).toBeInTheDocument();
            });
        });
    });

    describe('Use Cases', () => {
        it('should work as confirmation dialog', async () => {
            const user = userEvent.setup();
            const onConfirm = vi.fn();

            render(
                <Dialog>
                    <DialogTrigger>Delete Item</DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>تأكيد الحذف</DialogTitle>
                            <DialogDescription>
                                هل أنت متأكد من حذف هذا العنصر؟
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <DialogClose>إلغاء</DialogClose>
                            <Button onClick={onConfirm}>حذف</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            );

            await user.click(screen.getByText('Delete Item'));

            await waitFor(() => {
                expect(screen.getByText('تأكيد الحذف')).toBeInTheDocument();
            });

            await user.click(screen.getByText('حذف'));
            expect(onConfirm).toHaveBeenCalled();
        });
    });
});
