// routes/vendor.js

const express = require('express');
const router = express.Router();
const { isSupplier, isLoggedIn, isOwner } = require('../middlewares');


const multer = require("multer");
const {storage} = require("../configCloud");
const upload = multer({ storage });


// GET route to render Add Product form
router.get('/supplier/add-product', isSupplier, (req, res) => {
  res.render('product/addProduct', { supplier: req.session.user }); // assuming req.user is set via session or token middleware
});


const Supplier = require("../model/user");
const Product = require("../model/product");
const Cart = require("../model/cart");

// POST: Add a new product for a supplier
router.post("/supplier/:supplierId/add-product", upload.single("image"), async (req, res) => {
  try {
    const {
      name, description, type, freshCategory,
      price, quantity, unit, availability
    } = req.body;

    const newProduct = new Product({
      name,
      description,
      type,
      freshCategory: type === "fresh" ? freshCategory : undefined,
      price,
      quantity,
      unit,
      imageUrl: req.file?.path || null,
      availability: availability === "on",
      supplierId: req.session.user._id,
    });

    await newProduct.save();
    res.redirect(`/dashboard`);
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

    res.render("product/allProducts", {
      product
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong");
  }
});

router.get('/supplier/manage-products/:id', async (req, res) => {
  try {
    const allProducts = await Product.find({ supplierId: req.params.id }).populate("supplierId");

    res.render("product/manageProducts", { allProducts, currUser: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get("/product/:id/addCart", async(req,res)=>{
  const product = await Product.findById(req.params.id);
res.render("order/addcart", { product });
});

router.get("/cart/view", isLoggedIn, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.session.user._id })
      .populate("items.productId"); // Populate full product details

    res.render("order/showcart", { cart });
  } catch (err) {
    console.error("Error fetching cart:", err);
    res.status(500).send("Internal Server Error");
  }
});


router.post("/cart/add/:productId", isLoggedIn, async (req, res) => {
  try {
    const userId = req.session.user._id; // Or however you store the logged-in user
    const productId = req.params.productId;
    const quantity = parseInt(req.body.quantity) || 1;

    // Check if the user already has a cart
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      // If no cart exists, create a new one
      cart = new Cart({
        userId,
        items: [{ productId, quantity }]
      });
    } else {
      // If cart exists, check if product is already in it
      const itemIndex = cart.items.findIndex(item => item.productId.equals(productId));
      if (itemIndex > -1) {
        // Product exists in cart, update quantity
        cart.items[itemIndex].quantity += quantity;
      } else {
        // Product not in cart, add new item
        cart.items.push({ productId, quantity });
      }
    }

    await cart.save();
    res.redirect("/cart/view"); // Redirect to cart view page
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong while adding to cart.");
  }
});

router.post("/cart/remove/:productId", isLoggedIn, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const productId = req.params.productId;

    // Find user's cart
    const cart = await Cart.findOne({ userId });

    if (!cart) return res.redirect("/cart/view");

    // Filter out the product from cart
    cart.items = cart.items.filter(item => !item.productId.equals(productId));

    await cart.save();
    res.redirect("/cart/view");
  } catch (err) {
    console.error("Error removing item from cart:", err);
    res.status(500).send("Internal Server Error");
  }
});


// routes/products.js or similar

router.get('/products/:id/edit', isLoggedIn, isSupplier, isOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      req.flash('error', 'Product not found');
      return res.redirect('/shopping');
    }

    res.render('product/editProductForm', { product });
  } catch (err) {
    console.error('Error fetching product:', err);
    req.flash('error', 'Something went wrong');
    res.redirect('/shopping');
  }
});


router.put('/product/:id', isLoggedIn, isSupplier, isOwner, async (req, res) => {
  const { id } = req.params;
  let { name, description, type, freshCategory, price, quantity, unit, imageUrl, availability, category } = req.body.product;

  // Handle checkbox value for availability
  if (Array.isArray(availability)) {
    availability = availability.includes('true');
  } else {
    availability = availability === 'true';
  }

  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        name,
        description,
        type,
        freshCategory: type === 'fresh' ? freshCategory : undefined,
        price,
        quantity,
        unit,
        imageUrl: imageUrl || null,
        availability,
        category
      },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      req.flash('error', 'Product not found');
      return res.redirect('/product/allProducts');
    }

    req.flash('success', 'Product updated successfully!');
    res.redirect(`/product/${id}`);
  } catch (err) {
    console.error('Error updating product:', err);
    req.flash('error', 'Something went wrong while updating the product');
    res.redirect(`/products/${id}/edit`);
  }
});

// DELETE route for deleting a product
router.post('/products/:id/delete', isLoggedIn, isSupplier, isOwner, async (req, res) => {
  const { id } = req.params;
  try {
    const deletedProduct = await Product.findByIdAndDelete(id);
    if (!deletedProduct) {
      req.flash('error', 'Product not found');
      return res.redirect('/shopping');
    }
    req.flash('success', 'Product deleted successfully!');
    res.redirect('/shopping');
  } catch (err) {
    console.error('Error deleting product:', err);
    req.flash('error', 'Something went wrong while deleting the product');
    res.redirect('/shopping');
  }
});

module.exports = router;
