import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SignOutButton from '@/components/SignOutButton';

/**
 * Root layout for all /dashboard/* routes.
 * Redirects unauthenticated users to the NextAuth sign-in page.
 * Renders a fixed sidebar with nav links and a main content area.
 */
export default async function DashboardLayout({ children }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect('/api/auth/signin');
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Fixed sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col fixed inset-y-0 left-0 z-10">
                <div className="p-6 border-b border-slate-700">
                    <h1 className="text-lg font-bold text-white">Uptime Monitor</h1>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <Link
                        href="/dashboard"
                        className="flex items-center px-3 py-2 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-sm"
                    >
                        Overview
                    </Link>
                    <Link
                        href="/dashboard/monitors"
                        className="flex items-center px-3 py-2 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-sm"
                    >
                        Monitors
                    </Link>
                    <Link
                        href="/dashboard/incidents"
                        className="flex items-center px-3 py-2 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-sm"
                    >
                        Incidents
                    </Link>
                    <Link
                        href="/dashboard/settings"
                        className="flex items-center px-3 py-2 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-sm"
                    >
                        Settings
                    </Link>
                </nav>

                <div className="p-4 border-t border-slate-700 space-y-2">
                    <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
                    {session.user.statusPageSlug && (
                        <a
                            href={`/status/${session.user.statusPageSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            Your status page →
                        </a>
                    )}
                    <SignOutButton />
                </div>
            </aside>

            {/* Main content — offset by sidebar width */}
            <main className="ml-64 flex-1 p-8 min-w-0">
                {children}
            </main>
        </div>
    );
}
