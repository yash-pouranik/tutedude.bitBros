const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  type: {
    type: String,
    enum: ["delivered", "delivery_cancelled", "review_request"],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  link: String, // optional link to redirect (like review page)
  isRead: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);
