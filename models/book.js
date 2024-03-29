const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const BookSchema = new Schema({
  title: { type: String, required: true },
  /* author is a reference to a single Author model object, and is required. */
  author: { type: Schema.Types.ObjectId, ref: "Author", required: true },
  summary: { type: String, required: true },
  isbn: { type: String, required: true },
  /* genre is a associated to an array of Genre model objects. */
  genre: [{ type: Schema.Types.ObjectId, ref: "Genre" }],
});

// Virtual for this book instance URL.
BookSchema.virtual("url").get(function () {
 /*  We don't use an arrow function as we'll need the this object. */
  //return "/catalog/book/" + this._id;
  return `/catalog/book/${this._id}`; 
});

// Export model
module.exports = mongoose.model("Book", BookSchema);
