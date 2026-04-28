'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

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

export default function MonitorsPage() {
    const [monitors, setMonitors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/monitors')
            .then((r) => r.json())
            .then((data) => {
                setMonitors(data);
                setLoading(false);
            });
    }, []);

    async function handleDelete(id, name) {
        if (!confirm(`Delete monitor "${name}"? This cannot be undone.`)) return;
        const res = await fetch(`/api/monitors/${id}`, { method: 'DELETE' });
        if (res.ok) {
            setMonitors((prev) => prev.filter((m) => m._id !== id));
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-gray-500 text-sm">Loading monitors...</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Monitors</h1>
                <Link
                    href="/dashboard/monitors/new"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                    + New Monitor
                </Link>
            </div>

            {monitors.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 border border-gray-100 text-center">
                    <p className="text-gray-500 mb-4">No monitors yet.</p>
                    <Link
                        href="/dashboard/monitors/new"
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                        Add your first monitor
                    </Link>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interval</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Checked</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {monitors.map((monitor) => (
                                <tr key={monitor._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                        {monitor.name}
                                    </td>
                                    <td className="px-6 py-4 max-w-xs">
                                        <span className="text-sm text-gray-500 truncate block">{monitor.url}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge status={monitor.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {monitor.interval}m
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {monitor.lastCheckedAt
                                            ? new Date(monitor.lastCheckedAt).toLocaleString()
                                            : 'Never'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <Link
                                            href={`/dashboard/monitors/${monitor._id}`}
                                            className="text-blue-600 hover:text-blue-700 mr-4"
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(monitor._id, monitor.name)}
                                            className="text-red-500 hover:text-red-700"
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
