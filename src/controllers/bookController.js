const { getDb, admin } = require("../config/firebase");

const BOOKS = "books";
const TRANSACTIONS = "transactions";

async function getBooks(req, res, next) {
  try {
    const db = getDb();
    let query = db.collection(BOOKS);

    const { category, status, author, title } = req.query;

    if (category) query = query.where("category", "==", category);
    if (status) query = query.where("status", "==", status);

    const snapshot = await query.get();

    let books = snapshot.docs.map(doc => doc.data());

    if (author) {
      books = books.filter(b =>
        b.author.toLowerCase().includes(author.toLowerCase())
      );
    }

    if (title) {
      books = books.filter(b =>
        b.title.toLowerCase().includes(title.toLowerCase())
      );
    }

    res.json({
      count: books.length,
      books
    });
  } catch (error) {
    next(error);
  }
}

async function getBook(req, res, next) {
  try {
    const db = getDb();
    const doc = await db.collection(BOOKS).doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json({ book: doc.data() });
  } catch (error) {
    next(error);
  }
}

async function searchBooks(req, res, next) {
  try {
    const db = getDb();
    const q = (req.query.q || "").trim().toLowerCase();

    if (!q) {
      return res.status(400).json({
        message: "Search query q is required"
      });
    }

    const snapshot = await db.collection(BOOKS).get();

    const books = snapshot.docs
      .map(doc => doc.data())
      .filter(book =>
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q)
      );

    res.json({
      count: books.length,
      books
    });
  } catch (error) {
    next(error);
  }
}

async function createBook(req, res, next) {
  try {
    const db = getDb();
    const {
      title,
      author,
      isbn,
      category,
      quantity
    } = req.body;

    const ref = db.collection(BOOKS).doc();
    const now = new Date();

    const book = {
      bookId: ref.id,
      title: title.trim(),
      author: author.trim(),
      isbn: isbn.trim(),
      category: category.trim(),
      status: "available",
      quantity: Number(quantity),
      createdAt: now
    };

    await ref.set(book);

    res.status(201).json({
      message: "Book created successfully",
      book
    });
  } catch (error) {
    next(error);
  }
}

async function updateBook(req, res, next) {
  try {
    const db = getDb();
    const ref = db.collection(BOOKS).doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Book not found" });
    }

    const data = doc.data();
    const { title, author, isbn, category, quantity } = req.body;

    const update = {};

    if (title !== undefined) update.title = title.trim();
    if (author !== undefined) update.author = author.trim();
    if (isbn !== undefined) update.isbn = isbn.trim();
    if (category !== undefined) update.category = category.trim();

    if (quantity !== undefined) {
      const newQuantity = Number(quantity);

      if (!Number.isInteger(newQuantity) || newQuantity < 0) {
        return res.status(400).json({
          message: "Quantity must be a non-negative integer"
        });
      }

      update.quantity = newQuantity;
      update.status = newQuantity > 0 ? "available" : "borrowed";
    }

    await ref.update(update);

    res.json({
      message: "Book updated successfully",
      book: { ...data, ...update, bookId: req.params.id }
    });
  } catch (error) {
    next(error);
  }
}

async function deleteBook(req, res, next) {
  try {
    const db = getDb();
    const ref = db.collection(BOOKS).doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Book not found" });
    }

    await ref.delete();

    res.json({ message: "Book deleted successfully" });
  } catch (error) {
    next(error);
  }
}

async function borrowBook(req, res, next) {
  try {
    const db = getDb();
    const bookRef = db.collection(BOOKS).doc(req.params.id);

    const result = await db.runTransaction(async transaction => {
      const bookDoc = await transaction.get(bookRef);

      if (!bookDoc.exists) {
        const err = new Error("Book not found");
        err.statusCode = 404;
        throw err;
      }

      const book = bookDoc.data();

      if (book.quantity <= 0) {
        const err = new Error("Book is not available");
        err.statusCode = 400;
        throw err;
      }

      const transactionRef = db.collection(TRANSACTIONS).doc();
      const borrowDate = new Date();
      const dueDate = new Date(
        borrowDate.getTime() + 14 * 24 * 60 * 60 * 1000
      );

      const newQuantity = book.quantity - 1;

      const transactionData = {
        transactionId: transactionRef.id,
        userId: req.user.userId,
        bookId: req.params.id,
        type: "borrow",
        borrowDate,
        returnDate: null,
        dueDate,
        status: "active"
      };

      transaction.update(bookRef, {
        quantity: newQuantity,
        status: newQuantity > 0 ? "available" : "borrowed"
      });

      transaction.set(transactionRef, transactionData);

      return transactionData;
    });

    res.status(201).json({
      message: "Book borrowed successfully",
      transaction: result
    });
  } catch (error) {
    next(error);
  }
}

async function returnBook(req, res, next) {
  try {
    const db = getDb();

    const activeSnapshot = await db
      .collection(TRANSACTIONS)
      .where("userId", "==", req.user.userId)
      .where("bookId", "==", req.params.id)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (activeSnapshot.empty) {
      return res.status(400).json({
        message: "No active borrow transaction found for this book"
      });
    }

    const transactionDoc = activeSnapshot.docs[0];
    const transactionRef = transactionDoc.ref;
    const bookRef = db.collection(BOOKS).doc(req.params.id);

    await db.runTransaction(async transaction => {
      const bookDoc = await transaction.get(bookRef);

      if (!bookDoc.exists) {
        const err = new Error("Book not found");
        err.statusCode = 404;
        throw err;
      }

      const book = bookDoc.data();
      const returnDate = new Date();
      const dueDate = transactionDoc.data().dueDate?.toDate
        ? transactionDoc.data().dueDate.toDate()
        : new Date(transactionDoc.data().dueDate);

      const status = returnDate > dueDate ? "overdue" : "returned";

      transaction.update(bookRef, {
        quantity: Number(book.quantity || 0) + 1,
        status: "available"
      });

      transaction.update(transactionRef, {
        type: "return",
        returnDate,
        status
      });
    });

    res.json({
      message: "Book returned successfully",
      transactionId: transactionDoc.id
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getBooks,
  getBook,
  searchBooks,
  createBook,
  updateBook,
  deleteBook,
  borrowBook,
  returnBook
};