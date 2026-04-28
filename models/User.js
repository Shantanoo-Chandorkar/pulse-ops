import mongoose from 'mongoose';

// Thin wrapper around the user document created by NextAuth's MongoDB adapter.
// The adapter manages creation and updates, this model exists so app code
// can query or reference users by ID without bypassing Mongoose.
const UserSchema = new mongoose.Schema({
    name: { type: String },
    email: { type: String, unique: true },
    emailVerified: { type: Date },
    image: { type: String },
    // Unique slug for the public status page, auto-generated on first sign-in
    statusPageSlug: { type: String, unique: true, sparse: true },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
