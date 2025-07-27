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
    street: String,
    city: String,
    state: String,
    pincode: String,
    latitude: Number,   // ⬅️ New
    longitude: Number   // ⬅️ New
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


module.exports = mongoose.model('User', userSchema);

