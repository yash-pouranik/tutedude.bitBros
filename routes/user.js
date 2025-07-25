const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const User = require("../model/user")

//otp
const otpStore = new Map();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


// signup route
router.get("/signup", (req, res) => {
    res.render("user/signup");
});


router.post("/signup", wrapAsync(async (req, res) => {
    const { username, phone, userType, address } = req.body;
    const existing = await User.findOne({ phone });
    if (existing) {
        req.flash("error", "Phone already registered");
        return res.redirect("/signup");
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

    req.session.userId = user._id;
    req.flash("success", "Logged in successfully");
    res.redirect("/dashboard");
}));





// logout
router.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});


module.exports = router;
