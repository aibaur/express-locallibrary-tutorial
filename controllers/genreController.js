const Genre = require("../models/genre");
const Book = require("../models/book");

const { body, validationResult } = require("express-validator");
const asyncHandler = require("express-async-handler");

//
// Display list of all genres.
//

exports.genre_list = asyncHandler(async (req, res, next) => {
  const allGenres = await Genre.find().sort({ name: 1 }).exec();

  res.render("genre_list", { title: "Genre list", genre_list: allGenres });
});

//
// Display detail of specific genre.
//

exports.genre_detail = asyncHandler(async (req, res, next) => {
  // Get details of the genre and all associated books (in parallel).
  const [genre, booksInGenre] = await Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find({ genre: req.params.id }, "title summary").exec(),
  ]);
  
  if (genre === null) {
    // No results.
    const err = new Error("Genre not found");
    err.status = 404;
    return next(err);
  }

  res.render("genre_detail", { title: "Genre detail", genre: genre, genre_books: booksInGenre });
});

//
// [CREATE] [GET] Display genre form.
// We don't need the asyncHandler() wrapper here because this code can not throw any exceptions.

exports.genre_create_get = (req, res, next) => {

  res.render("genre_form", { title: "Create genre" });
};

//
// [CREATE] [POST] Handle genre form.
//

exports.genre_create_post = [
  // Validate and sanitize the genre name field.
  body("name", "Genre name must contain at least 3 characters").trim().isLength({ min: 3 }).escape(),

  // Process request after validation and sanitization.
  asyncHandler(async (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a genre object with escaped and trimmed data.
    const genre = new Genre({ name: req.body.name });

    if (!errors.isEmpty()) {
      // There are errors. Render the form again, passing sanitized values and error messages.

      res.render("genre_form", { title: "Create genre", genre: genre, errors: errors.array() });
      return;
    } else {

      // Data from form is valid.

      // Check if a genre with the same name already exists. 
      const genreExists = await Genre.findOne({ name: req.body.name })
        .collation({ locale: "en", strength: 2 })
        .exec();
      if (genreExists) {
        
        // If the genre exists, redirect to its detail page.
        res.redirect(genreExists.url);
      } else {
        // Save genre. 
        await genre.save();

       // New genre saved. Redirect to genre detail page.
        res.redirect(genre.url);
      }
    }
  }),
];

//
// [DELETE] [GET] Display genre form.
//

exports.genre_delete_get = asyncHandler(async (req, res, next) => {
  // Get details of the genre and all associated books (in parallel).  
  const [genre, booksInGenre] = await Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find({ genre: req.params.id }, "title summary").exec(),
  ]);

  if (genre === null) {
    // No results.
    res.redirect("/catalog/genres");
  }

  res.render("genre_delete", { title: "Delete genre", genre: genre, genre_books: booksInGenre });
});

//
// [DELETE] [POST] Handle genre form.
//

exports.genre_delete_post = asyncHandler(async (req, res, next) => {
  // Assume the post has a valid ID (i.e., no validation/sanitization).
  // ID is sent via the form body parameters [genre_id], rather than using URL parameter (req.params.id).
  // Get details of the genre and all associated books (in parallel).
  const [genre, booksInGenre] = await Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find({ genre: req.params.id }, "title summary").exec(),
  ]);

  if (booksInGenre.length > 0) {
    // The genre has books. Render in the same way as for the [GET] route.
    res.render("genre_delete", { title: "Delete genre", genre: genre, genre_books: booksInGenre });
    return;
  } else {
    // The genre has no books. Delete the object and redirect to the list of genres.
    await Genre.findByIdAndDelete(req.body.genre_id);

    res.redirect("/catalog/genres");
  }
});

//
// [UPDATE] [GET] Display genre form.
//

exports.genre_update_get = asyncHandler(async (req, res, next) => {
  // [id] of the [Genre] to be updated from the URL parameter (req.params.id).
  const genre = await Genre.findById(req.params.id).exec();

  if (genre === null) {
    // No results. 
    const err = new Error("Genre not found");
    err.status = 404;
    return next(err);
  }

  res.render("genre_form", { title: "Update genre", genre: genre });
});

//
// [UPDATE] [POST] Handle genre form.
//

exports.genre_update_post = [
  
  // Validate and sanitize the genre name field.
  body("name", "Genre name must contain at least 3 characters").trim().isLength({ min: 3 }).escape(),

  // Process request after validation and sanitization.
  asyncHandler(async (req, res, next) => {
    // Extract the validation errors from a request. 
    const errors = validationResult(req);

    // Create a genre object with escaped/trimmed data and the [existing id]!
    const genre = new Genre({ 
      name: req.body.name, 
      _id: req.params.id,  // This is required, or a new ID will be assigned!
    });

    if (!errors.isEmpty()) {
      // There are errors. Render the form again, passing sanitized values and error messages.
      res.render("genre_form", { title: "Update genre", genre: genre, errors: errors.array() });
      return;
    } else {
      
      // Data from form is valid. Update the record.
      await Genre.findByIdAndUpdate(req.params.id, genre);
      
      // Redirect to genre detail page.
      res.redirect(genre.url);
    }
  }),
];