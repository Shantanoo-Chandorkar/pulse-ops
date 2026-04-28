import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import Incident from '@/models/Incident';
import Monitor from '@/models/Monitor';
import { resolveIncident } from '@/services/incidentService';

/**
 * GET /api/incidents
 * Returns all incidents for the authenticated user, newest first.
 * Optional query param: ?monitorId= to filter by a specific monitor.
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

    const incidents = await Incident.find(query).sort({ startedAt: -1 });
    return Response.json(incidents);
}

/**
 * PUT /api/incidents
 * Manually resolves an open incident by ID.
 * Body: { id: string }
 *
 * Syncs monitor.status back to 'up' via resolveIncident so the monitor
 * reflects reality after a manual resolution.
 */
export async function PUT(request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
        return Response.json({ error: 'id is required' }, { status: 400 });
    }

    await connectDB();

    // Verify the incident belongs to the authenticated user before touching it
    const incident = await Incident.findOne({ _id: id, userId: session.user.id });
    if (!incident) {
        return Response.json({ error: 'Incident not found' }, { status: 404 });
    }

    if (incident.resolvedAt) {
        return Response.json({ error: 'Incident is already resolved' }, { status: 400 });
    }

    // Load the monitor so resolveIncident can sync its status fields
    const monitor = await Monitor.findOne({ _id: incident.monitorId, userId: session.user.id });
    if (!monitor) {
        return Response.json({ error: 'Monitor not found' }, { status: 404 });
    }

    const resolved = await resolveIncident(monitor);
    return Response.json(resolved);
}
