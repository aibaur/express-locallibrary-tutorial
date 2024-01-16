const Book = require("../models/book");
const Author = require("../models/author");
const Genre = require("../models/genre");
const BookInstance = require("../models/bookinstance");

const { body, validationResult } = require("express-validator");
const asyncHandler = require("express-async-handler");

//
// Display Index page.
//
exports.index = asyncHandler(async (req, res, next) => {
  // Get details of books, book instances, authors, and genre counts (in parallel).
  const [
    numBooks,
    numBookInstances,
    numAvailableBookInstances,
    numAuthors,
    numGenres,
  ] = await Promise.all([
    Book.countDocuments({}).exec(),
    BookInstance.countDocuments({}).exec(),
    BookInstance.countDocuments({ status: "Available" }).exec(),
    Author.countDocuments({}).exec(),
    Genre.countDocuments({}).exec(),
  ]);

  res.render("index", {
    title: "Local Library Home",
    book_count: numBooks,
    book_instance_count: numBookInstances,
    book_instance_available_count: numAvailableBookInstances,
    author_count: numAuthors,
    genre_count: numGenres,
  });
});

//
// Display list of all books.
//

exports.book_list = asyncHandler(async (req, res, next) => {
  const allBooks = await Book.find({}, "title author")
    .sort({ title: 1 })
    .populate("author")
    .exec();

  res.render("book_list", { title: "Book list", book_list: allBooks });
});

//
// Display details for a specific book.
//

exports.book_detail = asyncHandler(async (req, res, next) => {
  // Get details of the book and all associated book instances (in parallel).
  const [book, bookInstances] = await Promise.all([
    Book.findById(req.params.id).populate("author").populate("genre").exec(),
    BookInstance.find({ book: req.params.id }).exec(),
  ]);

  if (book === null) {
    // No results.
    const err = new Error("Book not found");
    err.status = 404;
    return next(err);
  }

  res.render("book_detail", { title: "Book detail", book: book, book_instances: bookInstances });
});

// 
// [CREATE] [GET] Display book form.
//

exports.book_create_get = asyncHandler(async (req, res, next) => {
  // Get all authors and all genres for form (in parallel).
  const [allAuthors, allGenres] = await Promise.all([
    Author.find().sort({ family_name: 1 }).exec(),
    Genre.find().sort({ name: 1 }).exec(),
  ]);

  res.render("book_form", { title: "Create book", authors: allAuthors, genres: allGenres });
});

// 
// [CREATE] [POST] Handle book form.
//

exports.book_create_post = [
  // Convert the genre to an array.
  (req, res, next) => {
    if (!Array.isArray(req.body.genre)) {
      req.body.genre = typeof req.body.genre === "undefined" ? [] : [req.body.genre];
    }
    next();
  },

  // Validate and sanitize book fields.
  body("title", "Title must not be empty.").trim().isLength({ min: 1 }).escape(),
  body("author", "Author must not be empty.").trim().isLength({ min: 1 }).escape(),
  body("summary", "Summary must not be empty.").trim().isLength({ min: 1 }).escape(),
  body("isbn", "ISBN must not be empty").trim().isLength({ min: 1 }).escape(),
  body("genre.*").escape(),

  // Process request after validation and sanitization. 
  asyncHandler(async (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a new book object with escaped and trimmed data.
    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: req.body.genre,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render the form again, passing sanitized values and error messages.

      // Get all authors and all genres for form (in parallel).
      const [allAuthors, allGenres] = await Promise.all([
        Author.find().sort({ family_name: 1 }).exec(),
        Genre.find().sort({ name: 1 }).exec(),
      ]);

      // Mark selected genres as checked.
      for (const genre of allGenres) {
        if (book.genre.includes(genre._id)) {
          genre.checked = "true";
        }
      }

      res.render("book_form", {
        title: "Create book",
        authors: allAuthors,
        genres: allGenres,
        book: book,
        errors: errors.array(),
      });
    } else {

      // Data from form is valid.

      // NOT TODO: 
      // Check if book with the same name already exists?
      // The the book exists, redirect to its detail page.
      
      // Save book.
      await book.save();
      
      // New book saved. Redirect to book detail page.
      res.redirect(book.url);
    }
  }),
];

// 
// [DELETE] [GET] Display book form.
//

exports.book_delete_get = asyncHandler(async (req, res, next) => {
  // Get details of the book and all associated book instances (in parallel).
  const [book, bookInstances] = await Promise.all([
    Book.findById(req.params.id).populate("author").populate("genre").exec(),
    BookInstance.find({ book: req.params.id }).exec(),
  ]);

  if (book === null) {
    // No results.    
    res.redirect("/catalog/books");
  }

  res.render("book_delete", { title: "Delete book", book: book, book_instances: bookInstances });
});

//
// [DELETE] [POST] Handle book form.
//

exports.book_delete_post = asyncHandler(async (req, res, next) => {
  // Assume the post has a valid ID (i.e., no validation/sanitization).
  // ID is sent via the form body parameters [book_id], rather than using URL parameter (req.params.id).
  // Get details of book, and all associated book instances (in parallel).
  const [book, bookInstances] = await Promise.all([
    Book.findById(req.params.id).populate("author").populate("genre").exec(),
    BookInstance.find({ book: req.params.id }).exec(),
  ]);
  
  if (bookInstances.length > 0) {
    // The book has book instances. Render in the same way as for the [GET] route.
    res.render("book_delete", { title: "Delete book", book: book, book_instances: bookInstances });
    return;
  } else {
    // The book has no book instances. Delete the object and redirect to the list of books
    await Book.findByIdAndDelete(req.body.book_id);
    
    res.redirect("/catalog/books");
  }
});

//
// [UPDATE] [GET] Display book form.
//

exports.book_update_get = asyncHandler(async (req, res, next) => {
  // Get book, all authors and all genres (in parallel).
  // [id] of the [Book] to be updated from the URL parameter (req.params.id).
  const [book, allAuthors, allGenres] = await Promise.all([
    Book.findById(req.params.id).populate("author").populate("genre").exec(),
    Author.find().sort({ family_name: 1 }).exec(),
    Genre.find().sort({ name: 1 }).exec(),
  ]);

  if (book === null) {
    // No results.
    const err = new Error("Book not found");
    err.status = 404;
    return next(err);
  }

  // Mark selected genres as checked.
  for (const genre of allGenres) {
    for (const book_genres of book.genre) {
      if (genre._id.toString() === book_genres._id.toString()) {
        genre.checked = "true";
      }
    }
  }

  res.render("book_form", { title: "Update book", authors: allAuthors, genres: allGenres, book: book });
});

//
// [UPDATE] [POST] Handle book form.
//

exports.book_update_post = [
  // Convert the genre to an array.
  (req, res, next) => {
    if (!Array.isArray(req.body.genre)) {
      req.body.genre = typeof req.body.genre === "undefined" ? [] : [req.body.genre];
    }
    next();
  },

  // Validate and sanitize the book fields.
  body("title", "Title must not be empty.").trim().isLength({ min: 1 }).escape(),
  body("author", "Author must not be empty.").trim().isLength({ min: 1 }).escape(),
  body("summary", "Summary must not be empty.").trim().isLength({ min: 1 }).escape(),
  body("isbn", "ISBN must not be empty").trim().isLength({ min: 1 }).escape(),
  body("genre.*").escape(),

  // Process request after validation and sanitization.
  asyncHandler(async (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a book object with escaped/trimmed data and the [existing id]!
    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: typeof req.body.genre === "undefined" ? [] : req.body.genre,
      _id: req.params.id, // This is required, or a new ID will be assigned!
    });

    if (!errors.isEmpty()) {
      // There are errors. Render the form again, passing sanitized values and error messages.

      // Get all authors and all genres for form (in parallel).
      const [allAuthors, allGenres] = await Promise.all([
        Author.find().sort({ family_name: 1 }).exec(),
        Genre.find().sort({ name: 1 }).exec(),
      ]);

      // Mark selected genres as checked.
      for (const genre of allGenres) {
        if (book.genre.indexOf(genre._id) > -1) {
          genre.checked = "true";
        }
      }

      res.render("book_form", {
        title: "Update book",
        authors: allAuthors,
        genres: allGenres,
        book: book,
        errors: errors.array(),
      });
      return;
    } else {
      
      // Data from form is valid. Update the record.
      const updatedBook = await Book.findByIdAndUpdate(req.params.id, book, {});
      
      // Redirect to book detail page. 
      res.redirect(updatedBook.url);
    }
  }),
];

