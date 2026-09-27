const bcrypt = require("bcrypt");
const { getDb } = require("../config/firebase");
const { generateToken } = require("../utils/jwt");

const USERS = "users";

async function register(req, res, next) {
  try {
    const db = getDb();
    const { name, email, password, role = "student" } = req.body;

    const normalizedEmail = email.trim().toLowerCase();

    if (!["student", "librarian"].includes(role)) {
      return res.status(400).json({
        message: "Role must be student or librarian"
      });
    }

    const existing = await db
      .collection(USERS)
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const ref = db.collection(USERS).doc();
    const now = new Date();

    const user = {
      userId: ref.id,
      name: name.trim(),
      email: normalizedEmail,
      password: passwordHash,
      role,
      createdAt: now,
      updatedAt: now
    };

    await ref.set(user);

    const token = generateToken(user);

    res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const db = getDb();
    const { email, password } = req.body;

    const snapshot = await db
      .collection(USERS)
      .where("email", "==", email.trim().toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = snapshot.docs[0].data();

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user);

    res.json({
      message: "Login successful",
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
}

async function getProfile(req, res, next) {
  try {
    const db = getDb();
    const doc = await db.collection(USERS).doc(req.user.userId).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = doc.data();

    res.json({
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const db = getDb();
    const { name, email } = req.body;
    const ref = db.collection(USERS).doc(req.user.userId);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    const update = {
      updatedAt: new Date()
    };

    if (name) update.name = name.trim();

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();

      const existing = await db
        .collection(USERS)
        .where("email", "==", normalizedEmail)
        .limit(2)
        .get();

      const anotherUser = existing.docs.some(
        d => d.id !== req.user.userId
      );

      if (anotherUser) {
        return res.status(409).json({ message: "Email already in use" });
      }

      update.email = normalizedEmail;
    }

    await ref.update(update);

    const updated = (await ref.get()).data();

    res.json({
      message: "Profile updated",
      user: {
        userId: updated.userId,
        name: updated.name,
        email: updated.email,
        role: updated.role
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};