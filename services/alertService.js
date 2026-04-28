import { Resend } from 'resend';
import { connectDB } from '@/lib/mongoose';
import Alert from '@/models/Alert';
import AlertLog from '@/models/AlertLog';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Builds the email subject and plain-text body for an alert.
 *
 * @param {object} monitor
 * @param {object} incident
 * @param {'down'|'recovered'} eventType
 * @returns {{ subject: string, html: string }}
 */
function buildEmailContent(monitor, incident, eventType) {
    const isDown = eventType === 'down';
    const subject = isDown
        ? `[DOWN] ${monitor.name} is unreachable`
        : `[RECOVERED] ${monitor.name} is back up`;

    const statusLine = isDown
        ? `<strong>Status:</strong> DOWN`
        : `<strong>Status:</strong> RECOVERED`;

    const durationLine = incident.durationMs
        ? `<p><strong>Duration:</strong> ${Math.round(incident.durationMs / 1000)}s</p>`
        : '';

    const dashboardUrl = `${process.env.NEXTAUTH_URL}/dashboard/monitors/${monitor._id}`;

    const html = `
        <h2>${subject}</h2>
        <p><strong>Monitor:</strong> ${monitor.name}</p>
        <p><strong>URL:</strong> ${monitor.url}</p>
        <p>${statusLine}</p>
        <p><strong>Incident started:</strong> ${incident.startedAt.toISOString()}</p>
        ${durationLine}
        <p><a href="${dashboardUrl}">View on dashboard</a></p>
    `;

    return { subject, html };
}

/**
 * Builds the JSON payload for a webhook alert.
 *
 * @param {object} monitor
 * @param {object} incident
 * @param {'down'|'recovered'} eventType
 * @returns {object}
 */
function buildWebhookPayload(monitor, incident, eventType) {
    return {
        event: eventType === 'down' ? 'monitor.down' : 'monitor.recovered',
        monitorId: monitor._id.toString(),
        monitorName: monitor.name,
        url: monitor.url,
        status: eventType === 'down' ? 'down' : 'up',
        incidentId: incident._id.toString(),
        startedAt: incident.startedAt.toISOString(),
        resolvedAt: incident.resolvedAt ? incident.resolvedAt.toISOString() : null,
        dashboardUrl: `${process.env.NEXTAUTH_URL}/dashboard/monitors/${monitor._id}`,
    };
}

/**
 * Dispatches a single alert (email or webhook) and records the outcome in AlertLog.
 * Never throws, a failed alert must not interrupt the check pipeline.
 *
 * @param {object} alert     - Mongoose Alert document.
 * @param {object} incident  - Mongoose Incident document.
 * @param {object} monitor   - Mongoose Monitor document.
 * @param {'down'|'recovered'} eventType
 */
async function dispatchAlert(alert, incident, monitor, eventType) {
    let status = 'failed';
    let responseBody = '';

    try {
        if (alert.channel === 'email') {
            const { subject, html } = buildEmailContent(monitor, incident, eventType);
            const response = await resend.emails.send({
                from: process.env.EMAIL_FROM,
                to: alert.config.email,
                subject,
                html,
            });
            responseBody = JSON.stringify(response).slice(0, 1000);
            status = 'sent';

        } else if (alert.channel === 'webhook') {
            const payload = buildWebhookPayload(monitor, incident, eventType);
            // Merge user-configured custom headers with the base Content-Type header
            const headers = {
                'Content-Type': 'application/json',
                ...(alert.config.headers ? Object.fromEntries(alert.config.headers) : {}),
            };

            const response = await fetch(alert.config.url, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });

            responseBody = (await response.text()).slice(0, 1000);
            status = 'sent';
        }
    } catch (err) {
        // Log alertId and channel only, never log email addresses or webhook URLs
        console.error('[alertService] dispatch failed', {
            alertId: alert._id.toString(),
            channel: alert.channel,
            error: err.message,
        });
        responseBody = err.message.slice(0, 1000);
    }

    await AlertLog.create({
        alertId: alert._id,
        incidentId: incident._id,
        sentAt: new Date(),
        channel: alert.channel,
        status,
        responseBody,
    });
}

/**
 * Sends all active alerts configured for a monitor when an incident event fires.
 * Uses Promise.allSettled so one failed delivery never blocks the others.
 *
 * @param {object} incident  - Mongoose Incident document.
 * @param {object} monitor   - Mongoose Monitor document.
 * @param {'down'|'recovered'} eventType
 */
export async function sendAlerts(incident, monitor, eventType) {
    await connectDB();

    const alerts = await Alert.find({ monitorId: monitor._id, isActive: true });

    await Promise.allSettled(
        alerts.map((alert) => dispatchAlert(alert, incident, monitor, eventType))
    );
}
