import { connectDB } from '@/lib/mongoose';
import CheckResult from '@/models/CheckResult';
import * as incidentService from '@/services/incidentService';
import * as alertService from '@/services/alertService';

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
 * Persists the check result, updates monitor state fields, and triggers
 * incident lifecycle transitions when the monitor crosses failure thresholds.
 *
 * Incident rules:
 *   - Open an incident after 2 consecutive failures, but only if the monitor
 *     is not already marked 'down', prevents duplicate open incidents.
 *   - Resolve the open incident on the first successful check after a down period.
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
        await monitor.save();

        // Open incident only after 2 consecutive failures and only if not already
        // marked down, avoids creating duplicate incidents for ongoing outages
        if (monitor.consecutiveFailures >= 2 && monitor.status !== 'down') {
            const incident = await incidentService.openIncident(monitor, result.error || `HTTP ${result.statusCode}`);
            await alertService.sendAlerts(incident, monitor, 'down');
        }
    } else if (result.status === 'up' && monitor.status === 'down') {
        // Monitor recovered, resolve the open incident and reset failure state
        const incident = await incidentService.resolveIncident(monitor);
        if (incident) {
            await alertService.sendAlerts(incident, monitor, 'recovered');
        }
    } else {
        monitor.status = 'up';
        if (monitor.consecutiveFailures > 0) {
            monitor.consecutiveFailures = 0;
        }
        await monitor.save();
    }

    return result;
}

/**
 * Executes a single uptime check for a monitor.
 * Retries once after 30 seconds on failure to suppress transient blips before
 * recording a definitive down result.
 *
 * Writes a CheckResult document, updates Monitor state, and triggers
 * incident open/resolve transitions via incidentService.
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
