'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

function formatDuration(ms) {
    if (!ms) return 'Ongoing';
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

export default function IncidentsPage() {
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/incidents')
            .then((r) => r.json())
            .then((data) => {
                setIncidents(Array.isArray(data) ? data : []);
                setLoading(false);
            });
    }, []);

    async function handleResolve(id) {
        if (!confirm('Manually resolve this incident?')) return;
        const res = await fetch('/api/incidents', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        if (res.ok) {
            const resolved = await res.json();
            setIncidents((prev) =>
                prev.map((inc) => (inc._id === id ? resolved : inc))
            );
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-gray-500 text-sm">Loading incidents...</p>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-8">Incidents</h1>

            {incidents.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 border border-gray-100 text-center">
                    <p className="text-gray-500">No incidents recorded.</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cause</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {incidents.map((inc) => (
                                <tr key={inc._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {new Date(inc.startedAt).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {formatDuration(inc.durationMs)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {inc.resolvedAt
                                            ? <span className="text-green-600 font-medium">Resolved</span>
                                            : <span className="text-red-600 font-medium">Ongoing</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{inc.cause}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <Link
                                            href={`/dashboard/monitors/${inc.monitorId}`}
                                            className="text-blue-600 hover:text-blue-700 mr-4"
                                        >
                                            Monitor
                                        </Link>
                                        {!inc.resolvedAt && (
                                            <button
                                                onClick={() => handleResolve(inc._id)}
                                                className="text-gray-500 hover:text-gray-700"
                                            >
                                                Resolve
                                            </button>
                                        )}
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
