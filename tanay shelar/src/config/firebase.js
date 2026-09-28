const admin = require("firebase-admin");

let db;

function initFirebase() {
  if (admin.apps.length) {
    db = admin.firestore();
    return db;
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey
    })
  });

  db = admin.firestore();
  return db;
}

function getDb() {
  if (!db) initFirebase();
  return db;
}

module.exports = { admin, initFirebase, getDb };