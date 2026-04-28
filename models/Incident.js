import mongoose from 'mongoose';

const IncidentSchema = new mongoose.Schema(
    {
        monitorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Monitor', required: true, index: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        startedAt: { type: Date, required: true },
        // null means the incident is ongoing; set when the monitor recovers
        resolvedAt: { type: Date, default: null },
        durationMs: { type: Number },
        cause: { type: String },
    },
    { timestamps: true }
);

export default mongoose.models.Incident || mongoose.model('Incident', IncidentSchema);
