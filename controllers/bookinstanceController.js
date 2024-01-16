const BookInstance = require("../models/bookinstance");
const Book = require("../models/book");

const { body, validationResult } = require("express-validator");
const asyncHandler = require("express-async-handler");

//
// Display list of all bookInstances.
//

exports.bookinstance_list = asyncHandler(async (req, res, next) => {
  const allBookInstances = await BookInstance.find().populate("book").exec();

  res.render("bookinstance_list", { title: "Book-instance list", bookinstance_list: allBookInstances });
});

//
// Display details for a specific bookInstance.
//

exports.bookinstance_detail = asyncHandler(async (req, res, next) => {
  const bookInstance = await BookInstance.findById(req.params.id).populate("book").exec();

  if (bookInstance === null) {
    // No results.
    const err = new Error("Book copy not found");
    err.status = 404;
    return next(err);
  }

  res.render("bookinstance_detail", { title: "Book-instance detail", bookinstance: bookInstance });
});

//
// [CREATE] [GET] Display bookInstance form.
// 

exports.bookinstance_create_get = asyncHandler(async (req, res, next) => {
  const allBooks = await Book.find({}, "title").sort({ title: 1 }).exec();

  res.render("bookinstance_form", { title: "Create book-instance", book_list: allBooks });
});

// 
// [CREATE] [POST] Handle bookInstance form.
//

exports.bookinstance_create_post = [
  // Validate and sanitize BookInstance fields.
  body("book", "Book must be specified").trim().isLength({ min: 1 }).escape(),
  body("imprint", "Imprint must be specified").trim().isLength({ min: 1 }).escape(),
  body("status").escape(),
  body("due_back", "Invalid date").optional({ values: "falsy" }).isISO8601().toDate(),

  // Process request after validation and sanitization.
  asyncHandler(async (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a new BookInstance object with escaped and trimmed data.
    const bookInstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render the form again, passing sanitized values and error messages.

      const allBooks = await Book.find({}, "title").sort({ title: 1 }).exec();

      res.render("bookinstance_form", {
        title: "Create book-instance",
        book_list: allBooks,
        selected_book: bookInstance.book._id,
        bookinstance: bookInstance,
        errors: errors.array(),
      });
      return;
    } else {

      // Data from form is valid.

      // NOT TODO:
      // Check if bookInstance with the same name already exists?
      // If the bookInstance exists, redirect to its detail page?

      // Save bookInstance.
      await bookInstance.save();
      
      // New bookInstance saved. Redirect to bookInstance detail page.
      res.redirect(bookInstance.url);
    }
  }),
];

// 
// [DELETE] [GET] Display bookInstance form.
//

exports.bookinstance_delete_get = asyncHandler(async (req, res, next) => {
  const bookInstance = await BookInstance.findById(req.params.id).populate("book").exec();

  if (bookInstance === null) {
    // No results.
    res.redirect("/catalog/bookinstances");
  }

  res.render("bookinstance_delete", { title: "Delete book-instance", bookinstance: bookInstance });
});

//
// [DELETE] [POST] Handle bookInstance form.
//

exports.bookinstance_delete_post = asyncHandler(async (req, res, next) => {
  // Assume the post has a valid ID (i.e., no validation/sanitization).
  // ID is sent via the form body parameters [bookinstance_id], rather than using URL parameter (req.params.id).
  await BookInstance.findByIdAndDelete(req.body.bookinstance_id);

  res.redirect("/catalog/bookinstances");
});

//
// [UPDATE] [GET] Display bookInstance form.
//

exports.bookinstance_update_get = asyncHandler(async (req, res, next) => {
  // Get the books, and all associated bookInstance for form (in parallel).
  // [id] of the [BookInstance] to be updated from the URL parameter (req.params.id).
  const [bookInstance, allBooks] = await Promise.all([
    BookInstance.findById(req.params.id).populate("book").exec(),
    Book.find(),
  ]);

  if (bookInstance === null) {
    // No results.
    const err = new Error("Book copy not found");
    err.status = 404;
    return next(err);
  }

  res.render("bookinstance_form", {
    title: "Update book-instance",
    book_list: allBooks,
    selected_book: bookInstance.book._id,
    bookinstance: bookInstance,
  });
});

//
// [UPDATE] [GET] Display bookInstance form.
//

exports.bookinstance_update_post = [
  
  // Validate and sanitize bookInstance fields.
  body("book", "Book must be specified").trim().isLength({ min: 1 }).escape(),
  body("imprint", "Imprint must be specified").trim().isLength({ min: 1 }).escape(),
  body("status").escape(),
  body("due_back", "Invalid date").optional({ values: "falsy" }).isISO8601().toDate(),

  // Process request after validation and sanitization.
  asyncHandler(async (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a bookInstance object with escaped/trimmed data and the [existing id]!
    const bookInstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
      _id: req.params.id, // This is required, or a new ID will be assigned!
    });

    if (!errors.isEmpty()) {
      // There are errors. Render the form again passing sanitized values and error messages.
      const allBooks = await Book.find({}, "title").exec();

      res.render("bookinstance_form", {
        title: "Update BookInstance",
        book_list: allBooks,
        selected_book: bookInstance.book._id,
        bookinstance: bookInstance,
        errors: errors.array(),
      });
      return;
    } else {

      // Data from form is valid. Update the record.
      await BookInstance.findByIdAndUpdate(req.params.id, bookInstance, {});
      
      // Redirect to bookInstance detail page.
      res.redirect(bookInstance.url);
    }
  }),
];
