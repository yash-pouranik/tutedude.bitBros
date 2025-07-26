// routes/vendor.js

const express = require('express');
const router = express.Router();
const { isSupplier } = require('../middlewares');


const multer = require("multer");
const upload = multer();


// GET route to render Add Product form
router.get('/supplier/add-product', isSupplier, (req, res) => {
  res.render('product/addProduct', { supplier: req.session.user }); // assuming req.user is set via session or token middleware
});


const Supplier = require("../model/user");
const Product = require("../model/product");

// POST: Add a new product for a supplier
router.post("/supplier/:supplierId/add-product", upload.none(), async (req, res) => {
  try {
    const { supplierId } = req.params;
    const {
      name,
      description,
      type,
      freshCategory,
      price,
      quantity,
      unit,
      imageUrl,
      availability,
    } = req.body;

    const newProduct = new Product({
      name,
      description,
      type,
      freshCategory: type === "fresh" ? freshCategory : undefined,
      price,
      quantity,
      unit,
      imageUrl: imageUrl || null,
      availability: availability === "on", // checkbox returns "on" if checked
      supplierId: req.session.user._id,
    });

    await newProduct.save();

    res.redirect(`/supplier/${supplierId}/dashboard`); // Or wherever you want
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).send("Internal Server Error");
  }
});


router.get("/product/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).populate("supplierId");

    if (!product) {
      return res.status(404).send("Product not found");
    }

    res.render("product/allProducts", { product, currUser: req.user || null  });
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong");
  }
});


router.get('/supplier/manage-products/:id', async (req, res) => {
  try {
    const allProducts = await Product.find({ supplierId: req.params.id }).populate("supplierId");

    res.render('product/manageProducts', {
      allProducts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});



module.exports = router;
