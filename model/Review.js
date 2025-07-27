// models/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // who wrote it (customer)
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },   // who is being reviewed (supplier/vendor)

  quality: { type: Number, min: 1, max: 5, required: true },
  deliverySpeed: { type: Number, min: 1, max: 5, required: true },
  communication: { type: Number, min: 1, max: 5, required: true },
  accuracy: { type: Number, min: 1, max: 5, required: true },
  
  comments: { type: String },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', reviewSchema);
