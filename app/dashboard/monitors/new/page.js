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

export default function NewMonitorPage() {
    const router = useRouter();
    const [form, setForm] = useState(INITIAL_FORM);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    function handleChange(e) {
        const { name, value, type, checked } = e.target;
        if (name === 'keywordEnabled') {
            setForm((f) => ({ ...f, keywordCheck: { ...f.keywordCheck, enabled: checked } }));
        } else if (name === 'keyword') {
            setForm((f) => ({ ...f, keywordCheck: { ...f.keywordCheck, keyword: value } }));
        } else {
            setForm((f) => ({ ...f, [name]: type === 'number' ? Number(value) : value }));
        }
    }

    function validate() {
        if (!form.name.trim()) return 'Name is required';
        try {
            new URL(form.url);
        } catch {
            return 'URL must be a valid URL';
        }
        if (!form.url.startsWith('http://') && !form.url.startsWith('https://')) {
            return 'URL must start with http:// or https://';
        }
        return null;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

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
        <div className="max-w-2xl">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/monitors" className="text-gray-500 hover:text-gray-700 text-sm">
                    ← Back
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">New Monitor</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-5">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        placeholder="My Website"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        URL <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="url"
                        name="url"
                        value={form.url}
                        onChange={handleChange}
                        required
                        placeholder="https://example.com"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                        <select
                            name="method"
                            value={form.method}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {METHOD_OPTIONS.map((m) => <option key={m}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Check Interval</label>
                        <select
                            name="interval"
                            value={form.interval}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {INTERVAL_OPTIONS.map((i) => (
                                <option key={i} value={i}>{i} minute{i > 1 ? 's' : ''}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expected Status Code</label>
                        <input
                            type="number"
                            name="expectedStatusCode"
                            value={form.expectedStatusCode}
                            onChange={handleChange}
                            min="100"
                            max="599"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Timeout</label>
                        <select
                            name="timeoutMs"
                            value={form.timeoutMs}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {TIMEOUT_OPTIONS.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <input
                            type="checkbox"
                            name="keywordEnabled"
                            id="keywordEnabled"
                            checked={form.keywordCheck.enabled}
                            onChange={handleChange}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="keywordEnabled" className="text-sm font-medium text-gray-700">
                            Keyword check
                        </label>
                    </div>
                    {form.keywordCheck.enabled && (
                        <input
                            type="text"
                            name="keyword"
                            value={form.keywordCheck.keyword}
                            onChange={handleChange}
                            placeholder="Expected keyword in response body"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    )}
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        {saving ? 'Creating...' : 'Create Monitor'}
                    </button>
                    <Link
                        href="/dashboard/monitors"
                        className="px-6 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </Link>
                </div>
            </form>
        </div>
    );
}
