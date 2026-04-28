'use client';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

/**
 * Renders a response time line chart for a monitor's check results.
 * Must be a client component, Recharts uses browser APIs (ResizeObserver, canvas).
 *
 * @param {{ data: Array<{ timestamp: string, responseTimeMs: number, status: string }> }} props
 */
export default function ResponseTimeChart({ data }) {
    // Results arrive newest-first from the API, reverse so the chart reads left-to-right
    const chartData = [...data].reverse().map((r) => ({
        time: new Date(r.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        }),
        responseTimeMs: r.responseTimeMs,
        status: r.status,
    }));

    if (chartData.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                No check data yet
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} unit="ms" width={60} />
                <Tooltip
                    formatter={(value) => [`${value}ms`, 'Response Time']}
                    contentStyle={{ fontSize: 12, borderRadius: 6 }}
                />
                <Line
                    type="monotone"
                    dataKey="responseTimeMs"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
