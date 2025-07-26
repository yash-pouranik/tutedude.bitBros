const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

// Create Order from Cart
router.post("/place-order", async (req, res) => {
  try {
    const { vendorId, orderType } = req.body;
    const cart = await Cart.findOne({ userId: vendorId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (let item of cart.items) {
      const product = item.productId;
      const quantity = item.quantity;
      const price = product.price * quantity;

      totalAmount += price;

      orderItems.push({
        product: product._id,
        quantity,
        price: product.price
      });
    }

    const supplierId = cart.items[0].productId.supplierId; // Assuming all from same supplier

    const newOrder = new Order({
      supplier: supplierId,
      vendor: vendorId,
      products: orderItems,
      totalAmount,
      orderType
    });

    await newOrder.save();

    // Clear Cart
    await Cart.deleteOne({ userId: vendorId });

    res.status(201).json({ message: "Order placed successfully", order: newOrder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
