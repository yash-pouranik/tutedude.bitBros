const User = require("./model/user");
const Product = require("./model/product");

module.exports.setLocals = async (req, res, next) => {
  try {
    if (req.session.user) {
      const user = await User.findById(req.session.user._id);
      res.locals.currUser = user;
    } else {
      res.locals.currUser = null;
    }

    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
  } catch (err) {
    res.locals.currUser = null;
    console.error("Error setting res.locals:", err);
  }

  next();
};


module.exports.isLoggedIn =async (req, res, next) => {
  try {
    if (req.session.user) {
      const user = await User.findById(req.session.user._id);
      res.locals.currUser = user;
      next();
    } else {
      req.flash("error", "you  must be Logged in");
      res.redirect("/login");
    }
  } catch (err) {
    req.flash("error", "you  must be Logged in");
    res.redirect("/login");
  }
}

// middlewares/isVendor.js

module.exports.isSupplier = async (req, res, next) => {
  console.log(req.session.user)
  if(!req.session.user) {
     req.flash('error', 'must be logged in');
     return res.redirect('/dashboard');
  }
  if (req.session.user) {
    const user = await User.findById(req.session.user);
    console.log(user.userType, ' ===  supplier');
    if(user.userType === "supplier") {
      return next();
    }
  }
  req.flash('error', 'Only suppliers allowed');
  res.redirect('/dashboard');
};

const mongoose = require('mongoose');

module.exports.isOwner = async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash('error', 'Invalid product ID');
    return res.redirect('/shopping');
  }

  const product = await Product.findById(id);
  if (!product) {
    req.flash('error', 'Product not found');
    return res.redirect('/shopping');
  }

  // Handles both populated and unpopulated supplierId
  const supplierId = product.supplierId._id ? product.supplierId._id : product.supplierId;
  if (String(supplierId) !== String(req.session.user._id)) {
    req.flash('error', 'You are not the owner of this product');
    return res.redirect('/shopping');
  }

  next();
};

