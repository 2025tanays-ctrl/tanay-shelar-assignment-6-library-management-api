const express = require("express");
const {
  getAllTransactions,
  getMyTransactions
} = require("../controllers/transactionController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/role");

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorize("librarian"),
  getAllTransactions
);

router.get(
  "/my",
  authenticate,
  getMyTransactions
);

module.exports = router;