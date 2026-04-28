import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import Monitor from '@/models/Monitor';
import Link from 'next/link';

function formatRelativeTime(date) {
    if (!date) return 'Never';
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

const STATUS_CONFIG = {
    up:      { dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50',  label: 'Up' },
    down:    { dot: 'bg-red-500',   text: 'text-red-700',   bg: 'bg-red-50',    label: 'Down' },
    paused:  { dot: 'bg-yellow-400',text: 'text-yellow-700',bg: 'bg-yellow-50', label: 'Paused' },
    unknown: { dot: 'bg-gray-400',  text: 'text-gray-500',  bg: 'bg-gray-50',   label: 'Unknown' },
};

function StatusPill({ status }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.unknown;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

export default async function DashboardOverviewPage() {
    const session = await getServerSession(authOptions);
    await connectDB();

    const monitors = await Monitor.find({ userId: session.user.id })
        .sort({ createdAt: -1 })
        .lean();

    const upCount    = monitors.filter((m) => m.status === 'up').length;
    const downCount  = monitors.filter((m) => m.status === 'down').length;
    const totalCount = monitors.length;

    return (
        <div className="p-8">
            {/* Page header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {totalCount === 0 ? 'No monitors yet' : `${totalCount} monitor${totalCount > 1 ? 's' : ''} configured`}
                    </p>
                </div>
                <Link
                    href="/dashboard/monitors/new"
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <span className="text-lg leading-none">+</span> Add Monitor
                </Link>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-5 mb-8">
                {[
                    { label: 'Total Monitors', value: totalCount, color: 'text-gray-900' },
                    { label: 'Operational',    value: upCount,    color: 'text-green-600' },
                    { label: 'Down',           value: downCount,  color: 'text-red-600'   },
                ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <p className="text-sm text-gray-500 font-medium">{label}</p>
                        <p className={`text-4xl font-bold mt-2 ${color}`}>{value}</p>
                    </div>
                ))}
            </div>

            {/* Monitor cards */}
            {monitors.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-16 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">📡</span>
                    </div>
                    <h3 className="text-gray-900 font-semibold mb-1">No monitors yet</h3>
                    <p className="text-sm text-gray-500 mb-6">Add your first monitor to start tracking uptime.</p>
                    <Link
                        href="/dashboard/monitors/new"
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                    >
                        Add Monitor
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {monitors.map((monitor) => (
                        <Link key={monitor._id.toString()} href={`/dashboard/monitors/${monitor._id}`}>
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="font-semibold text-gray-900 truncate flex-1 mr-3 group-hover:text-blue-600 transition-colors">
                                        {monitor.name}
                                    </h3>
                                    <StatusPill status={monitor.status} />
                                </div>
                                <p className="text-xs text-gray-400 truncate mb-1 font-mono">{monitor.url}</p>
                                <p className="text-xs text-gray-400 mt-3">
                                    Checked {formatRelativeTime(monitor.lastCheckedAt)}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
