// models/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, // reviewed item

  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // reviewer (customer)

  quality: { type: Number, min: 1, max: 5, required: true },
  deliverySpeed: { type: Number, min: 1, max: 5, required: true },
  communication: { type: Number, min: 1, max: 5, required: true },
  
  comments: { type: String, trim: true },            // optional

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', reviewSchema);
