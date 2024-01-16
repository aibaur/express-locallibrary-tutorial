const Author = require("../models/author");
const Book = require("../models/book");

const { body, validationResult } = require("express-validator");
const asyncHandler = require("express-async-handler");

//
// Display list of all authors.
//

exports.author_list = asyncHandler(async (req, res, next) => {
  const allAuthors = await Author.find().sort({ family_name: 1 }).exec();

  res.render("author_list", { title: "Author list", author_list: allAuthors });
});

//
// Display details for a specific author.
//

exports.author_detail = asyncHandler(async (req, res, next) => {
  // Get details of the author and all associated books (in parallel).
  const [author, allBooksByAuthor] = await Promise.all([
    Author.findById(req.params.id).exec(),
    Book.find({ author: req.params.id }, "title summary").exec(),
  ]);

  if (author === null) {
    // No results.
    const err = new Error("Author not found");
    err.status = 404;
    return next(err);
  }

  res.render("author_detail", { title: "Author detail", author: author, author_books: allBooksByAuthor });
});

//
// [CREATE] [GET] Display author form.
// We don't need the asyncHandler() wrapper here because this code can not throw any exceptions.

exports.author_create_get = (req, res, next) => {

  res.render("author_form", { title: "Create author" });
};

// 
// [CREATE] [POST] Handle author form.
//

exports.author_create_post = [
  // Validate and sanitize author fields.
  body("first_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("First name must be specified.")
    .isAlphanumeric()
    .withMessage("First name has non-alphanumeric characters."),
  body("family_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("Family name must be specified.")
    .isAlphanumeric()
    .withMessage("Family name has non-alphanumeric characters."),
  body("date_of_birth", "Invalid date of birth")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),
  body("date_of_death", "Invalid date of death")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization. 
  asyncHandler(async (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a new author object with escaped and trimmed data.
    const author = new Author({
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      date_of_birth: req.body.date_of_birth,
      date_of_death: req.body.date_of_death,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again, passing sanitized values and error messages.

      res.render("author_form", { title: "Create author", author: author, errors: errors.array() });
      return;
    } else {

      // Data from form is valid.

      // NOT TODO:
      // Check if author with the same name already exists?
      // If the author exists, redirect to its detail page?
      
      // Save author.
      await author.save();
      
      // New author saved. Redirect to author detail page.
      res.redirect(author.url);
    }
  }),
];

// 
// [DELETE] [GET] Display author form.
//

exports.author_delete_get = asyncHandler(async (req, res, next) => {
  // Get details of the author and all associated books (in parallel).
  const [author, allBooksByAuthor] = await Promise.all([
    Author.findById(req.params.id).exec(),
    Book.find({ author: req.params.id }, "title summary").exec(),
  ]);

  if (author === null) {    
    // No results.    
    res.redirect("/catalog/authors");
  }

  res.render("author_delete", { title: "Delete author", author: author, author_books: allBooksByAuthor });
});

//
// [DELETE] [POST] Handle author form.
//

exports.author_delete_post = asyncHandler(async (req, res, next) => {
  // Assume the post has a valid ID (i.e., no validation/sanitization).
  // ID is sent via the form body parameters [author_id], rather than using URL parameter (req.params.id).
  // Get details of the author and all associated books (in parallel).
  const [author, allBooksByAuthor] = await Promise.all([
    Author.findById(req.params.id).exec(),
    Book.find({ author: req.params.id }, "title summary").exec(),
  ]);

  if (allBooksByAuthor.length > 0) {
    // The author has books. Render in the same way as for the [GET] route.
    res.render("author_delete", { title: "Delete author", author: author, author_books: allBooksByAuthor });
    return;
  } else {
    // The author has no books. Delete the object and redirect to the list of authors.
    await Author.findByIdAndDelete(req.body.author_id);
    
    res.redirect("/catalog/authors");
  }
});

//
// [UPDATE] [GET] Display author form.
//

exports.author_update_get = asyncHandler(async (req, res, next) => {
  // [id] of the [Author] to be updated from the URL parameter (req.params.id).
  const author = await Author.findById(req.params.id).exec();

  if (author === null) {
    // No results.
    const err = new Error("Author not found");
    err.status = 404;
    return next(err);
  }

  res.render("author_form", { title: "Update author", author: author });
});

//
// [UPDATE] [POST] Handle author form.
//

exports.author_update_post = [
  
  // Validate and sanitize the author fields.
  body("first_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("First name must be specified.")
    .isAlphanumeric()
    .withMessage("First name has non-alphanumeric characters."),
  body("family_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("Family name must be specified.")
    .isAlphanumeric()
    .withMessage("Family name has non-alphanumeric characters."),
  body("date_of_birth", "Invalid date of birth")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),
  body("date_of_death", "Invalid date of death")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization.
  asyncHandler(async (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create an author object with escaped/trimmed data and the [existing id]!
    const author = new Author({
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      date_of_birth: req.body.date_of_birth,
      date_of_death: req.body.date_of_death,
      _id: req.params.id, // This is required, or a new ID will be assigned!
    });

    if (!errors.isEmpty()) {      
      // There are errors. Render the form again, passing sanitized values and error messages.
      res.render("author_form", { title: "Update author", author: author, errors: errors.array() });
      return;
    } else {

      // Data from form is valid. Update the record.
      await Author.findByIdAndUpdate(req.params.id, author);
      
      // Redirect to author detail page.
      res.redirect(author.url);
    }
  }),
];