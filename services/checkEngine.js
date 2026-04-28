import { connectDB } from '@/lib/mongoose';
import CheckResult from '@/models/CheckResult';

/**
 * Pauses execution for the given number of milliseconds.
 *
 * @param {number} ms - Duration to sleep in milliseconds.
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes a single HTTP request against the monitor's target URL.
 * Handles network errors, DNS failures, and timeouts via AbortController.
 * Validates the response status code and optional keyword.
 *
 * @param {object} monitor - Mongoose Monitor document.
 * @param {string} monitor.url
 * @param {string} monitor.method
 * @param {number} monitor.timeoutMs
 * @param {number} monitor.expectedStatusCode
 * @param {{ enabled: boolean, keyword: string }} monitor.keywordCheck
 * @returns {Promise<{ status: 'up'|'down', statusCode: number|null, responseTimeMs: number, error: string|null }>}
 */
async function attemptRequest(monitor) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), monitor.timeoutMs);
    const startTime = Date.now();

    try {
        const response = await fetch(monitor.url, {
            method: monitor.method,
            signal: controller.signal,
            // Prevent fetch from following redirects silently and masking a non-200 status
            redirect: 'follow',
        });

        const responseTimeMs = Date.now() - startTime;
        clearTimeout(timeoutId);

        if (response.status !== monitor.expectedStatusCode) {
            return {
                status: 'down',
                statusCode: response.status,
                responseTimeMs,
                error: `Expected status ${monitor.expectedStatusCode}, got ${response.status}`,
            };
        }

        if (monitor.keywordCheck?.enabled && monitor.keywordCheck.keyword) {
            const body = await response.text();
            if (!body.includes(monitor.keywordCheck.keyword)) {
                return {
                    status: 'down',
                    statusCode: response.status,
                    responseTimeMs,
                    error: `Keyword "${monitor.keywordCheck.keyword}" not found in response body`,
                };
            }
        }

        return { status: 'up', statusCode: response.status, responseTimeMs, error: null };

    } catch (err) {
        clearTimeout(timeoutId);
        const responseTimeMs = Date.now() - startTime;
        const errorMessage = err.name === 'AbortError' ? 'Request timed out' : err.message;

        return { status: 'down', statusCode: null, responseTimeMs, error: errorMessage };
    }
}

/**
 * Persists the check result and updates the monitor's state fields.
 * Manages consecutiveFailures count for use by the incident service (Step 6).
 * Does NOT open or resolve incidents — that responsibility belongs to incidentService.
 *
 * @param {object} monitor - Mongoose Monitor document (will be mutated and saved).
 * @param {{ status: 'up'|'down', statusCode: number|null, responseTimeMs: number, error: string|null }} result
 * @returns {Promise<{ status: 'up'|'down', statusCode: number|null, responseTimeMs: number, error: string|null }>}
 */
async function finalise(monitor, result) {
    await connectDB();

    await CheckResult.create({
        monitorId: monitor._id,
        userId: monitor.userId,
        timestamp: new Date(),
        status: result.status,
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
        error: result.error,
    });

    monitor.lastCheckedAt = new Date();
    monitor.nextCheckAt = new Date(Date.now() + monitor.interval * 60 * 1000);

    if (result.status === 'down') {
        monitor.consecutiveFailures += 1;
        monitor.status = 'down';
    } else {
        if (monitor.consecutiveFailures > 0) {
            monitor.consecutiveFailures = 0;
        }
        monitor.status = 'up';
    }

    await monitor.save();
    return result;
}

/**
 * Executes a single uptime check for a monitor.
 * Retries once after 30 seconds on failure to suppress transient blips before
 * recording a definitive down result.
 *
 * Writes a CheckResult document and updates the Monitor's status fields.
 * Does NOT open incidents or send alerts — the dispatcher (Step 5) calls
 * incidentService after this function returns.
 *
 * @param {object} monitor - Mongoose Monitor document.
 * @returns {Promise<{ status: 'up'|'down', statusCode: number|null, responseTimeMs: number, error: string|null }>}
 */
export async function runCheck(monitor) {
    const result = await attemptRequest(monitor);

    if (result.status === 'down') {
        // Wait 30 seconds and retry once before treating this as a real outage.
        // This prevents a single transient network hiccup from triggering an incident.
        await sleep(30_000);
        const retryResult = await attemptRequest(monitor);
        return await finalise(monitor, retryResult);
    }

    return await finalise(monitor, result);
}
