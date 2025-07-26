const express = require("express");
const router = express.Router();
const Cart = require("../model/cart");
const Order = require("../model/order");
const Product = require("../model/product");
const User = require("../model/user");
const {isLoggedIn}=require("../middlewares");

const razorpayInstance = require("../utils/razorpay");


// Create Order from Cart
router.post("/place-order", isLoggedIn, async (req, res) => {
  try {
    const { vendorId, orderType } = req.body;
    const cart = await Cart.findOne({ userId: vendorId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      req.flash("error", "Cart is empty");
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
        price: product.price,
      });
    }

    const supplierId = cart.items[0].productId.supplierId;

    // 🔥 Razorpay expects amount in paise
    const razorpayOrder = await razorpayInstance.orders.create({
      amount: totalAmount * 100, // in paise
      currency: "INR",
      receipt: `order_rcptid_${Date.now()}`,
    });

    // Save the temp order in DB or session
    req.session.tempOrder = {
      supplier: supplierId,
      vendor: vendorId,
      products: orderItems,
      totalAmount,
      razorpayOrderId: razorpayOrder.id,
    };

    // Render payment page or send to frontend
    res.render("payment/checkout", {
      order: razorpayOrder,
      user: req.session.user,
      key_id: process.env.RAZORPAY_KEY_ID,
      amount: totalAmount,
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong");
    res.status(400).redirect("/shopping");
  }
});


const crypto = require("crypto");

router.post("/verify-payment", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    // Create order in DB
    const sessionOrder = req.session.tempOrder;

    const newOrder = new Order({
      ...sessionOrder,
      paymentId: razorpay_payment_id,
      paymentStatus: "Paid",
    });

    await newOrder.save();
    await Cart.deleteOne({ userId: sessionOrder.vendor });
    req.session.tempOrder = null;

    req.flash("success", "Payment successful and order placed!");
    return res.redirect("/shopping");
  } else {
    req.flash("error", "Payment verification failed");
    return res.redirect("/shopping");
  }
});





router.get("/supplier/orders", isLoggedIn, async (req, res) => {
  try {
    const supplierId = req.session.user._id;

    const orders = await Order.find({ supplier: supplierId })
      .populate("vendor")
      .populate("products.product", "name price")
      .sort({ createdAt: -1 });

    // Filter out null products (if any product was deleted)
    orders.forEach(order => {
      order.products = order.products.filter(p => p.product); // keep only valid products
    });

    res.render("order/supplier-orders", { orders, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading supplier orders");
  }
});


// Show edit form
router.get("/orders/:id/edit", isLoggedIn, async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("products.product")
    .populate("supplier")
    .populate("vendor");

  if (!order) return res.status(404).send("Order not found");

  // Only supplier can edit
  if (order.supplier._id.toString() !== req.session.user._id.toString()) {
    req.flash("error", "Unauthorized");
    return res.redirect("/dashboard");
  }

  res.render("order/edit", { order });
});


router.put("/orders/:id", isLoggedIn, async (req, res) => {
  const { status, paymentStatus } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) return res.status(404).send("Order not found");

  // Only supplier can update
  if (order.supplier.toString() !== req.session.user._id.toString()) {
    req.flash("error", "Unauthorized");
    return res.redirect("/dashboard");
  }

  order.status = status;
  order.paymentStatus = paymentStatus;
  await order.save();

  req.flash("success", "Order updated successfully!");
  res.redirect("/supplier/orders"); // or wherever you're listing orders
});





module.exports = router;
