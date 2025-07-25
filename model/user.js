const mongoose = require('mongoose');

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
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  otp: {
    code: String,        // store OTP temporarily
    expiresAt: Date      // OTP expiry time
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
