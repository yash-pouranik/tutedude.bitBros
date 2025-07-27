const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    match: /^[0-9]{10}$/
  },
  userType: {
    type: String,
    enum: ['vendor', 'supplier'],
    required: true
  },
  totalEarnings: {
    type: Number,
    default: 0,
  },
  address: {
    street: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" }
  },
  otp: {
    code: String,
    expiresAt: Date
  },
  notifications: [{
    type: Schema.Types.ObjectId,
    ref: "Notification"
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);

