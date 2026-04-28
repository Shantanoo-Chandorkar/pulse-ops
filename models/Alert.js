import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema(
    {
        monitorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Monitor', required: true, index: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        channel: { type: String, enum: ['email', 'webhook'], required: true },
        config: {
            email: { type: String },
            url: { type: String },
            // Arbitrary key-value pairs for custom webhook request headers
            headers: { type: Map, of: String },
        },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export default mongoose.models.Alert || mongoose.model('Alert', AlertSchema);
