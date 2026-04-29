import { connectDB } from '@/lib/mongoose';
import Monitor from '@/models/Monitor';
import { runCheck } from '@/services/checkEngine';

const BATCH_SIZE = 10;

/**
 * GET /api/internal/checks/dispatch
 *
 * Called by GitHub Actions every 5 minutes. Finds all active monitors whose
 * nextCheckAt is in the past and runs their checks in parallel batches.
 *
 * Security: guarded by CRON_SECRET, not behind NextAuth because GitHub
 * Actions cannot carry a user session.
 *
 * Batching at 10: keeps memory and concurrency within Vercel Hobby tier limits.
 * Promise.allSettled ensures one failing check never cancels the rest.
 */
export async function GET(request) {
    const authHeader = request.headers.get('authorization');
    const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

    if (!authHeader || authHeader !== expectedToken) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const dueMonitors = await Monitor.find({
        isActive: true,
        nextCheckAt: { $lte: new Date() },
    });

    let succeeded = 0;
    let failed = 0;

    // Process in batches to avoid overwhelming the serverless function
    for (let i = 0; i < dueMonitors.length; i += BATCH_SIZE) {
        const batch = dueMonitors.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(batch.map((monitor) => runCheck(monitor)));

        for (const result of results) {
            if (result.status === 'fulfilled') {
                succeeded += 1;
            } else {
                failed += 1;
                console.error('[dispatcher] check failed', { reason: result.reason?.message });
            }
        }
    }

    console.info('[dispatcher] run complete', {
        due: dueMonitors.length,
        succeeded,
        failed,
    });

    return Response.json({ checked: dueMonitors.length, succeeded, failed });
}
