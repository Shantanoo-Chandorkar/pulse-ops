import { connectDB } from '@/lib/mongoose';
import Incident from '@/models/Incident';

/**
 * Opens a new incident for a monitor that has crossed the consecutiveFailures threshold.
 * Sets monitor.status = 'down' and persists it.
 *
 * @param {object} monitor - Mongoose Monitor document.
 * @param {string} cause   - Human-readable failure reason (error message or HTTP status).
 * @returns {Promise<object>} The created Incident document.
 */
export async function openIncident(monitor, cause) {
    await connectDB();

    const incident = await Incident.create({
        monitorId: monitor._id,
        userId: monitor.userId,
        startedAt: new Date(),
        resolvedAt: null,
        cause,
    });

    monitor.status = 'down';
    await monitor.save();

    return incident;
}

/**
 * Resolves the most recent open incident for a monitor.
 * Computes durationMs from startedAt to now.
 * Resets monitor.status = 'up' and consecutiveFailures = 0.
 *
 * @param {object} monitor - Mongoose Monitor document.
 * @returns {Promise<object|null>} The resolved Incident, or null if none was open.
 */
export async function resolveIncident(monitor) {
    await connectDB();

    const incident = await Incident.findOne({
        monitorId: monitor._id,
        resolvedAt: null,
    });

    if (!incident) return null;

    const now = new Date();
    incident.resolvedAt = now;
    incident.durationMs = now - incident.startedAt;
    await incident.save();

    monitor.status = 'up';
    monitor.consecutiveFailures = 0;
    await monitor.save();

    return incident;
}
