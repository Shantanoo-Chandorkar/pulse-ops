'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const STATUS_CONFIG = {
    up:      { dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50',  label: 'Up' },
    down:    { dot: 'bg-red-500',   text: 'text-red-700',   bg: 'bg-red-50',    label: 'Down' },
    paused:  { dot: 'bg-yellow-400',text: 'text-yellow-700',bg: 'bg-yellow-50', label: 'Paused' },
    unknown: { dot: 'bg-gray-400',  text: 'text-gray-500',  bg: 'bg-gray-100',  label: 'Unknown' },
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

export default function MonitorsPage() {
    const [monitors, setMonitors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/monitors')
            .then((r) => r.json())
            .then((data) => {
                setMonitors(Array.isArray(data) ? data : []);
                setLoading(false);
            });
    }, []);

    async function handleDelete(id, name) {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        const res = await fetch(`/api/monitors/${id}`, { method: 'DELETE' });
        if (res.ok) setMonitors((prev) => prev.filter((m) => m._id !== id));
    }

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center h-64">
                <div className="flex items-center gap-3 text-gray-400">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-sm">Loading monitors…</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Monitors</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{monitors.length} monitor{monitors.length !== 1 ? 's' : ''}</p>
                </div>
                <Link
                    href="/dashboard/monitors/new"
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <span className="text-lg leading-none">+</span> New Monitor
                </Link>
            </div>

            {monitors.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-16 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">📡</span>
                    </div>
                    <h3 className="text-gray-900 font-semibold mb-1">No monitors yet</h3>
                    <p className="text-sm text-gray-500 mb-6">Add your first monitor to start tracking uptime.</p>
                    <Link href="/dashboard/monitors/new" className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                        Add Monitor
                    </Link>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">URL</th>
                                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Interval</th>
                                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Checked</th>
                                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {monitors.map((monitor) => (
                                <tr key={monitor._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="font-semibold text-gray-900 text-sm">{monitor.name}</span>
                                    </td>
                                    <td className="px-6 py-4 max-w-xs">
                                        <span className="text-xs text-gray-400 font-mono truncate block">{monitor.url}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusPill status={monitor.status} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-gray-600">{monitor.interval}m</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-gray-500">
                                            {monitor.lastCheckedAt ? new Date(monitor.lastCheckedAt).toLocaleString() : 'Never'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/dashboard/monitors/${monitor._id}`}
                                            className="text-sm font-medium text-blue-600 hover:text-blue-700 mr-4"
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(monitor._id, monitor.name)}
                                            className="text-sm font-medium text-red-500 hover:text-red-600"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
