const express = require("express");
const router = express.Router();
const Cart = require("../model/cart");
const Order = require("../model/order");
const Product = require("../model/product");
const User = require("../model/user");
const {isLoggedIn}=require("../middlewares");
const Notification = require('../model/notification'); // Adjust the path accordingly


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



//for existing order
// GET: Retry payment for existing pending order
router.get("/vendor/order/:orderId/pay", isLoggedIn, async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId)
      .populate("vendor")
      .populate("supplier")
      .populate("products.product");

    if (!order) {
      req.flash("error", "Order not found");
      return res.redirect("/vendor/orders");
    }

    if (order.vendor._id.toString() !== req.session.user._id.toString()) {
      req.flash("error", "Unauthorized");
      return res.redirect("/vendor/orders");
    }

    if (order.paymentStatus === "Paid") {
      req.flash("info", "Payment already completed");
      return res.redirect("/vendor/orders");
    }

    // Create new Razorpay order
    const razorpayOrder = await razorpayInstance.orders.create({
      amount: order.totalAmount * 100,
      currency: "INR",
      receipt: `retry_rcpt_${Date.now()}`
    });

    // Store Razorpay order ID for verification later
    req.session.retryPayment = {
      orderId: order._id,
      razorpayOrderId: razorpayOrder.id
    };

    const supplier = await User.findById(order.supplier._id);
    

    console.log("___________________________")
    console.log(supplier)
    if(supplier) {
      supplier.totalEarnings += order.totalAmount;
      supplier.save();
      console.log(supplier)



    }



    res.render("payment/checkout", {
      order: razorpayOrder,
      user: req.session.user,
      key_id: process.env.RAZORPAY_KEY_ID,
      amount: order.totalAmount,
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Unable to process retry payment");
    res.redirect("/vendor/orders");
  }
});


//
router.post("/verify-payment", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    // 🔁 Retry payment case
    if (req.session.retryPayment) {
      const { orderId } = req.session.retryPayment;

      const existingOrder = await Order.findById(orderId)
      .populate("supplier");
      if (existingOrder) {
        existingOrder.paymentStatus = "Paid";
        existingOrder.paymentId = razorpay_payment_id;
        await existingOrder.save();
        req.session.retryPayment = null;
        req.flash("success", "Payment successful!");
        return res.redirect("/vendor/orders");
      }
    }

    // 🆕 New order from cart case
    const sessionOrder = req.session.tempOrder;
    if (sessionOrder) {
      const newOrder = new Order({
        ...sessionOrder,
        paymentId: razorpay_payment_id,
        paymentStatus: "Paid",
      });

    const supplier = await User.findById(newOrder.supplier._id);
    

    console.log("___________________________")
    console.log(supplier)
    if(supplier) {
      supplier.totalEarnings += newOrder.totalAmount;
      supplier.save();
      console.log(supplier)
    }


      await newOrder.save();
      await Cart.deleteOne({ userId: sessionOrder.vendor });
      req.session.tempOrder = null;

          
      req.flash("success", "Payment successful and order placed!");
      return res.redirect("/shopping");
    }

    // Fallback
    req.flash("error", "No order context found");
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


router.get("/vendor/orders", isLoggedIn, async (req, res) => {
  try {
    const vendorId = req.session.user._id;

    const orders = await Order.find({ vendor: vendorId })
      .populate("supplier")
      .populate("vendor")
      .populate("products.product", "name price")
      .sort({ createdAt: -1 });

      console.log(orders)

    // Filter out null products if deleted
    orders.forEach(order => {
      order.products = order.products.filter(p => p.product);
    });

    res.render("order/vendor-orders", { orders, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading vendor orders");
  }
});

router.put("/orders/:id", isLoggedIn, async (req, res) => {
  const { status, paymentStatus } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) return res.status(404).send("Order not found");

  if (order.supplier.toString() !== req.session.user._id.toString()) {
    req.flash("error", "Unauthorized");
    return res.redirect("/dashboard");
  }

  order.status = status;
  order.paymentStatus = paymentStatus;
  await order.save();

  // 🔔 Trigger notification
  if (status === "Delivered") {
    const Notification = require("../model/notification");

    const reviewNotif = new Notification({
      type: "review_request",
      message: `Please review your recent order from ${req.session.user.name || 'your supplier'}.`,
      userId: order.vendor,
      link: `/vendor/review/${order._id}`,
    });

    await reviewNotif.save();

    const vendorUser = await User.findById(order.vendor);
    if (vendorUser) {
      vendorUser.notifications.push(reviewNotif._id);
      await vendorUser.save();
    }
  }

  req.flash("success", "Order updated successfully!");
  res.redirect("/supplier/orders");
});

// Example inside your delivery status controller
const updateDeliveryStatus = async (req, res) => {
  const { supplierId, vendorId, deliveryId, status } = req.body;

  // 1. Update the delivery/order status logic
  const order = await Order.findByIdAndUpdate(deliveryId, { status });

  // 2. If delivery marked as "Delivered", create a review notification
  if (status === 'Delivered') {
    const notif = new Notification({
      userId: vendorId,             // target user
      type: 'reviewRequest',
      message: `Please leave a review for your order from ${supplierId}`, // you can fetch supplier name if needed
      link: `/review/${deliveryId}` // where the review form lives
    });

    await notif.save();
  }

  res.status(200).json({ success: true, message: 'Delivery status updated and notification sent (if delivered).' });
};

router.get('/notifications/:userId', async (req, res) => {
  const notifications = await Notification.find({ userId: req.params.userId }).sort({ createdAt: -1 });
  res.status(200).json(notifications);
});


module.exports = router;
