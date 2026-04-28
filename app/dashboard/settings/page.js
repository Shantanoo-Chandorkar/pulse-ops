'use client';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
    const [monitors, setMonitors] = useState([]);
    const [selectedMonitorId, setSelectedMonitorId] = useState('');
    const [alerts, setAlerts] = useState([]);
    const [tab, setTab] = useState('email'); // 'email' | 'webhook'
    const [emailInput, setEmailInput] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [webhookHeaders, setWebhookHeaders] = useState([{ key: '', value: '' }]);
    const [showHeaders, setShowHeaders] = useState(false);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch('/api/monitors')
            .then((r) => r.json())
            .then((data) => {
                if (Array.isArray(data) && data.length > 0) {
                    setMonitors(data);
                    setSelectedMonitorId(data[0]._id);
                }
            });
    }, []);

    useEffect(() => {
        if (!selectedMonitorId) return;
        fetch(`/api/alerts?monitorId=${selectedMonitorId}`)
            .then((r) => r.json())
            .then((data) => setAlerts(Array.isArray(data) ? data : []));
    }, [selectedMonitorId]);

    async function handleAddAlert(e) {
        e.preventDefault();
        setError('');

        let config;
        if (tab === 'email') {
            if (!emailInput || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
                setError('Valid email address required');
                return;
            }
            config = { email: emailInput };
        } else {
            if (!webhookUrl.startsWith('https://')) {
                setError('Webhook URL must start with https://');
                return;
            }
            config = { url: webhookUrl };
            const validHeaders = webhookHeaders.filter((h) => h.key.trim() && h.value.trim());
            if (validHeaders.length > 0) {
                config.headers = Object.fromEntries(validHeaders.map((h) => [h.key.trim(), h.value.trim()]));
            }
        }

        setSaving(true);
        const res = await fetch('/api/alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ monitorId: selectedMonitorId, channel: tab, config }),
        });

        if (res.ok) {
            const newAlert = await res.json();
            setAlerts((prev) => [...prev, newAlert]);
            setEmailInput('');
            setWebhookUrl('');
            setWebhookHeaders([{ key: '', value: '' }]);
            setShowHeaders(false);
        } else {
            const data = await res.json();
            setError(data.error || 'Failed to add alert');
        }
        setSaving(false);
    }

    async function handleRemoveAlert(id) {
        if (!confirm('Remove this alert channel?')) return;
        const res = await fetch('/api/alerts', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        if (res.ok) {
            setAlerts((prev) => prev.filter((a) => a._id !== id));
        }
    }

    function updateHeader(index, field, value) {
        const updated = [...webhookHeaders];
        updated[index] = { ...updated[index], [field]: value };
        setWebhookHeaders(updated);
    }

    return (
        <div className="max-w-2xl">
            <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-6">Alert Channels</h2>

                {monitors.length === 0 ? (
                    <p className="text-sm text-gray-500">No monitors yet. Add a monitor first.</p>
                ) : (
                    <>
                        {/* Monitor selector */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Monitor</label>
                            <select
                                value={selectedMonitorId}
                                onChange={(e) => setSelectedMonitorId(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {monitors.map((m) => (
                                    <option key={m._id} value={m._id}>{m.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Active alerts list */}
                        <div className="mb-6">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Active alerts</h3>
                            {alerts.length === 0 ? (
                                <p className="text-sm text-gray-400">No alert channels configured for this monitor.</p>
                            ) : (
                                <ul className="divide-y divide-gray-100 border border-gray-200 rounded-md">
                                    {alerts.map((alert) => (
                                        <li key={alert._id} className="flex items-center justify-between px-4 py-3">
                                            <div className="min-w-0 flex items-center gap-2">
                                                <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded shrink-0">
                                                    {alert.channel}
                                                </span>
                                                <span className="text-sm text-gray-700 truncate">
                                                    {alert.channel === 'email' ? alert.config.email : alert.config.url}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveAlert(alert._id)}
                                                className="text-red-500 hover:text-red-700 text-sm ml-4 shrink-0"
                                            >
                                                Remove
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Add alert form */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-3">Add alert</h3>

                            {/* Channel tab selector */}
                            <div className="flex gap-2 mb-4">
                                {['email', 'webhook'].map((ch) => (
                                    <button
                                        key={ch}
                                        type="button"
                                        onClick={() => { setTab(ch); setError(''); }}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors capitalize ${
                                            tab === ch
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        {ch}
                                    </button>
                                ))}
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-4">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleAddAlert} className="space-y-3">
                                {tab === 'email' ? (
                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            value={emailInput}
                                            onChange={(e) => setEmailInput(e.target.value)}
                                            placeholder="Email address"
                                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {saving ? 'Adding...' : 'Add'}
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex gap-2">
                                            <input
                                                type="url"
                                                value={webhookUrl}
                                                onChange={(e) => setWebhookUrl(e.target.value)}
                                                placeholder="https://hooks.example.com/..."
                                                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <button
                                                type="submit"
                                                disabled={saving}
                                                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                {saving ? 'Adding...' : 'Add'}
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowHeaders(!showHeaders)}
                                            className="text-sm text-blue-600 hover:text-blue-700"
                                        >
                                            {showHeaders ? '− Hide custom headers' : '+ Custom headers'}
                                        </button>
                                        {showHeaders && (
                                            <div className="space-y-2">
                                                {webhookHeaders.map((header, i) => (
                                                    <div key={i} className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={header.key}
                                                            onChange={(e) => updateHeader(i, 'key', e.target.value)}
                                                            placeholder="Header name"
                                                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={header.value}
                                                            onChange={(e) => updateHeader(i, 'value', e.target.value)}
                                                            placeholder="Value"
                                                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => setWebhookHeaders((prev) => [...prev, { key: '', value: '' }])}
                                                    className="text-sm text-gray-500 hover:text-gray-700"
                                                >
                                                    + Add header
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </form>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
