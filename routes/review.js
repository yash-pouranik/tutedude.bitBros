const express = require("express");
const router = express.Router();
const Notification = require("../model/notification"); // adjust path if needed
const Order = require("../model/order");
const Product = require("../model/product")

const { isLoggedIn } = require("../middlewares");

router.get("/notifications", isLoggedIn, async (req, res) => {
  const notifications = await Notification.find({ receiver: req.session.user._id })
    .sort({ createdAt: -1 })
    .populate("sender", "name");

  res.render("user/notification", { notifications });
});


// routes/vendor.js

router.get("/orders/:id/review", isLoggedIn, async (req, res) => {
  const order = await Order.findById(req.params.id).populate("products.product");


  if (!order) return res.status(404).send("Order not found");

  if (order.vendor.toString() !== req.session.user._id.toString()) {
    req.flash("error", "Unauthorized");
    return res.redirect("/vendor/orders");
  }

  res.render("review/reviewForm", { order });
});


const Review = require("../model/review");

router.post("/orders/:id/review", isLoggedIn, async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) return res.status(404).send("Order not found");

  if (order.vendor.toString() !== req.session.user._id.toString()) {
    req.flash("error", "Unauthorized");
    return res.redirect("/vendor/orders");
  }

  const { quality, deliverySpeed, communication, comments } = req.body;

  const review = new Review({
  product: order.products[0].product._id,
  fromUser: req.session.user._id,
  quality,
  deliverySpeed,
  communication,
  comments,
});


  await review.save();

  req.flash("success", "Review submitted successfully!");
  res.redirect("/vendor/orders");
});




module.exports = router;
