'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamic import avoids SSR issues — Recharts relies on browser APIs
const ResponseTimeChart = dynamic(() => import('@/components/ResponseTimeChart'), { ssr: false });

const INTERVAL_OPTIONS = [1, 5, 10, 30, 60];
const METHOD_OPTIONS = ['GET', 'POST', 'HEAD'];
const TIMEOUT_OPTIONS = [
    { label: '5s', value: 5000 },
    { label: '10s', value: 10000 },
    { label: '15s', value: 15000 },
    { label: '30s', value: 30000 },
];

function StatusBadge({ status }) {
    const styles = {
        up: 'bg-green-100 text-green-800',
        down: 'bg-red-100 text-red-800',
        paused: 'bg-yellow-100 text-yellow-800',
        unknown: 'bg-gray-100 text-gray-600',
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? styles.unknown}`}>
            {status}
        </span>
    );
}

function formatDuration(ms) {
    if (!ms) return '—';
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

export default function MonitorDetailPage() {
    const { id } = useParams();
    const [monitor, setMonitor] = useState(null);
    const [checkResults, setCheckResults] = useState([]);
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    // Edit form state
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState(null);
    const [saveError, setSaveError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        Promise.all([
            fetch(`/api/monitors/${id}`).then((r) => r.json()),
            fetch(`/api/checks/${id}`).then((r) => r.json()),
            fetch(`/api/incidents?monitorId=${id}`).then((r) => r.json()),
        ]).then(([mon, checks, incs]) => {
            if (mon.error) {
                setNotFound(true);
            } else {
                setMonitor(mon);
                setForm({
                    name: mon.name,
                    url: mon.url,
                    method: mon.method,
                    interval: mon.interval,
                    expectedStatusCode: mon.expectedStatusCode,
                    timeoutMs: mon.timeoutMs,
                    keywordCheck: mon.keywordCheck ?? { enabled: false, keyword: '' },
                });
                setCheckResults(Array.isArray(checks) ? checks : []);
                setIncidents(Array.isArray(incs) ? incs : []);
            }
            setLoading(false);
        });
    }, [id]);

    function handleFormChange(e) {
        const { name, value, type, checked } = e.target;
        if (name === 'keywordEnabled') {
            setForm((f) => ({ ...f, keywordCheck: { ...f.keywordCheck, enabled: checked } }));
        } else if (name === 'keyword') {
            setForm((f) => ({ ...f, keywordCheck: { ...f.keywordCheck, keyword: value } }));
        } else {
            setForm((f) => ({ ...f, [name]: type === 'number' ? Number(value) : value }));
        }
    }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        setSaveError('');

        const res = await fetch(`/api/monitors/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });

        if (res.ok) {
            const updated = await res.json();
            setMonitor(updated);
            setEditing(false);
        } else {
            const data = await res.json();
            setSaveError(data.error || 'Failed to save changes');
        }
        setSaving(false);
    }

    async function handleToggleActive() {
        const res = await fetch(`/api/monitors/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: !monitor.isActive }),
        });
        if (res.ok) {
            const updated = await res.json();
            setMonitor(updated);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-gray-500 text-sm">Loading...</p>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Monitor not found.</p>
                <Link href="/dashboard/monitors" className="text-blue-600 hover:underline mt-2 inline-block text-sm">
                    ← Back to monitors
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8 flex-wrap">
                <Link href="/dashboard/monitors" className="text-gray-500 hover:text-gray-700 text-sm">
                    ← Back
                </Link>
                <h1 className="text-2xl font-bold text-gray-900 flex-1 min-w-0 truncate">
                    {monitor.name}
                </h1>
                <StatusBadge status={monitor.status} />
                <button
                    onClick={handleToggleActive}
                    className={`px-3 py-1 rounded-md text-sm font-medium border transition-colors ${
                        monitor.isActive
                            ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                            : 'border-green-300 text-green-700 hover:bg-green-50'
                    }`}
                >
                    {monitor.isActive ? 'Pause' : 'Resume'}
                </button>
                <button
                    onClick={() => { setEditing(!editing); setSaveError(''); }}
                    className="px-3 py-1 rounded-md text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                    {editing ? 'Cancel' : 'Edit'}
                </button>
            </div>

            {/* Monitor info (read-only view) */}
            {!editing && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-6 grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500">URL</span><span className="ml-2 font-mono text-gray-900 break-all">{monitor.url}</span></div>
                    <div><span className="text-gray-500">Method</span><span className="ml-2">{monitor.method}</span></div>
                    <div><span className="text-gray-500">Interval</span><span className="ml-2">{monitor.interval}m</span></div>
                    <div><span className="text-gray-500">Timeout</span><span className="ml-2">{monitor.timeoutMs / 1000}s</span></div>
                    <div><span className="text-gray-500">Expected Status</span><span className="ml-2">{monitor.expectedStatusCode}</span></div>
                    <div>
                        <span className="text-gray-500">Last Checked</span>
                        <span className="ml-2">{monitor.lastCheckedAt ? new Date(monitor.lastCheckedAt).toLocaleString() : 'Never'}</span>
                    </div>
                </div>
            )}

            {/* Inline edit form */}
            {editing && (
                <form onSubmit={handleSave} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6 space-y-4">
                    {saveError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                            {saveError}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input type="text" name="name" value={form.name} onChange={handleFormChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                            <input type="url" name="url" value={form.url} onChange={handleFormChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                            <select name="method" value={form.method} onChange={handleFormChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                {METHOD_OPTIONS.map((m) => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Interval</label>
                            <select name="interval" value={form.interval} onChange={handleFormChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                {INTERVAL_OPTIONS.map((i) => (
                                    <option key={i} value={i}>{i} minute{i > 1 ? 's' : ''}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Status</label>
                            <input type="number" name="expectedStatusCode" value={form.expectedStatusCode} onChange={handleFormChange}
                                min="100" max="599"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Timeout</label>
                            <select name="timeoutMs" value={form.timeoutMs} onChange={handleFormChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                {TIMEOUT_OPTIONS.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <input type="checkbox" name="keywordEnabled" id="editKeywordEnabled"
                                checked={form.keywordCheck.enabled} onChange={handleFormChange}
                                className="rounded border-gray-300 text-blue-600" />
                            <label htmlFor="editKeywordEnabled" className="text-sm font-medium text-gray-700">Keyword check</label>
                        </div>
                        {form.keywordCheck.enabled && (
                            <input type="text" name="keyword" value={form.keywordCheck.keyword} onChange={handleFormChange}
                                placeholder="Expected keyword in response body"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        )}
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button type="submit" disabled={saving}
                            className="bg-blue-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button type="button" onClick={() => setEditing(false)}
                            className="px-5 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Response time chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Response Time (last 100 checks)</h2>
                <ResponseTimeChart data={checkResults} />
            </div>

            {/* Incident history */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Incident History</h2>
                {incidents.length === 0 ? (
                    <p className="text-sm text-gray-400">No incidents recorded.</p>
                ) : (
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                                <th className="pb-2 font-medium">Started</th>
                                <th className="pb-2 font-medium">Duration</th>
                                <th className="pb-2 font-medium">Status</th>
                                <th className="pb-2 font-medium">Cause</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {incidents.map((inc) => (
                                <tr key={inc._id}>
                                    <td className="py-2 text-gray-700">{new Date(inc.startedAt).toLocaleString()}</td>
                                    <td className="py-2 text-gray-700">{formatDuration(inc.durationMs)}</td>
                                    <td className="py-2">
                                        {inc.resolvedAt
                                            ? <span className="text-green-600 font-medium">Resolved</span>
                                            : <span className="text-red-600 font-medium">Ongoing</span>}
                                    </td>
                                    <td className="py-2 text-gray-500">{inc.cause}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
