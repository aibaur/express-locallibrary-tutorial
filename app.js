require('dotenv').config();

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const catalogRouter = require("./routes/catalog"); //Import routes for "catalog" area of site.

const compression = require("compression");
const helmet = require("helmet");

// Create the Express application object.
const app = express();  

// Set up rate limiter: maximum of twenty requests per minute.
const RateLimit = require("express-rate-limit");
const limiter = RateLimit({
  windowMs: 5 * 60 * 1000, // 5 minute
  max: 20, // Limit each IP to 100 requests per `Window` (here, per 5 minutes).
});
app.use(limiter); // Apply rate limiter to all requests.

// Set up Mongoose connection.
const mongoose = require("mongoose"); 
mongoose.set("strictQuery", false);

const mongoDB = process.env.MONGODB_URI;

main().catch((err) => console.log(err));
async function main() {
  await mongoose.connect(mongoDB);
}

// View Engine setup.
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Add Helmet to the middleware chain. Set CSP headers to allow our Bootstrap and Jquery to be served.
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      "script-src": ["'self'", "code.jquery.com", "cdn.jsdelivr.net"],
    },
  }),
);

app.use(compression()); // Compress all routes.
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use("/catalog", catalogRouter); // Add Catalog routes to middleware chain.

// Catch 404 and forward to error handler.
app.use(function(req, res, next) {
  next(createError(404));
});

// Error handler.
app.use(function(err, req, res, next) {
  // Set locals, only providing error in development.
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Render the error page.
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
