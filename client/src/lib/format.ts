import { currencyLabel, formatLocalizedNumber } from "@/i18n/format";
import { currentDocumentLocale } from "@/i18n/document-locale";
/**
 * Format numbers with thousands separators
 * @param value - The number to format
 * @returns Formatted string with commas (e.g., 1,000)
 */
export function formatNumber(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(num)) {
        return '0';
    }

    return formatLocalizedNumber(num, currentDocumentLocale());
}

/**
 * Format currency (IQD) with thousands separators
 * @param value - The price value
 * @param currency - Currency symbol (default: 'د.ع')
 * @returns Formatted price string (e.g., "1,000 д.ع")
 */
export function formatPrice(value: number | string, currency?: string): string {
    return `${formatNumber(value)} ${currency ?? currencyLabel(currentDocumentLocale())}`;
}
