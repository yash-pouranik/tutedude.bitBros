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


//models
const User = require("./model/user.js");


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
.then((r) => {
    console.log("Connecton to DB Done");
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

const userRoute = require("./routes/user") 
app.use("/", userRoute);

app.get("/", (req, res) => {
    res.render("templates/home.ejs");
});

app.get("/shopping", (req, res)=>{
    res.render("templates/shopping.ejs");
});




//page not found
 app.all("", (req, res, next) => {
    console.log('Path:', req.path);
    next(new ExpressError(404, "Page Not Found"));
})

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