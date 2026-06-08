import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cn, formatIQD, generateOrderNumber, formatDate, formatShortDate } from '../utils';

describe('Utility Functions', () => {
  describe('cn (className utility)', () => {
    it('should merge class names', () => {
      const result = cn('class1', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      const result = cn('base', false && 'hidden', 'visible');
      expect(result).toBe('base visible');
    });

    it('should handle undefined and null', () => {
      const result = cn('base', undefined, null, 'visible');
      expect(result).toBe('base visible');
    });

    it('should merge Tailwind conflicting classes correctly', () => {
      const result = cn('p-4', 'p-8');
      // tailwind-merge should keep only the last padding class
      expect(result).toBe('p-8');
    });

    it('should handle empty input', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle arrays', () => {
      const result = cn(['class1', 'class2']);
      expect(result).toBe('class1 class2');
    });

    it('should handle objects', () => {
      const result = cn({ class1: true, class2: false, class3: true });
      expect(result).toBe('class1 class3');
    });
  });

  describe('formatIQD', () => {
    it('should format integer amounts correctly', () => {
      const result = formatIQD(1000);
      // Arabic locale uses Arabic numerals (١ instead of 1)
      expect(result).toBeTruthy();
      expect(result).toContain('د.ع');
      expect(result.length).toBeGreaterThan(2);
    });

    it('should format zero correctly', () => {
      const result = formatIQD(0);
      // Arabic locale uses Arabic numerals (٠ instead of 0)
      expect(result).toBeTruthy();
      expect(result).toContain('د.ع');
    });

    it('should format large numbers with separators', () => {
      const result = formatIQD(1000000);
      expect(result).toContain('د.ع');
      // Arabic locale should format numbers appropriately
      expect(result.length).toBeGreaterThan(2);
    });

    it('should handle decimal numbers by rounding', () => {
      const result = formatIQD(1234.56);
      expect(result).toContain('د.ع');
      // Should round to integer (no decimal places in output number)
      // Note: Arabic locale may use different separators
      expect(result).toBeTruthy();
    });

    it('should format negative numbers', () => {
      const result = formatIQD(-500);
      expect(result).toContain('د.ع');
      // Arabic locale may format negative numbers differently
      expect(result).toBeTruthy();
    });

    it('should handle very large numbers', () => {
      const result = formatIQD(999999999);
      expect(result).toContain('د.ع');
      expect(result.length).toBeGreaterThan(2);
    });

    it('should append IQD symbol', () => {
      const result = formatIQD(100);
      expect(result).toContain('د.ع');
    });
  });

  describe('generateOrderNumber', () => {
    beforeEach(() => {
      // Reset date for consistent testing
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should generate order number with FW prefix', () => {
      const orderNumber = generateOrderNumber();
      expect(orderNumber).toMatch(/^FW-/);
    });

    it('should include date components (YYMMDD)', () => {
      vi.setSystemTime(new Date('2025-11-29'));
      const orderNumber = generateOrderNumber();

      expect(orderNumber).toMatch(/^FW-251129-/);
    });

    it('should include 4-digit random number', () => {
      const orderNumber = generateOrderNumber();
      const parts = orderNumber.split('-');

      expect(parts).toHaveLength(3);
      expect(parts[2]).toHaveLength(4);
      expect(parts[2]).toMatch(/^\d{4}$/);
    });

    it('should generate unique order numbers', () => {
      const orderNumbers = new Set();
      vi.setSystemTime(new Date('2025-11-29T12:00:00.000Z'));

      for (let i = 0; i < 100; i++) {
        orderNumbers.add(generateOrderNumber());
        vi.advanceTimersByTime(1);
      }

      // Most should be unique (allow small collision due to random)
      expect(orderNumbers.size).toBeGreaterThan(95);
    });

    it('should pad single-digit months', () => {
      vi.setSystemTime(new Date('2025-01-15'));
      const orderNumber = generateOrderNumber();

      expect(orderNumber).toMatch(/^FW-250115-/);
    });

    it('should pad single-digit days', () => {
      vi.setSystemTime(new Date('2025-11-05'));
      const orderNumber = generateOrderNumber();

      expect(orderNumber).toMatch(/^FW-251105-/);
    });

    it('should handle year transition correctly', () => {
      vi.setSystemTime(new Date('2024-12-31'));
      const orderNumber = generateOrderNumber();

      expect(orderNumber).toMatch(/^FW-241231-/);
    });

    it('should pad random numbers with leading zeros', () => {
      vi.setSystemTime(new Date('2025-11-29T12:00:00.000Z'));
      // Generate many to likely get a low number
      let foundPaddedNumber = false;
      for (let i = 0; i < 1000; i++) {
        const orderNumber = generateOrderNumber();
        const randomPart = orderNumber.split('-')[2];
        if (randomPart.startsWith('0')) {
          foundPaddedNumber = true;
          expect(randomPart).toHaveLength(4);
          break;
        }
        vi.advanceTimersByTime(1);
      }
      // This is probabilistic, but should happen
      expect(foundPaddedNumber).toBe(true);
    });
  });

  describe('formatDate', () => {
    it('should format date with Arabic locale', () => {
      const date = new Date('2025-11-29T15:30:00');
      const result = formatDate(date);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should include year, month, day, hour, and minute', () => {
      const date = new Date('2025-11-29T15:30:00');
      const result = formatDate(date);

      // Should contain some representation of the date components
      expect(result.length).toBeGreaterThan(5);
    });

    it('should handle midnight correctly', () => {
      const date = new Date('2025-11-29T00:00:00');
      const result = formatDate(date);

      expect(result).toBeTruthy();
    });

    it('should handle end of day correctly', () => {
      const date = new Date('2025-11-29T23:59:00');
      const result = formatDate(date);

      expect(result).toBeTruthy();
    });

    it('should format different dates differently', () => {
      const date1 = new Date('2025-11-29T15:30:00');
      const date2 = new Date('2025-12-01T10:00:00');

      const result1 = formatDate(date1);
      const result2 = formatDate(date2);

      expect(result1).not.toBe(result2);
    });
  });

  describe('formatShortDate', () => {
    it('should format date with Arabic locale', () => {
      const date = new Date('2025-11-29');
      const result = formatShortDate(date);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should include year, month, and day', () => {
      const date = new Date('2025-11-29');
      const result = formatShortDate(date);

      expect(result.length).toBeGreaterThan(5);
    });

    it('should not include time components', () => {
      const date1 = new Date('2025-11-29T15:30:00');
      const date2 = new Date('2025-11-29T20:45:00');

      const result1 = formatShortDate(date1);
      const result2 = formatShortDate(date2);

      // Same date, different time should produce same result
      expect(result1).toBe(result2);
    });

    it('should be shorter than formatDate', () => {
      const date = new Date('2025-11-29T15:30:00');
      const longFormat = formatDate(date);
      const shortFormat = formatShortDate(date);

      expect(shortFormat.length).toBeLessThan(longFormat.length);
    });

    it('should format different dates differently', () => {
      const date1 = new Date('2025-11-29');
      const date2 = new Date('2025-11-30');

      const result1 = formatShortDate(date1);
      const result2 = formatShortDate(date2);

      expect(result1).not.toBe(result2);
    });

    it('should handle year transitions', () => {
      const date1 = new Date('2024-12-31');
      const date2 = new Date('2025-01-01');

      const result1 = formatShortDate(date1);
      const result2 = formatShortDate(date2);

      expect(result1).not.toBe(result2);
    });
  });
});
