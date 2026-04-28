import mongoose from 'mongoose';

const CheckResultSchema = new mongoose.Schema({
    monitorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Monitor', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    timestamp: { type: Date, required: true, default: Date.now, index: true },
    status: { type: String, enum: ['up', 'down'], required: true },
    statusCode: { type: Number },
    responseTimeMs: { type: Number },
    error: { type: String },
    region: { type: String, default: 'us-east-1' },
});

// TTL index: MongoDB auto-deletes check results older than 30 days.
// The maintenance cron acts as a safety net only, not the primary cleanup mechanism.
CheckResultSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

export default mongoose.models.CheckResult || mongoose.model('CheckResult', CheckResultSchema);
