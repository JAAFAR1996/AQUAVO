/**
 * Input Component Tests
 * Tests for the Input UI component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../input';

describe('Input', () => {
    describe('Rendering', () => {
        it('should render input element', () => {
            render(<Input />);
            expect(screen.getByRole('textbox')).toBeInTheDocument();
        });

        it('should apply custom className', () => {
            render(<Input className="custom-input" />);
            expect(screen.getByRole('textbox')).toHaveClass('custom-input');
        });

        it('should render with placeholder', () => {
            render(<Input placeholder="Enter text..." />);
            expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
        });
    });

    describe('Input Types', () => {
        it('should render as textbox by default', () => {
            render(<Input />);
            // HTML5: type defaults to "text" when not specified, but getAttribute returns null
            expect(screen.getByRole('textbox')).toBeInTheDocument();
        });

        it('should render email input', () => {
            render(<Input type="email" />);
            expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
        });

        it('should render password input', () => {
            render(<Input type="password" />);
            // Password inputs don't have textbox role
            expect(document.querySelector('input[type="password"]')).toBeInTheDocument();
        });

        it('should render number input', () => {
            render(<Input type="number" />);
            expect(screen.getByRole('spinbutton')).toBeInTheDocument();
        });

        it('should render search input', () => {
            render(<Input type="search" />);
            expect(screen.getByRole('searchbox')).toBeInTheDocument();
        });

        it('should render tel input', () => {
            render(<Input type="tel" />);
            expect(screen.getByRole('textbox')).toHaveAttribute('type', 'tel');
        });
    });

    describe('Value and Change', () => {
        it('should display initial value', () => {
            render(<Input defaultValue="Initial value" />);
            expect(screen.getByRole('textbox')).toHaveValue('Initial value');
        });

        it('should call onChange when value changes', async () => {
            const user = userEvent.setup();
            const handleChange = vi.fn();

            render(<Input onChange={handleChange} />);
            await user.type(screen.getByRole('textbox'), 'test');

            expect(handleChange).toHaveBeenCalled();
        });

        it('should update value on user input', async () => {
            const user = userEvent.setup();

            render(<Input />);
            await user.type(screen.getByRole('textbox'), 'hello');

            expect(screen.getByRole('textbox')).toHaveValue('hello');
        });
    });

    describe('Disabled State', () => {
        it('should be disabled when disabled prop is true', () => {
            render(<Input disabled />);
            expect(screen.getByRole('textbox')).toBeDisabled();
        });

        it('should not allow input when disabled', async () => {
            const user = userEvent.setup();

            render(<Input disabled />);
            await user.type(screen.getByRole('textbox'), 'test');

            expect(screen.getByRole('textbox')).toHaveValue('');
        });
    });

    describe('Read Only State', () => {
        it('should be readonly when readOnly prop is true', () => {
            render(<Input readOnly defaultValue="readonly" />);
            expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
        });
    });

    describe('Required State', () => {
        it('should be required when required prop is true', () => {
            render(<Input required />);
            expect(screen.getByRole('textbox')).toBeRequired();
        });
    });

    describe('Accessibility', () => {
        it('should support aria-label', () => {
            render(<Input aria-label="Email address" />);
            expect(screen.getByLabelText('Email address')).toBeInTheDocument();
        });

        it('should support aria-describedby', () => {
            render(
                <>
                    <Input aria-describedby="help-text" />
                    <span id="help-text">Enter your email</span>
                </>
            );
            expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'help-text');
        });

        it('should support id for label association', () => {
            render(
                <>
                    <label htmlFor="email-input">Email</label>
                    <Input id="email-input" />
                </>
            );
            expect(screen.getByLabelText('Email')).toBeInTheDocument();
        });
    });

    describe('Focus Behavior', () => {
        it('should focus when focus method called', () => {
            render(<Input data-testid="focus-input" />);
            const input = screen.getByTestId('focus-input');

            input.focus();
            expect(document.activeElement).toBe(input);
        });

        it('should call onFocus when focused', async () => {
            const user = userEvent.setup();
            const handleFocus = vi.fn();

            render(<Input onFocus={handleFocus} />);
            await user.click(screen.getByRole('textbox'));

            expect(handleFocus).toHaveBeenCalled();
        });

        it('should call onBlur when blurred', async () => {
            const user = userEvent.setup();
            const handleBlur = vi.fn();

            render(<Input onBlur={handleBlur} />);
            const input = screen.getByRole('textbox');
            await user.click(input);
            await user.tab(); // Tab away to blur

            expect(handleBlur).toHaveBeenCalled();
        });
    });

    describe('Attributes', () => {
        it('should support maxLength', () => {
            render(<Input maxLength={10} />);
            expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '10');
        });

        it('should support minLength', () => {
            render(<Input minLength={3} />);
            expect(screen.getByRole('textbox')).toHaveAttribute('minLength', '3');
        });

        it('should support pattern', () => {
            render(<Input pattern="[0-9]+" />);
            expect(screen.getByRole('textbox')).toHaveAttribute('pattern', '[0-9]+');
        });

        it('should support autoComplete', () => {
            render(<Input autoComplete="email" />);
            expect(screen.getByRole('textbox')).toHaveAttribute('autoComplete', 'email');
        });
    });
});
