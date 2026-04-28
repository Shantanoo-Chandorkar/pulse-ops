import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import CheckResult from '@/models/CheckResult';
import Monitor from '@/models/Monitor';

/**
 * GET /api/checks/[monitorId]
 * Returns the last 100 check results for a monitor, newest first.
 * Verifies monitor ownership before returning data to prevent cross-tenant access.
 *
 * @param {Request} request
 * @param {{ params: { monitorId: string } }} context
 */
export async function GET(request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { monitorId } = await params;

    await connectDB();

    // Verify the monitor belongs to the authenticated user before returning its check data
    const monitor = await Monitor.findOne({ _id: monitorId, userId: session.user.id });
    if (!monitor) {
        return Response.json({ error: 'Monitor not found' }, { status: 404 });
    }

    const results = await CheckResult.find({ monitorId, userId: session.user.id })
        .sort({ timestamp: -1 })
        .limit(100)
        .lean();

    return Response.json(results);
}
