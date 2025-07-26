const express = require("express");
const router = express.Router();
const Cart = require("../model/cart");
const Order = require("../model/order");
const Product = require("../model/product");
const User = require("../model/user");
const {isLoggedIn}=require("../middlewares");

// Create Order from Cart
router.post("/place-order", async (req, res) => {
  try {
    const { vendorId, orderType } = req.body;
    const cart = await Cart.findOne({ userId: vendorId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      
      req.flash("error", "Cart not Found")
    return res.status(400).redirect("/shopping");
     
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
      
    });

    await newOrder.save();

    // Clear Cart
    await Cart.deleteOne({ userId: vendorId });

    req.flash("success", "Order placed successfully")
    res.status(201).redirect("/shopping");
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong")
    res.status(400).redirect("/shopping");
  }
});

router.get("/supplier/orders", isLoggedIn, async (req, res) => {
  try {
    const supplierId = req.session.user._id;

    const orders = await Order.find({ supplier: supplierId })
      .populate("vendor")
      .populate("products.product", "name price")
      .sort({ createdAt: -1 });

    res.render("order/supplier-orders", { orders, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading supplier orders");
  }
});



module.exports = router;
