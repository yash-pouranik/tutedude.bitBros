if(process.env.NODE_ENV != "production"){
    require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

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