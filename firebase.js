const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

function initFirebase() {
  const base64Key = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  const serviceAccountJson = Buffer.from(base64Key, "base64").toString("utf8");
  const serviceAccount = JSON.parse(serviceAccountJson);

  const app = admin.initializeApp({
    credential: admin.cert(serviceAccount),
  });

  return getFirestore(app);
}

module.exports = { initFirebase };