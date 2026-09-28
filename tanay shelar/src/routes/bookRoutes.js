const express = require("express");
const { body } = require("express-validator");
const {
  getBooks,
  getBook,
  searchBooks,
  createBook,
  updateBook,
  deleteBook,
  borrowBook,
  returnBook
} = require("../controllers/bookController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/role");
const { validate } = require("../middleware/validator");

const router = express.Router();

router.get("/search", searchBooks);
router.get("/", getBooks);
router.get("/:id", getBook);

router.post(
  "/",
  authenticate,
  authorize("librarian"),
  [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("author").trim().notEmpty().withMessage("Author is required"),
    body("isbn").trim().notEmpty().withMessage("ISBN is required"),
    body("category").trim().notEmpty().withMessage("Category is required"),
    body("quantity")
      .isInt({ min: 0 })
      .withMessage("Quantity must be a non-negative integer")
  ],
  validate,
  createBook
);

router.put(
  "/:id",
  authenticate,
  authorize("librarian"),
  [
    body("title").optional().trim().notEmpty(),
    body("author").optional().trim().notEmpty(),
    body("isbn").optional().trim().notEmpty(),
    body("category").optional().trim().notEmpty(),
    body("quantity").optional().isInt({ min: 0 })
  ],
  validate,
  updateBook
);

router.delete(
  "/:id",
  authenticate,
  authorize("librarian"),
  deleteBook
);

router.post(
  "/:id/borrow",
  authenticate,
  authorize("student"),
  borrowBook
);

router.post(
  "/:id/return",
  authenticate,
  authorize("student"),
  returnBook
);

module.exports = router;