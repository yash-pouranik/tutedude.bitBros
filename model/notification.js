// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // who gets notified

  type: {
    type: String,
    enum: ['review_request', 'info', 'alert'],
    default: 'review_request'
  },

  message: { type: String, required: true },
  relatedOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, // optional

  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
