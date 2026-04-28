'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

const NAV_LINKS = [
    { href: '/dashboard', label: 'Overview' },
    { href: '/dashboard/monitors', label: 'Monitors' },
    { href: '/dashboard/incidents', label: 'Incidents' },
    { href: '/dashboard/settings', label: 'Settings' },
];

/**
 * Client component, needs usePathname for active link highlighting
 * and signOut for the sign-out button.
 *
 * @param {{ email: string, statusPageSlug: string|null }} props
 */
export default function DashboardNav({ email, statusPageSlug }) {
    const pathname = usePathname();

    function isActive(href) {
        if (href === '/dashboard') return pathname === '/dashboard';
        return pathname.startsWith(href);
    }

    return (
        <>
            <nav className="flex-1 px-3 py-4 space-y-0.5">
                {NAV_LINKS.map(({ href, label }) => (
                    <Link
                        key={href}
                        href={href}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isActive(href)
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                        {label}
                    </Link>
                ))}
            </nav>

            <div className="px-4 py-4 border-t border-slate-700 space-y-3">
                <p className="text-xs text-slate-500 truncate">{email}</p>
                {statusPageSlug && (
                    <a
                        href={`/status/${statusPageSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        Your status page →
                    </a>
                )}
                <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                    Sign out
                </button>
            </div>
        </>
    );
}
