const express = require('express');
const bodyParser = require('body-parser');
const firebaseAdmin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config(); // Ensure .env variables are loaded

// Initialize Firebase Admin SDK
const serviceAccount = {
    "type": "service_account",
    "project_id": process.env.FIREBASE_PROJECT_ID,
    "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
    "private_key": process.env.FIREBASE_PRIVATE_KEY.replace('\\n', '\n'),
    "client_email": process.env.FIREBASE_CLIENT_EMAIL,
    "client_id": process.env.FIREBASE_CLIENT_ID,
    "auth_uri": process.env.FIREBASE_AUTH_URI,
    "token_uri": process.env.FIREBASE_TOKEN_URI,
    "auth_provider_x509_cert_url": process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    "client_x509_cert_url": process.env.FIREBASE_CLIENT_X509_CERT_URL,
    "universe_domain": process.env.FIREBASE_UNIVERSE_DOMAIN
};

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount)
});

const db = firebaseAdmin.firestore();
const app = express();
app.use(bodyParser.json());

app.post("/store_data", async (req, res) => {
  try {
    const data = req.body;
    const process_id = `${Date.now()}-${uuidv4()}`;

    // Store initial data in temp collection
    const documentData = {
      ...data,
      process_id: process_id,
      created_at: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
    };

    // Add document to temp collection
    const tempRef = db.collection("temp_collection");
    await tempRef.add(documentData);

    // Retry mechanism to wait for the document to be processed
    let attempts = 0;
    const maxAttempts = 5;
    let snapshot;
    while (attempts < maxAttempts) {
      snapshot = await db
        .collection("flood_risk_data")
        .where("process_id", "==", process_id)
        .get();

      if (!snapshot.empty) {
        break;
      }

      attempts++;
      console.log(`Attempt ${attempts}: Waiting for document to be processed...`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds before retrying
    }

    if (snapshot.empty) {
      return res
        .status(404)
        .json({ message: "No processed document found with the given process_id" });
    }

    const result = [];
    snapshot.forEach((doc) => {
      result.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json({ message: "Document retrieved", data: result });
  } catch (error) {
    console.error("Error storing data:", error);
    res.status(400).json({ error: error.message });
  }
});


app.get('/', (req, res) => {
  res.status(200).json({ status: 'Server is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

