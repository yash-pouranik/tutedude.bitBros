const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

// /contact POST route
router.post("/contact", async (req, res) => {
  const { name, number, message } = req.body;

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail', // ya aapka SMTP server
      auth: {
        user: process.env.USER_EMAIL,      // 👈 aapka email
        pass: process.env.EMAIL_PASS,        // 👈 Gmail ka App Password (not your Gmail login password)
      },
    });

    // Mail content
    const mailOptions = {
      from: 'kush.8q@gmail.com',
      to: process.env.USER_EMAIL,         // 👈 jahan aapko mail chahiye
      subject: `New Contact Form Message from ${name}`,
      text: `
        Name: ${name}
        Number: ${number}
        Message: ${message}
            `,
    };

    await transporter.sendMail(mailOptions);
    req.flash("success", "Message sent successfully")
    res.redirect("/shopping");
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong.");
  }
});

module.exports = router;
