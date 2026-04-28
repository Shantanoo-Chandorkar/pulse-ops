import { runCheck } from '@/services/checkEngine';

// Mock DB layer so no real connection is made during unit tests
jest.mock('@/lib/mongoose', () => ({ connectDB: jest.fn() }));
jest.mock('@/models/CheckResult', () => ({ create: jest.fn() }));

import CheckResult from '@/models/CheckResult';

// Use fake timers to skip the 30-second retry delay
jest.useFakeTimers();

/**
 * Builds a minimal Monitor-like object for testing.
 * The save() method is a mock so we can assert it was called.
 */
function makeMonitor(overrides = {}) {
    return {
        _id: 'monitor-id-123',
        userId: 'user-id-456',
        url: 'https://example.com',
        method: 'GET',
        interval: 5,
        timeoutMs: 5000,
        expectedStatusCode: 200,
        keywordCheck: { enabled: false, keyword: '' },
        consecutiveFailures: 0,
        status: 'unknown',
        lastCheckedAt: null,
        nextCheckAt: null,
        save: jest.fn(),
        ...overrides,
    };
}

/**
 * Builds a mock fetch that returns the given status code and body.
 */
function mockFetch(statusCode, body = '') {
    return jest.fn().mockResolvedValue({
        status: statusCode,
        text: jest.fn().mockResolvedValue(body),
    });
}

/**
 * Builds a mock fetch that rejects (network error / timeout).
 */
function mockFetchError(message) {
    return jest.fn().mockRejectedValue(new Error(message));
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('runCheck — happy path', () => {
    it('returns status up when response matches expected status code', async () => {
        global.fetch = mockFetch(200);
        const monitor = makeMonitor();

        const promise = runCheck(monitor);
        jest.runAllTimersAsync();
        const result = await promise;

        expect(result.status).toBe('up');
        expect(result.statusCode).toBe(200);
        expect(result.error).toBeNull();
    });

    it('writes a CheckResult document on success', async () => {
        global.fetch = mockFetch(200);
        const monitor = makeMonitor();

        const promise = runCheck(monitor);
        jest.runAllTimersAsync();
        await promise;

        expect(CheckResult.create).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'up', monitorId: monitor._id })
        );
    });

    it('resets consecutiveFailures to 0 on recovery', async () => {
        global.fetch = mockFetch(200);
        const monitor = makeMonitor({ consecutiveFailures: 3, status: 'down' });

        const promise = runCheck(monitor);
        jest.runAllTimersAsync();
        await promise;

        expect(monitor.consecutiveFailures).toBe(0);
        expect(monitor.status).toBe('up');
    });

    it('saves the monitor after a successful check', async () => {
        global.fetch = mockFetch(200);
        const monitor = makeMonitor();

        const promise = runCheck(monitor);
        jest.runAllTimersAsync();
        await promise;

        expect(monitor.save).toHaveBeenCalled();
    });
});

describe('runCheck — down on wrong status code', () => {
    it('returns status down when status code does not match expected', async () => {
        // Both initial attempt and retry return 500 — fetch called twice
        global.fetch = mockFetch(500);
        const monitor = makeMonitor();

        const promise = runCheck(monitor);
        jest.runAllTimersAsync();
        const result = await promise;

        expect(result.status).toBe('down');
        expect(result.statusCode).toBe(500);
    });

    it('increments consecutiveFailures on down result', async () => {
        global.fetch = mockFetch(500);
        const monitor = makeMonitor({ consecutiveFailures: 1 });

        const promise = runCheck(monitor);
        jest.runAllTimersAsync();
        await promise;

        expect(monitor.consecutiveFailures).toBe(2);
        expect(monitor.status).toBe('down');
    });
});

describe('runCheck — retry behaviour', () => {
    it('returns up if first attempt fails but retry succeeds', async () => {
        // First call → 500, second call → 200
        global.fetch = jest.fn()
            .mockResolvedValueOnce({ status: 500, text: jest.fn().mockResolvedValue('') })
            .mockResolvedValueOnce({ status: 200, text: jest.fn().mockResolvedValue('') });

        const monitor = makeMonitor();

        const promise = runCheck(monitor);
        jest.runAllTimersAsync();
        const result = await promise;

        expect(result.status).toBe('up');
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('returns down if both attempts fail', async () => {
        global.fetch = mockFetch(503);
        const monitor = makeMonitor({ expectedStatusCode: 200 });

        const promise = runCheck(monitor);
        jest.runAllTimersAsync();
        const result = await promise;

        expect(result.status).toBe('down');
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });
});

describe('runCheck — network error / timeout', () => {
    it('returns status down on network error', async () => {
        global.fetch = mockFetchError('fetch failed');
        const monitor = makeMonitor();

        const promise = runCheck(monitor);
        jest.runAllTimersAsync();
        const result = await promise;

        expect(result.status).toBe('down');
        expect(result.statusCode).toBeNull();
        expect(result.error).toBe('fetch failed');
    });
});

describe('runCheck — keyword check', () => {
    it('returns up when keyword is present in response body', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            status: 200,
            text: jest.fn().mockResolvedValue('Welcome to example.com'),
        });
        const monitor = makeMonitor({
            keywordCheck: { enabled: true, keyword: 'Welcome' },
        });

        const promise = runCheck(monitor);
        jest.runAllTimersAsync();
        const result = await promise;

        expect(result.status).toBe('up');
    });

    it('returns down when keyword is absent from response body', async () => {
        global.fetch = jest.fn()
            .mockResolvedValue({ status: 200, text: jest.fn().mockResolvedValue('Page not available') });

        const monitor = makeMonitor({
            keywordCheck: { enabled: true, keyword: 'Welcome' },
        });

        const promise = runCheck(monitor);
        jest.runAllTimersAsync();
        const result = await promise;

        expect(result.status).toBe('down');
        expect(result.error).toContain('Welcome');
    });

    it('skips keyword check when keywordCheck.enabled is false', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            status: 200,
            text: jest.fn().mockResolvedValue('no keyword here'),
        });
        const monitor = makeMonitor({
            keywordCheck: { enabled: false, keyword: 'Welcome' },
        });

        const promise = runCheck(monitor);
        jest.runAllTimersAsync();
        const result = await promise;

        expect(result.status).toBe('up');
    });
});
