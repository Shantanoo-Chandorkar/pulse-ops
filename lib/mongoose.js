import mongoose from 'mongoose';

// Without caching, each serverless cold-start opens a new Mongoose connection.
// We attach the cache to `global` so it persists across hot-reloads in dev
// and across invocations within the same container in production.
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Returns a cached Mongoose connection, creating one if it does not exist.
 * Safe to call from any server component, API route, or service.
 *
 * @returns {Promise<mongoose.Connection>} The active Mongoose connection.
 * @throws {Error} If MONGODB_URI is not set.
 */
export async function connectDB() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!process.env.MONGODB_URI) {
        throw new Error('Missing environment variable: MONGODB_URI');
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(process.env.MONGODB_URI).then((instance) => instance);
    }

    cached.conn = await cached.promise;
    return cached.conn;
}
