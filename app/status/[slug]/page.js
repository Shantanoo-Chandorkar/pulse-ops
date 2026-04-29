import { connectDB } from '@/lib/mongoose';
import User from '@/models/User';
import Monitor from '@/models/Monitor';
import Incident from '@/models/Incident';
import { notFound } from 'next/navigation';

/**
 * Banner showing overall system health.
 */
function OverallBanner({ hasDown }) {
    if (hasDown) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                <span className="text-red-800 font-medium">Partial outage</span>
            </div>
        );
    }
    return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
            <span className="text-green-800 font-medium">All systems operational</span>
        </div>
    );
}

function formatDuration(ms) {
    if (!ms) return '';
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

/**
 * Public status page, unauthenticated, read-only.
 * Exposes monitor names and statuses only, not URLs, methods, or any config.
 *
 * @param {{ params: { slug: string } }} props
 */
export default async function StatusPage({ params }) {
    const { slug } = await params;

    await connectDB();

    const user = await User.findOne({ statusPageSlug: slug }).lean();
    if (!user) notFound();

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [monitors, openIncidents, recentIncidents] = await Promise.all([
        Monitor.find({ userId: user._id, isActive: true }).lean(),
        Incident.find({ userId: user._id, resolvedAt: null }).lean(),
        Incident.find({
            userId: user._id,
            resolvedAt: { $ne: null, $gte: sevenDaysAgo },
        })
            .sort({ startedAt: -1 })
            .lean(),
    ]);

    const hasDown = monitors.some((m) => m.status === 'down');

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-1">System Status</h1>
                <p className="text-gray-400 text-sm mb-8">
                    Last updated: {new Date().toLocaleString()}
                </p>

                <OverallBanner hasDown={hasDown} />

                {/* Monitor status list */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mb-6">
                    {monitors.length === 0 ? (
                        <p className="p-6 text-sm text-gray-500">No monitors to display.</p>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {monitors.map((monitor) => {
                                const isDown = monitor.status === 'down';
                                const openInc = openIncidents.find(
                                    (i) => i.monitorId.toString() === monitor._id.toString()
                                );
                                return (
                                    <li
                                        key={monitor._id.toString()}
                                        className="flex items-center justify-between px-6 py-4"
                                    >
                                        <span className="font-medium text-gray-900">{monitor.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`w-2.5 h-2.5 rounded-full ${isDown ? 'bg-red-500' : 'bg-green-500'}`}
                                            />
                                            <span className={`text-sm ${isDown ? 'text-red-700' : 'text-green-700'}`}>
                                                {isDown
                                                    ? `Down since ${openInc ? new Date(openInc.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'unknown'} (UTC)`
                                                    : 'Operational'}
                                            </span>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Recent resolved incidents (last 7 days) */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <h2 className="text-sm font-semibold text-gray-700 mb-4">
                        Recent Incidents (last 7 days)
                    </h2>
                    {recentIncidents.length === 0 ? (
                        <p className="text-sm text-gray-400">No incidents in the last 7 days.</p>
                    ) : (
                        <ul className="space-y-3">
                            {recentIncidents.map((inc) => {
                                const mon = monitors.find(
                                    (m) => m._id.toString() === inc.monitorId.toString()
                                );
                                return (
                                    <li key={inc._id.toString()} className="text-sm text-gray-700">
                                        <span className="font-medium">{mon?.name ?? 'Unknown monitor'}</span>
                                        {', '}
                                        <span className="text-green-600">Resolved</span>
                                        {', '}
                                        {new Date(inc.startedAt).toLocaleDateString()}{' '}
                                        {new Date(inc.startedAt).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                        {inc.durationMs && ` (${formatDuration(inc.durationMs)})`}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
