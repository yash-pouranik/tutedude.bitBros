const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const User = require("../model/user")
const {isLoggedIn} = require("../middlewares")
const Notification = require('../model/notification'); // Adjust the path accordingly
const Review = require("../model/review");


//otp
const otpStore = new Map();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


// signup route
router.get("/signup", (req, res) => {
    res.render("user/signup");
});


//adding coordinate
const getCoordinatesFromAddress = require("../utils/geocode");

router.post("/signup", wrapAsync(async (req, res) => {
  const { username, phone, userType, address } = req.body;

  const existing = await User.findOne({ phone });
  if (existing) {
    req.flash("error", "Phone already registered");
    return res.redirect("/signup");
  }

  // 🧭 Get coordinates
  const coordinates = await getCoordinatesFromAddress(address);
  if (coordinates) {
    address.latitude = coordinates.latitude;
    address.longitude = coordinates.longitude;
  }

  const user = new User({ username, phone, userType, address });
  await user.save();

  req.flash("success", "Signup successful! Please login.");
  res.redirect("/login");
}));



//login form
router.get("/login", (req, res) => {
    res.render("user/login");
});


router.post("/login", wrapAsync(async (req, res) => {
    const { phone } = req.body;
    const user = await User.findOne({ phone });

    if (!user) {
        req.flash("error", "Phone not registered");
        return res.redirect("/login");
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    user.otp = {
        code: otpCode.toString(),
        expiresAt
    };
    await user.save();

    req.session.user = { _id: user._id }; // lighter, cleaner


    console.log(`OTP for ${phone}: ${otpCode}`); // replace with SMS API in prod

    req.session.phone = phone; // store temporarily
    req.flash("success", "OTP sent to your number");
    res.redirect("/verifyOtp");
}));

// OTP verify page dikhane wala route
router.get("/verifyOtp", (req, res) => {
  if (!req.session.phone) {
    req.flash("error", "Please login first");
    return res.redirect("/login");
  }
  res.render("user/verifyOtp"); // Make sure verifyOtp.ejs exists
});


router.post("/verify-otp", wrapAsync(async (req, res) => {
    const { otp } = req.body;
    const phone = req.session.phone;

    const user = await User.findOne({ phone });

    if (!user || !user.otp || user.otp.code !== otp || new Date() > user.otp.expiresAt) {
        req.flash("error", "Invalid or expired OTP");
        return res.redirect("/verifyOtp");
    }

    // OTP is valid
    user.otp = undefined;
    await user.save();

    req.session.user = {
      _id: user._id,
      userType: user.userType,
      name: user.name,
      phone: user.phone,
    };
    req.flash("success", "Logged in successfully");
    res.redirect("/dashboard");
}));

// logout
router.get("/logout", isLoggedIn, (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

router.get("/dashboard", isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id).populate("notifications");

    res.render("user/dashboard.ejs", { user });
  } catch (err) {
    console.error(err);
    req.flash("error", "Unable to load dashboard");
    res.redirect("/");
  }
});


router.get('/profile/edit/:id', isLoggedIn, async (req, res) => {
  const user = await User.findById(req.params.id);
  res.render('user/edit', { currUser: user });
});


router.post("/profile/:id/edit", async (req, res) => {
  const { id } = req.params;
  let { phone, address, userType } = req.body;

  if (Array.isArray(phone)) {
    phone = phone[0];
  }

  try {
    const coordinates = await getCoordinatesFromAddress(address);
    if (coordinates) {
      address.latitude = coordinates.latitude;
      address.longitude = coordinates.longitude;
    }

    await User.findByIdAndUpdate(id, {
      phone,
      address,
      userType
    });

    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating profile");
  }
});

router.get("/review/:supplierId", isLoggedIn, async (req, res) => {
  try {
    const supplier = await User.findById(req.params.supplierId);
    if (!supplier) {
      req.flash("error", "Supplier not found");
      return res.redirect("/dashboard");
    }
    res.render("user/reviewForm.ejs", { supplier });
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong");
    res.redirect("/dashboard");
  }
});

router.post("/review/:supplierId", isLoggedIn, async (req, res) => {
  try {
    const { quality, timeliness, experience, comment } = req.body;

    const newReview = new Review({
      vendor: req.session.user._id,
      supplier: req.params.supplierId,
      quality,
      timeliness,
      experience,
      comment
    });

    await newReview.save();

    // Add this review to supplier's array
    const supplier = await User.findById(req.params.supplierId);
    supplier.supplier.reviews.push(newReview._id);
    await supplier.save();

    req.flash("success", "Review submitted!");
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to submit review");
    res.redirect("/dashboard");
  }
});

router.post("/submit-review", isLoggedIn, async (req, res) => {
  const { supplierId, qualityRating, deliveryRating, experienceRating, comment } = req.body;

  try {
    const review = new Review({
      supplier: supplierId,
      vendor: req.session.user._id,
      qualityRating,
      deliveryRating,
      experienceRating,
      comment,
    });

    await review.save();

    const supplier = await User.findById(supplierId);
    supplier.supplier.reviews.push(review._id);

    const notif = new Notification({
      type: "info",
      message: "🎉 You received a new review!",
      userId: supplierId,
    });

    await notif.save();
    supplier.notifications.push(notif._id);
    await supplier.save();

    req.flash("success", "Review submitted successfully!");
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong while submitting the review.");
    res.redirect("/dashboard");
  }
});



module.exports = router;
