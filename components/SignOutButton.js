'use client';
import { signOut } from 'next-auth/react';

/**
 * Sign out button, client component because signOut() is a browser-side
 * next-auth/react call that cannot run in a server component.
 */
export default function SignOutButton() {
    return (
        <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full text-left text-sm text-slate-400 hover:text-white transition-colors py-1"
        >
            Sign out
        </button>
    );
}
