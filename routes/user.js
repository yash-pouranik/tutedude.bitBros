const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const User = require("../model/user");
const { isLoggedIn } = require("../middlewares");
const axios = require("axios");

// signup form
router.get("/signup", (req, res) => {
  res.render("user/signup");
});

// signup logic with Mapbox geocoding
router.post("/signup", wrapAsync(async (req, res) => {
  const { username, phone, userType, address } = req.body;

  const existing = await User.findOne({ phone });
  if (existing) {
    req.flash("error", "Phone already registered");
    return res.redirect("/signup");
  }

  const fullAddress = `${address.street}, ${address.city}, ${address.state}, ${address.pincode}`;

  let coordinates = [0, 0];
  try {
    const geoRes = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json`, {
      params: {
        access_token: process.env.MAPBOX_TOKEN,
        limit: 1
      }
    });

    coordinates = geoRes.data.features[0]?.geometry?.coordinates || [0, 0];
  } catch (err) {
    console.error("Mapbox error:", err);
  }

  const user = new User({
    username,
    phone,
    userType,
    address,
    location: {
      type: "Point",
      coordinates
    }
  });

  await user.save();
  req.flash("success", "Signup successful! Please login.");
  res.redirect("/login");
}));

// login form
router.get("/login", (req, res) => {
  res.render("user/login");
});

// login logic (OTP-based)
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

  console.log(`OTP for ${phone}: ${otpCode}`);
  req.session.phone = phone;
  req.flash("success", "OTP sent to your number");
  res.redirect("/verifyOtp");
}));

// OTP verify page
router.get("/verifyOtp", (req, res) => {
  if (!req.session.phone) {
    req.flash("error", "Please login first");
    return res.redirect("/login");
  }
  res.render("user/verifyOtp");
});

// OTP verification logic
router.post("/verify-otp", wrapAsync(async (req, res) => {
  const { otp } = req.body;
  const phone = req.session.phone;

  const user = await User.findOne({ phone });

  if (!user || !user.otp || user.otp.code !== otp || new Date() > user.otp.expiresAt) {
    req.flash("error", "Invalid or expired OTP");
    return res.redirect("/verifyOtp");
  }

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

// dashboard
router.get("/dashboard", isLoggedIn, (req, res) => {
  res.render("user/dashboard.ejs");
});

// profile edit form
router.get('/profile/edit/:id', isLoggedIn, async (req, res) => {
  const user = await User.findById(req.params.id);
  res.render('user/edit', { currUser: user });
});

// profile update with Mapbox geocoding
router.post("/profile/:id/edit", wrapAsync(async (req, res) => {
  const { id } = req.params;
  let { phone, address, userType } = req.body;

  if (Array.isArray(phone)) {
    phone = phone[0];
  }

  const fullAddress = `${address.street}, ${address.city}, ${address.state}, ${address.pincode}`;

  let coordinates = [0, 0];
  try {
    const geoRes = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json`, {
      params: {
        access_token: process.env.MAPBOX_TOKEN,
        limit: 1
      }
    });

    coordinates = geoRes.data.features[0]?.geometry?.coordinates || [0, 0];
  } catch (err) {
    console.error("Mapbox error:", err);
  }

  await User.findByIdAndUpdate(id, {
    phone,
    address,
    userType,
    location: {
      type: "Point",
      coordinates
    }
  });

  res.redirect("/dashboard");
}));

module.exports = router;

