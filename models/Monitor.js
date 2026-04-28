import mongoose from 'mongoose';

const MonitorSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        name: { type: String, required: true },
        url: { type: String, required: true },
        method: { type: String, enum: ['GET', 'POST', 'HEAD'], default: 'GET' },
        interval: { type: Number, default: 5 }, // minutes
        isActive: { type: Boolean, default: true },
        expectedStatusCode: { type: Number, default: 200 },
        keywordCheck: {
            enabled: { type: Boolean, default: false },
            keyword: { type: String, default: '' },
        },
        timeoutMs: { type: Number, default: 10000 },
        consecutiveFailures: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['up', 'down', 'paused', 'unknown'],
            default: 'unknown',
        },
        // Indexed so the dispatcher can efficiently query which monitors are due.
        nextCheckAt: { type: Date, index: true },
        lastCheckedAt: { type: Date },
    },
    { timestamps: true }
);

// Compound index for the dispatcher query:
// find({ userId, isActive: true, nextCheckAt: { $lte: now } })
MonitorSchema.index({ userId: 1, isActive: 1, nextCheckAt: 1 });

export default mongoose.models.Monitor || mongoose.model('Monitor', MonitorSchema);
