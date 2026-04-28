'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const ResponseTimeChart = dynamic(() => import('@/components/ResponseTimeChart'), { ssr: false });

const INTERVAL_OPTIONS = [1, 5, 10, 30, 60];
const METHOD_OPTIONS = ['GET', 'POST', 'HEAD'];
const TIMEOUT_OPTIONS = [
    { label: '5s', value: 5000 },
    { label: '10s', value: 10000 },
    { label: '15s', value: 15000 },
    { label: '30s', value: 30000 },
];

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

function formatDuration(ms) {
    if (!ms) return '—';
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow';
const selectClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

export default function MonitorDetailPage() {
    const { id } = useParams();
    const [monitor, setMonitor]       = useState(null);
    const [checkResults, setCheckResults] = useState([]);
    const [incidents, setIncidents]   = useState([]);
    const [loading, setLoading]       = useState(true);
    const [notFound, setNotFound]     = useState(false);
    const [editing, setEditing]       = useState(false);
    const [form, setForm]             = useState(null);
    const [saveError, setSaveError]   = useState('');
    const [saving, setSaving]         = useState(false);

    useEffect(() => {
        setLoading(true);
        setMonitor(null);
        setNotFound(false);

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
                    name: mon.name, url: mon.url, method: mon.method,
                    interval: mon.interval, expectedStatusCode: mon.expectedStatusCode,
                    timeoutMs: mon.timeoutMs,
                    keywordCheck: mon.keywordCheck ?? { enabled: false, keyword: '' },
                });
                setCheckResults(Array.isArray(checks) ? checks : []);
                setIncidents(Array.isArray(incs) ? incs : []);
            }
            setLoading(false);
        }).catch(() => {
            setNotFound(true);
            setLoading(false);
        });
    }, [id]);

    function handleFormChange(e) {
        const { name, value, checked } = e.target;
        if (name === 'keywordEnabled') {
            setForm((f) => ({ ...f, keywordCheck: { ...f.keywordCheck, enabled: checked } }));
        } else if (name === 'keyword') {
            setForm((f) => ({ ...f, keywordCheck: { ...f.keywordCheck, keyword: value } }));
        } else {
            const NUMERIC_FIELDS = ['interval', 'expectedStatusCode', 'timeoutMs'];
            setForm((f) => ({ ...f, [name]: NUMERIC_FIELDS.includes(name) ? Number(value) : value }));
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
            if (updated && updated._id) {
                setMonitor(updated);
            }
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
            body: JSON.stringify({ isActive: !monitor?.isActive }),
        });
        if (res.ok) setMonitor(await res.json());
    }

    if (loading || !monitor) {
        return (
            <div className="p-8 flex items-center justify-center h-64">
                <div className="flex items-center gap-3 text-gray-400">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-sm">Loading…</span>
                </div>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="p-8 text-center py-24">
                <p className="text-gray-500 mb-2">Monitor not found.</p>
                <Link href="/dashboard/monitors" className="text-sm text-blue-600 hover:underline">
                    ← Back to monitors
                </Link>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8 flex-wrap">
                <Link href="/dashboard/monitors" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                    ← Back
                </Link>
                <span className="text-gray-300">/</span>
                <h1 className="text-2xl font-bold text-gray-900 flex-1 min-w-0 truncate">{monitor.name}</h1>
                <StatusPill status={monitor.status} />
                <button onClick={handleToggleActive}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        monitor.isActive
                            ? 'border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                            : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                    }`}>
                    {monitor.isActive ? 'Pause' : 'Resume'}
                </button>
                <button onClick={() => { setEditing(!editing); setSaveError(''); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors">
                    {editing ? 'Cancel' : 'Edit'}
                </button>
            </div>

            {/* Monitor info */}
            {!editing && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5 grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                    {[
                        ['URL', <span className="font-mono text-gray-800 break-all">{monitor.url}</span>],
                        ['Method', monitor.method],
                        ['Interval', `${monitor.interval}m`],
                        ['Timeout', `${monitor.timeoutMs / 1000}s`],
                        ['Expected Status', monitor.expectedStatusCode],
                        ['Last Checked', monitor.lastCheckedAt ? new Date(monitor.lastCheckedAt).toLocaleString() : 'Never'],
                    ].map(([label, value]) => (
                        <div key={label}>
                            <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold block mb-0.5">{label}</span>
                            <span className="text-gray-900">{value}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit form */}
            {editing && (
                <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-5">
                    <div className="p-6 space-y-4">
                        {saveError && (
                            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                <span>⚠ {saveError}</span>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Name</label>
                                <input type="text" name="name" value={form.name} onChange={handleFormChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>URL</label>
                                <input type="url" name="url" value={form.url} onChange={handleFormChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Method</label>
                                <select name="method" value={form.method} onChange={handleFormChange} className={selectClass}>
                                    {METHOD_OPTIONS.map((m) => <option key={m}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Interval</label>
                                <select name="interval" value={form.interval} onChange={handleFormChange} className={selectClass}>
                                    {INTERVAL_OPTIONS.map((i) => (
                                        <option key={i} value={i}>{i} minute{i > 1 ? 's' : ''}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Expected Status</label>
                                <input type="number" name="expectedStatusCode" value={form.expectedStatusCode}
                                    onChange={handleFormChange} min="100" max="599" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Timeout</label>
                                <select name="timeoutMs" value={form.timeoutMs} onChange={handleFormChange} className={selectClass}>
                                    {TIMEOUT_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" name="keywordEnabled" checked={form.keywordCheck.enabled}
                                    onChange={handleFormChange} className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
                                <span className="text-sm font-medium text-gray-700">Keyword check</span>
                            </label>
                            {form.keywordCheck.enabled && (
                                <input type="text" name="keyword" value={form.keywordCheck.keyword}
                                    onChange={handleFormChange} placeholder="Expected keyword in response body"
                                    className={`${inputClass} mt-2`} />
                            )}
                        </div>
                    </div>
                    <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex gap-3">
                        <button type="submit" disabled={saving}
                            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
                            {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                        <button type="button" onClick={() => setEditing(false)}
                            className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-200 hover:bg-white transition-all">
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Response time chart */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-1">Response Time</h2>
                <p className="text-xs text-gray-400 mb-4">Last 100 checks</p>
                <ResponseTimeChart data={checkResults} />
            </div>

            {/* Incidents */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Incident History</h2>
                {incidents.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-sm text-gray-400">No incidents recorded — great uptime! 🎉</p>
                    </div>
                ) : (
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-left border-b border-gray-100">
                                <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Started</th>
                                <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Duration</th>
                                <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Cause</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {incidents.map((inc) => (
                                <tr key={inc._id}>
                                    <td className="py-3 text-gray-700">{new Date(inc.startedAt).toLocaleString()}</td>
                                    <td className="py-3 text-gray-700">{formatDuration(inc.durationMs)}</td>
                                    <td className="py-3">
                                        {inc.resolvedAt
                                            ? <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Resolved</span>
                                            : <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">Ongoing</span>}
                                    </td>
                                    <td className="py-3 text-gray-400 text-xs font-mono">{inc.cause}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
