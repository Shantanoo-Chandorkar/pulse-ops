import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardNav from '@/components/DashboardNav';

export default async function DashboardLayout({ children }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect('/api/auth/signin');
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            <aside className="w-64 shrink-0 bg-slate-900 flex flex-col sticky top-0 h-screen overflow-y-auto">
                <div className="px-5 py-5 border-b border-slate-700">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs font-bold">U</span>
                        </div>
                        <span className="text-white font-semibold text-sm">PulseOps</span>
                    </div>
                </div>

                <DashboardNav
                    email={session.user.email}
                    statusPageSlug={session.user.statusPageSlug ?? null}
                />
            </aside>

            <main className="flex-1 min-w-0 overflow-auto">
                {children}
            </main>
        </div>
    );
}
