const express = require("express");
const { body } = require("express-validator");
const {
  getUsers,
  getUser,
  updateUserRole,
  deleteUser
} = require("../controllers/userController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/role");
const { validate } = require("../middleware/validator");

const router = express.Router();

router.use(authenticate, authorize("librarian"));

router.get("/", getUsers);
router.get("/:id", getUser);

router.put(
  "/:id/role",
  body("role")
    .isIn(["student", "librarian"])
    .withMessage("Role must be student or librarian"),
  validate,
  updateUserRole
);

router.delete("/:id", deleteUser);

module.exports = router;