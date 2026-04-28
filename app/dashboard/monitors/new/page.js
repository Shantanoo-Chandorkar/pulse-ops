'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const INTERVAL_OPTIONS = [1, 5, 10, 30, 60];
const METHOD_OPTIONS = ['GET', 'POST', 'HEAD'];
const TIMEOUT_OPTIONS = [
    { label: '5s', value: 5000 },
    { label: '10s', value: 10000 },
    { label: '15s', value: 15000 },
    { label: '30s', value: 30000 },
];

const INITIAL_FORM = {
    name: '',
    url: '',
    method: 'GET',
    interval: 5,
    expectedStatusCode: 200,
    timeoutMs: 10000,
    keywordCheck: { enabled: false, keyword: '' },
};

const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow';
const selectClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

export default function NewMonitorPage() {
    const router = useRouter();
    const [form, setForm] = useState(INITIAL_FORM);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    function handleChange(e) {
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

    function validate() {
        if (!form.name.trim()) return 'Name is required';
        try { new URL(form.url); } catch { return 'URL must be a valid URL'; }
        if (!form.url.startsWith('http://') && !form.url.startsWith('https://')) {
            return 'URL must start with http:// or https://';
        }
        return null;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const validationError = validate();
        if (validationError) { setError(validationError); return; }

        setSaving(true);
        setError('');

        const res = await fetch('/api/monitors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });

        if (res.ok) {
            router.push('/dashboard/monitors');
        } else {
            const data = await res.json();
            setError(data.error || 'Failed to create monitor');
            setSaving(false);
        }
    }

    return (
        <div className="p-8 max-w-2xl">
            <div className="flex items-center gap-3 mb-8">
                <Link href="/dashboard/monitors" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                    ← Back
                </Link>
                <span className="text-gray-300">/</span>
                <h1 className="text-2xl font-bold text-gray-900">New Monitor</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Form sections */}
                <div className="p-6 space-y-5">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Basic Info</h2>

                    {error && (
                        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            <span className="mt-0.5">⚠</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <div>
                        <label className={labelClass}>Monitor Name <span className="text-red-500">*</span></label>
                        <input type="text" name="name" value={form.name} onChange={handleChange} required
                            placeholder="My Website" className={inputClass} />
                    </div>

                    <div>
                        <label className={labelClass}>URL <span className="text-red-500">*</span></label>
                        <input type="url" name="url" value={form.url} onChange={handleChange} required
                            placeholder="https://example.com" className={inputClass} />
                    </div>
                </div>

                <div className="border-t border-gray-100 p-6 space-y-5">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Check Settings</h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Method</label>
                            <select name="method" value={form.method} onChange={handleChange} className={selectClass}>
                                {METHOD_OPTIONS.map((m) => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Check Interval</label>
                            <select name="interval" value={form.interval} onChange={handleChange} className={selectClass}>
                                {INTERVAL_OPTIONS.map((i) => (
                                    <option key={i} value={i}>{i} minute{i > 1 ? 's' : ''}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Expected Status Code</label>
                            <input type="number" name="expectedStatusCode" value={form.expectedStatusCode}
                                onChange={handleChange} min="100" max="599" className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Timeout</label>
                            <select name="timeoutMs" value={form.timeoutMs} onChange={handleChange} className={selectClass}>
                                {TIMEOUT_OPTIONS.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-100 p-6 space-y-4">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Keyword Check</h2>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" name="keywordEnabled" checked={form.keywordCheck.enabled}
                            onChange={handleChange}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                        <span className="text-sm font-medium text-gray-700">Check for keyword in response body</span>
                    </label>

                    {form.keywordCheck.enabled && (
                        <input type="text" name="keyword" value={form.keywordCheck.keyword} onChange={handleChange}
                            placeholder="Expected keyword…" className={inputClass} />
                    )}
                </div>

                <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex items-center gap-3">
                    <button type="submit" disabled={saving}
                        className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                        {saving ? 'Creating…' : 'Create Monitor'}
                    </button>
                    <Link href="/dashboard/monitors"
                        className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-white border border-transparent hover:border-gray-200 transition-all">
                        Cancel
                    </Link>
                </div>
            </form>
        </div>
    );
}
