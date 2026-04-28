import GoogleProvider from 'next-auth/providers/google';
import EmailProvider from 'next-auth/providers/email';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import clientPromise from '@/lib/mongodb';
import { nanoid } from 'nanoid';
import { ObjectId } from 'mongodb';

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
         * Generates a unique status page slug on the user's first sign-in.
         * Uses the raw MongoClient to write directly to the users collection,
         * since the NextAuth adapter manages that collection outside Mongoose.
         *
         * @param {object} params
         * @param {object} params.user - The DB user document from the adapter.
         * @returns {boolean} Always true — returning false would block sign-in.
         */
        async signIn({ user }) {
            if (!user.statusPageSlug) {
                const client = await clientPromise;
                const db = client.db();
                const slug = nanoid(8);
                await db.collection('users').updateOne(
                    { _id: new ObjectId(user.id) },
                    { $set: { statusPageSlug: slug } }
                );
                // Attach to the user object so the session callback sees it
                // immediately in this same request without a round-trip DB read
                user.statusPageSlug = slug;
            }
            return true;
        },

        /**
         * Attaches the MongoDB _id and statusPageSlug to the session so
         * server code can use session.user.id as the userId scoping key
         * and surface the public status page URL in the dashboard.
         *
         * @param {object} params
         * @param {object} params.session - The session object being built.
         * @param {object} params.user   - The DB user document from the adapter.
         * @returns {object} The session with user.id and user.statusPageSlug populated.
         */
        session({ session, user }) {
            if (session.user) {
                session.user.id = user.id;
                session.user.statusPageSlug = user.statusPageSlug;
            }
            return session;
        },
    },
};
