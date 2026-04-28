import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import Monitor from '@/models/Monitor';

const VALID_METHODS = ['GET', 'POST', 'HEAD'];
const VALID_INTERVALS = [1, 5, 10, 30, 60];

/**
 * Validates fields shared by POST and PUT.
 * Returns an error message string if invalid, or null if valid.
 *
 * @param {object} fields
 * @returns {string|null}
 */
function validateMonitorFields(fields) {
    const { url, method, interval, expectedStatusCode, timeoutMs } = fields;

    if (url !== undefined) {
        try {
            const parsed = new URL(url);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return 'url must start with http:// or https://';
            }
        } catch {
            return 'url must be a valid URL';
        }
    }

    if (method !== undefined && !VALID_METHODS.includes(method)) {
        return `method must be one of: ${VALID_METHODS.join(', ')}`;
    }

    if (interval !== undefined && !VALID_INTERVALS.includes(interval)) {
        return `interval must be one of: ${VALID_INTERVALS.join(', ')}`;
    }

    if (expectedStatusCode !== undefined && (expectedStatusCode < 100 || expectedStatusCode > 599)) {
        return 'expectedStatusCode must be between 100 and 599';
    }

    if (timeoutMs !== undefined && (timeoutMs < 1000 || timeoutMs > 30000)) {
        return 'timeoutMs must be between 1000 and 30000';
    }

    return null;
}

/**
 * GET /api/monitors
 * Returns all monitors belonging to the authenticated user.
 */
export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const monitors = await Monitor.find({ userId: session.user.id }).sort({ createdAt: -1 });
    return Response.json(monitors);
}

/**
 * POST /api/monitors
 * Creates a new monitor for the authenticated user.
 * Sets nextCheckAt to now so the first check is dispatched immediately.
 */
export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, url, method, interval, expectedStatusCode, keywordCheck, timeoutMs } = body;

    if (!name || !url) {
        return Response.json({ error: 'name and url are required' }, { status: 400 });
    }

    const validationError = validateMonitorFields({ url, method, interval, expectedStatusCode, timeoutMs });
    if (validationError) {
        return Response.json({ error: validationError }, { status: 400 });
    }

    await connectDB();

    const monitor = await Monitor.create({
        userId: session.user.id,
        name,
        url,
        method: method || 'GET',
        interval: interval || 5,
        expectedStatusCode: expectedStatusCode || 200,
        keywordCheck: keywordCheck || { enabled: false, keyword: '' },
        timeoutMs: timeoutMs || 10000,
        // Trigger first check immediately by setting nextCheckAt to now
        nextCheckAt: new Date(),
    });

    return Response.json(monitor, { status: 201 });
}
