const admin = require('firebase-admin');

admin.initializeApp();

const fs = admin.firestore();

module.exports = { admin , fs };