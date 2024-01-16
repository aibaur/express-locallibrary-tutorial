const mongoose = require("mongoose");

const { DateTime } = require("luxon"); // for date handling

const Schema = mongoose.Schema;

const BookInstanceSchema = new Schema({
  /* book is a reference to a single Book model object, and is required. */
  book: { type: Schema.Types.ObjectId, ref: "Book", required: true }, 
  imprint: { type: String, required: true },
  status: {
    type: String,
    required: true,
    enum: ["Available", "Maintenance", "Loaned", "Reserved"],
    default: "Maintenance",
  },
  due_back: { type: Date, default: Date.now },
});

// Virtual for this bookinstance instance URL.
BookInstanceSchema.virtual("url").get(function () {
  /*  We don't use an arrow function as we'll need the this object. */
  //return "/catalog/bookinstance/" + this._id;
  return `/catalog/bookinstance/${this._id}`; 
});

// Virtual for bookinstance's due back formatted
BookInstanceSchema.virtual("due_back_formatted").get(function () {
  return DateTime.fromJSDate(this.due_back).toLocaleString(DateTime.DATE_MED);
});

// Virtual for bookinstance's due back yyyy_mm_dd
BookInstanceSchema.virtual("due_back_yyyy_mm_dd").get(function () {
  return DateTime.fromJSDate(this.due_back).toISODate(); // format 'YYYY-MM-DD'
});

// Export model
module.exports = mongoose.model("BookInstance", BookInstanceSchema);