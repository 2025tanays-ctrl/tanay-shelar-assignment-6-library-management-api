const { getDb } = require("../config/firebase");

const USERS = "users";

function safeUser(user) {
  return {
    userId: user.userId,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

async function getUsers(req, res, next) {
  try {
    const db = getDb();
    const snapshot = await db.collection(USERS).get();

    const users = snapshot.docs.map(doc => safeUser(doc.data()));

    res.json({
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
}

async function getUser(req, res, next) {
  try {
    const db = getDb();
    const doc = await db.collection(USERS).doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user: safeUser(doc.data()) });
  } catch (error) {
    next(error);
  }
}

async function updateUserRole(req, res, next) {
  try {
    const db = getDb();
    const { role } = req.body;

    if (!["student", "librarian"].includes(role)) {
      return res.status(400).json({
        message: "Role must be student or librarian"
      });
    }

    const ref = db.collection(USERS).doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    await ref.update({
      role,
      updatedAt: new Date()
    });

    const updated = (await ref.get()).data();

    res.json({
      message: "User role updated successfully",
      user: safeUser(updated)
    });
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const db = getDb();
    const ref = db.collection(USERS).doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.params.id === req.user.userId) {
      return res.status(400).json({
        message: "You cannot delete your own account"
      });
    }

    await ref.delete();

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getUsers,
  getUser,
  updateUserRole,
  deleteUser
};