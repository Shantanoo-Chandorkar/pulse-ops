import { MongoClient } from 'mongodb';

// NextAuth's MongoDB adapter requires the raw MongoClient, not Mongoose.
// We cache the connection globally so it survives hot-reloads in dev
// and is reused across serverless invocations in production.
if (!process.env.MONGODB_URI) {
    throw new Error('Missing environment variable: MONGODB_URI');
}

const client = new MongoClient(process.env.MONGODB_URI);
const clientPromise = client.connect();

export default clientPromise;
