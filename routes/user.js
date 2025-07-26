const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const User = require("../model/user")
const {isLoggedIn} = require("../middlewares")

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

router.get("/dashboard", isLoggedIn, (req, res)=>{
    res.render("user/dashboard.ejs");
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
    await User.findByIdAndUpdate(id, {
      phone,
      address,
      userType
    });

    res.redirect("/dashboard"); // or wherever you want
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating profile");
  }
});




module.exports = router;
