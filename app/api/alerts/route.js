import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import Alert from '@/models/Alert';
import Monitor from '@/models/Monitor';
import AlertLog from '@/models/AlertLog';

const VALID_CHANNELS = ['email', 'webhook'];

/**
 * Validates channel-specific config fields.
 * Returns an error string if invalid, or null if valid.
 *
 * @param {string} channel
 * @param {object} config
 * @returns {string|null}
 */
function validateAlertConfig(channel, config) {
    if (!config) return 'config is required';

    if (channel === 'email') {
        if (!config.email || typeof config.email !== 'string') {
            return 'config.email is required for email channel';
        }
    }

    if (channel === 'webhook') {
        if (!config.url || typeof config.url !== 'string') {
            return 'config.url is required for webhook channel';
        }
        try {
            new URL(config.url);
        } catch {
            return 'config.url must be a valid URL';
        }
    }

    return null;
}

/**
 * GET /api/alerts
 * Returns all alerts for the authenticated user.
 * Optional query param: ?monitorId= to filter by monitor.
 */
export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const monitorId = searchParams.get('monitorId');

    const query = { userId: session.user.id };
    if (monitorId) {
        query.monitorId = monitorId;
    }

    const alerts = await Alert.find(query);
    return Response.json(alerts);
}

/**
 * POST /api/alerts
 * Creates a new alert for a monitor.
 * The monitorId must belong to the authenticated user — prevents cross-tenant alert creation.
 */
export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { monitorId, channel, config } = await request.json();

    if (!monitorId || !channel) {
        return Response.json({ error: 'monitorId and channel are required' }, { status: 400 });
    }

    if (!VALID_CHANNELS.includes(channel)) {
        return Response.json({ error: `channel must be one of: ${VALID_CHANNELS.join(', ')}` }, { status: 400 });
    }

    const configError = validateAlertConfig(channel, config);
    if (configError) {
        return Response.json({ error: configError }, { status: 400 });
    }

    await connectDB();

    // Confirm the monitor exists and belongs to this user before creating the alert
    const monitor = await Monitor.findOne({ _id: monitorId, userId: session.user.id });
    if (!monitor) {
        return Response.json({ error: 'Monitor not found' }, { status: 404 });
    }

    const alert = await Alert.create({
        monitorId,
        userId: session.user.id,
        channel,
        config,
    });

    return Response.json(alert, { status: 201 });
}

/**
 * DELETE /api/alerts
 * Deletes an alert by ID, scoped to the authenticated user.
 * Also removes associated AlertLog entries.
 * Body: { id: string }
 */
export async function DELETE(request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
        return Response.json({ error: 'id is required' }, { status: 400 });
    }

    await connectDB();

    const alert = await Alert.findOneAndDelete({ _id: id, userId: session.user.id });
    if (!alert) {
        return Response.json({ error: 'Alert not found' }, { status: 404 });
    }

    await AlertLog.deleteMany({ alertId: id });

    return Response.json({ message: 'Alert deleted' });
}
