if(process.env.NODE_ENV != "production"){
    require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const flash = require("connect-flash");


//for images
const multer = require("multer");
const upload = multer();



//models
const User = require("./model/user.js");
const Product = require("./model/product.js"); 


//otp
const otpStore = new Map();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);

// ...existing code...
console.log('Serving static files from:', path.join(__dirname, 'public'));
app.use(express.static(path.join(__dirname,'public')));
// ...existing code...


//utils
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js")

//db connection
const dbUrl = process.env.ATLASDB_URL;

async function main() {
    await mongoose.connect(dbUrl);
}

main()
.then(async(r) => {
    console.log("Connecton to DB Done");
    // in your script or route
})
.catch((e) => {
    console.log("Connection to DB Failed");
});

//local variable middleware
const {setLocals} = require("./middlewares.js");




const sessionConfig = {
  secret: "bitbrosSecret", // Or "bettersecret", but be consistent
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
};

app.use(session(sessionConfig));
app.use(flash());  


app.use(setLocals);

app.use((req, res, next) => {
  res.locals.user = req.session.user;  // or however you're attaching user
  next();
});

const userRoute = require("./routes/user") 
const productRoute = require("./routes/product.js")
const orderRoute = require("./routes/order.js")

app.use("/", orderRoute);
app.use("/", userRoute);
app.use("/", productRoute);

app.get("/", (req, res) => {
    res.render("templates/home.ejs");
});

app.get("/dashboard", (req, res)=>{
    res.render("user/dashboard.ejs");
});

app.get("/about", (req, res)=>{
    res.render("templates/about.ejs");
});

app.get("/terms", (req, res)=>{
    res.render("templates/terms.ejs");
});

app.get("/privacy", (req, res)=>{
    res.render("templates/privacy.ejs");
});

app.get("/contact", (req, res)=>{
    res.render("templates/contact.ejs");
});


//page not found
 app.all("", (req, res, next) => {
    console.log('Path:', req.path);
    next(new ExpressError(404, "Page Not Found"));
})


app.get('/shopping', async (req, res) => {
  try {
    const allProducts = await Product.find({ availability: true });

    // Filtered lists
    const freshProducts = allProducts.filter(p => p.type === 'fresh');
    const packedProducts = allProducts.filter(p => p.type === 'packed');
    const veggies = freshProducts.filter(p => p.freshCategory === 'veggies');
    const dairy = freshProducts.filter(p => p.freshCategory === 'dairy');

    res.render('product/shopping', {
      allProducts,
      freshProducts,
      packedProducts,
      veggies,
      dairy
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


//error handle middlewares
app.use((err, req, res, next) => {

    let {status = 500, message} = err;
    let ename = err.name;
    console.log("Some issue:", err.name);
    console.log(err);
    res.status(status).send("page not found");
});

app.listen(5000, () => {
    console.log("App is listning on port 5000");
});