const User = require("./model/user");

module.exports.setLocals = async (req, res, next) => {
  try {
    if (req.session.userId) {
      const user = await User.findById(req.session.userId);
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
