import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import Monitor from '@/models/Monitor';
import CheckResult from '@/models/CheckResult';
import Incident from '@/models/Incident';
import Alert from '@/models/Alert';
import AlertLog from '@/models/AlertLog';

const VALID_METHODS = ['GET', 'POST', 'HEAD'];
const VALID_INTERVALS = [1, 5, 10, 30, 60];

/**
 * Validates mutable fields on PUT.
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
 * Resolves the monitor by ID and verifies ownership.
 * Returns { monitor } on success or { error, status } if not found / unauthorized.
 * Using userId in the query (rather than a post-fetch ownership check) prevents
 * cross-tenant access at the DB level and avoids leaking document existence.
 *
 * @param {string} id      - Monitor document _id
 * @param {string} userId  - Authenticated user's ID from session
 */
async function resolveMonitor(id, userId) {
    const monitor = await Monitor.findOne({ _id: id, userId });
    if (!monitor) {
        return { error: 'Monitor not found', status: 404 };
    }
    return { monitor };
}

/**
 * GET /api/monitors/[id]
 * Returns a single monitor belonging to the authenticated user.
 */
export async function GET(request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const { monitor, error, status } = await resolveMonitor(id, session.user.id);
    if (error) {
        return Response.json({ error }, { status });
    }

    return Response.json(monitor);
}

/**
 * PUT /api/monitors/[id]
 * Updates mutable fields on a monitor.
 * Recalculates nextCheckAt if the interval changed so the new cadence takes effect immediately.
 */
export async function PUT(request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, url, method, interval, isActive, expectedStatusCode, keywordCheck, timeoutMs } = body;

    const validationError = validateMonitorFields({ url, method, interval, expectedStatusCode, timeoutMs });
    if (validationError) {
        return Response.json({ error: validationError }, { status: 400 });
    }

    await connectDB();

    const { id } = await params;
    const { monitor, error, status } = await resolveMonitor(id, session.user.id);
    if (error) {
        return Response.json({ error }, { status });
    }

    if (name !== undefined) monitor.name = name;
    if (url !== undefined) monitor.url = url;
    if (method !== undefined) monitor.method = method;
    if (isActive !== undefined) monitor.isActive = isActive;
    if (expectedStatusCode !== undefined) monitor.expectedStatusCode = expectedStatusCode;
    if (keywordCheck !== undefined) monitor.keywordCheck = keywordCheck;
    if (timeoutMs !== undefined) monitor.timeoutMs = timeoutMs;

    if (interval !== undefined && interval !== monitor.interval) {
        monitor.interval = interval;
        // Reset the next check time so the new interval takes effect immediately
        monitor.nextCheckAt = new Date(Date.now() + interval * 60 * 1000);
    }

    await monitor.save();
    return Response.json(monitor);
}

/**
 * DELETE /api/monitors/[id]
 * Deletes a monitor and all associated data (cascade).
 * CheckResults, Incidents, Alerts, and AlertLogs are removed in the same operation.
 */
export async function DELETE(request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const { monitor, error, status } = await resolveMonitor(id, session.user.id);
    if (error) {
        return Response.json({ error }, { status });
    }

    // Collect alert IDs before deleting alerts, so AlertLogs can be cascade-deleted too
    const alerts = await Alert.find({ monitorId: id }, '_id');
    const alertIds = alerts.map((a) => a._id);

    await Promise.all([
        CheckResult.deleteMany({ monitorId: id }),
        Incident.deleteMany({ monitorId: id }),
        Alert.deleteMany({ monitorId: id }),
        AlertLog.deleteMany({ alertId: { $in: alertIds } }),
    ]);

    await monitor.deleteOne();

    return Response.json({ message: 'Monitor deleted' });
}
