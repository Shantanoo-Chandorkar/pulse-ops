import mongoose from 'mongoose';

const AlertLogSchema = new mongoose.Schema({
    alertId: { type: mongoose.Schema.Types.ObjectId, ref: 'Alert', required: true },
    incidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', required: true },
    sentAt: { type: Date, required: true, default: Date.now },
    channel: { type: String, required: true },
    status: { type: String, enum: ['sent', 'failed'], required: true },
    // Raw response body stored for debugging failed deliveries; truncated to avoid doc bloat
    responseBody: { type: String, maxlength: 1000 },
});

export default mongoose.models.AlertLog || mongoose.model('AlertLog', AlertLogSchema);
