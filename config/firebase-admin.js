const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT
    );
} else {
    serviceAccount = require("../firebase-service-account.json");
}

if (getApps().length === 0) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}

module.exports = getAuth();