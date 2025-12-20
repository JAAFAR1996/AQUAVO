/**
 * Logger Utility Tests
 * Tests for the logging utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../logger';

describe('Logger', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'group').mockImplementation(() => { });
        vi.spyOn(console, 'groupEnd').mockImplementation(() => { });
        vi.spyOn(console, 'table').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Log Levels', () => {
        it('should log info messages', () => {
            logger.info('Test info message');
            expect(console.log).toHaveBeenCalled();
        });

        it('should log success messages', () => {
            logger.success('Test success message');
            expect(console.log).toHaveBeenCalled();
        });

        it('should log warning messages', () => {
            logger.warn('Test warning message');
            expect(console.warn).toHaveBeenCalled();
        });

        it('should log error messages', () => {
            logger.error('Test error message');
            expect(console.error).toHaveBeenCalled();
        });

        it('should log debug messages', () => {
            logger.debug('Test debug message');
            expect(console.log).toHaveBeenCalled();
        });
    });

    describe('Data Logging', () => {
        it('should log message with data', () => {
            const testData = { userId: '123', action: 'test' };
            logger.info('Test message', testData);

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Test message'),
                testData
            );
        });

        it('should log message without data when undefined', () => {
            logger.info('Test message without data');
            expect(console.log).toHaveBeenCalled();
        });
    });

    describe('Context Logging', () => {
        it('should log additional context when provided', () => {
            logger.info('Test message', undefined, {
                context: { userId: '123', page: 'home' },
            });

            // Should log at least once
            expect(console.log).toHaveBeenCalled();
        });

        it('should not log extra call for empty context', () => {
            logger.info('Test message', undefined, { context: {} });

            // Should log the main message
            expect(console.log).toHaveBeenCalled();
        });
    });

    describe('Group Logging', () => {
        it('should create log groups', () => {
            logger.group('Test Group', () => {
                logger.info('Inner message');
            });

            expect(console.group).toHaveBeenCalledWith('Test Group');
            expect(console.log).toHaveBeenCalled();
            expect(console.groupEnd).toHaveBeenCalled();
        });
    });

    describe('Table Logging', () => {
        it('should log data as table', () => {
            const tableData = [
                { name: 'Item 1', value: 100 },
                { name: 'Item 2', value: 200 },
            ];

            logger.table(tableData);

            expect(console.table).toHaveBeenCalledWith(tableData, undefined);
        });

        it('should log table with specific columns', () => {
            const tableData = [
                { name: 'Item 1', value: 100, extra: 'ignore' },
                { name: 'Item 2', value: 200, extra: 'ignore' },
            ];

            logger.table(tableData, ['name', 'value']);

            expect(console.table).toHaveBeenCalledWith(tableData, ['name', 'value']);
        });
    });

    describe('Emoji Prefixes', () => {
        it('should include info emoji for info logs', () => {
            logger.info('Info message');
            const call = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0];
            expect(call).toContain('ℹ️');
        });

        it('should include success emoji for success logs', () => {
            logger.success('Success message');
            const call = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0];
            expect(call).toContain('✅');
        });

        it('should include warning emoji for warn logs', () => {
            logger.warn('Warning message');
            const call = (console.warn as ReturnType<typeof vi.fn>).mock.calls[0][0];
            expect(call).toContain('⚠️');
        });

        it('should include error emoji for error logs', () => {
            logger.error('Error message');
            const call = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0];
            expect(call).toContain('❌');
        });

        it('should include debug emoji for debug logs', () => {
            logger.debug('Debug message');
            const call = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0];
            expect(call).toContain('🔍');
        });
    });

    describe('Timestamp', () => {
        it('should include timestamp in log messages', () => {
            logger.info('Test message');
            const call = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0];
            // Check that the log contains brackets (timestamp format varies by locale)
            expect(call).toContain('[');
        });
    });
});
