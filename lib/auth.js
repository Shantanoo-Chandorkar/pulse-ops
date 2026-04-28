import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import EmailProvider from 'next-auth/providers/email';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import clientPromise from '@/lib/mongodb';

/**
 * NextAuth configuration shared across the app.
 * Exported so API routes and server components can call getServerSession(authOptions).
 *
 * Providers:
 *   - EmailProvider: passwordless magic-link sign-in via Resend
 *   - GoogleProvider: OAuth 2.0 sign-in
 *
 * The MongoDB adapter persists users, sessions, and verification tokens
 * using the raw MongoClient (not Mongoose) as required by the adapter.
 */
export const authOptions = {
    adapter: MongoDBAdapter(clientPromise),

    providers: [
        EmailProvider({
            server: {
                host: 'smtp.resend.com',
                port: 465,
                auth: {
                    user: 'resend',
                    pass: process.env.RESEND_API_KEY,
                },
            },
            from: process.env.EMAIL_FROM,
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
    ],

    callbacks: {
        /**
         * Attaches the MongoDB _id to the session so server code can
         * use session.user.id as the userId scoping key.
         *
         * @param {object} params
         * @param {object} params.session - The session object being built.
         * @param {object} params.user   - The DB user document from the adapter.
         * @returns {object} The session with user.id populated.
         */
        session({ session, user }) {
            if (session.user) {
                session.user.id = user.id;
            }
            return session;
        },
    },

    pages: {
        signIn: '/auth/signin',
    },
};
