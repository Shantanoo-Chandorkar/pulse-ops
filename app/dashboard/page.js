import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import Monitor from '@/models/Monitor';
import Link from 'next/link';

/**
 * Returns a human-readable relative time string from a date.
 *
 * @param {Date|string|null} date
 * @returns {string}
 */
function formatRelativeTime(date) {
    if (!date) return 'Never';
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

function StatusBadge({ status }) {
    const styles = {
        up: 'bg-green-100 text-green-800',
        down: 'bg-red-100 text-red-800',
        paused: 'bg-yellow-100 text-yellow-800',
        unknown: 'bg-gray-100 text-gray-600',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? styles.unknown}`}>
            {status}
        </span>
    );
}

/**
 * Dashboard overview — fetches monitors directly via Mongoose (same process,
 * no HTTP round-trip needed) and renders summary cards.
 */
export default async function DashboardOverviewPage() {
    const session = await getServerSession(authOptions);
    await connectDB();

    const monitors = await Monitor.find({ userId: session.user.id })
        .sort({ createdAt: -1 })
        .lean();

    const upCount = monitors.filter((m) => m.status === 'up').length;
    const downCount = monitors.filter((m) => m.status === 'down').length;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
                <Link
                    href="/dashboard/monitors/new"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                    + Add Monitor
                </Link>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{monitors.length}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                    <p className="text-sm text-gray-500">Operational</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{upCount}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                    <p className="text-sm text-gray-500">Down</p>
                    <p className="text-3xl font-bold text-red-600 mt-1">{downCount}</p>
                </div>
            </div>

            {monitors.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 border border-gray-100 text-center">
                    <p className="text-gray-500 mb-4">No monitors yet — add your first one</p>
                    <Link
                        href="/dashboard/monitors/new"
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                        Add Monitor
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {monitors.map((monitor) => (
                        <Link key={monitor._id.toString()} href={`/dashboard/monitors/${monitor._id}`}>
                            <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-medium text-gray-900 truncate flex-1 mr-2">
                                        {monitor.name}
                                    </h3>
                                    <StatusBadge status={monitor.status} />
                                </div>
                                <p className="text-sm text-gray-500 truncate mb-3">{monitor.url}</p>
                                <p className="text-xs text-gray-400">
                                    Last checked {formatRelativeTime(monitor.lastCheckedAt)}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
