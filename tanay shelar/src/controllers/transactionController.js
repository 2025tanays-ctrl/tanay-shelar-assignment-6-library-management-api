const { getDb } = require("../config/firebase");

async function getAllTransactions(req, res, next) {
  try {
    const db = getDb();
    const snapshot = await db.collection("transactions").get();

    const transactions = snapshot.docs.map(doc => doc.data());

    res.json({
      count: transactions.length,
      transactions
    });
  } catch (error) {
    next(error);
  }
}

async function getMyTransactions(req, res, next) {
  try {
    const db = getDb();

    const snapshot = await db
      .collection("transactions")
      .where("userId", "==", req.user.userId)
      .get();

    const transactions = snapshot.docs.map(doc => doc.data());

    res.json({
      count: transactions.length,
      transactions
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllTransactions,
  getMyTransactions
};