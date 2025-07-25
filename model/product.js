const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    trim: true
  },

  type: {
    type: String,
    enum: ['fresh', 'packed'],
    required: true
  },

  freshCategory: {
    type: String,
    enum: ['veggies', 'dairy'],
    required: function () {
      return this.type === 'fresh';
    }
  },

  price: {
    type: Number,
    required: true,
    min: 0
  },

  quantity: {
    type: Number,
    required: true,
    min: 1
  },

  unit: {
    type: String,
    enum: ['kg', 'litre', 'pack', 'piece'],
    required: true
  },

  imageUrl: {
    type: String,
    default: '/images/default-product.jpg' // you can update this
  },

  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  availability: {
  type: Boolean,
  default: true
},
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Product', productSchema);
