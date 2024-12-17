const express = require('express');
const bodyParser = require('body-parser');
const firebaseAdmin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const serviceAccount = {
  "type": "service_account",
  "project_id": process.env.FIREBASE_PROJECT_ID,
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
  "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
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

// POST endpoint to store data
app.post("/store_data", async (req, res) => {
  try {
    const data = req.body;
    const process_id = `${Date.now()}-${uuidv4()}`;

    const documentData = {
      ...data,
      process_id: process_id,
      created_at: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
    };

    // Store data in temp_collection
    const tempRef = db.collection("temp_collection");
    await tempRef.add(documentData);

    // Immediately respond with process_id
    res.status(202).send(process_id);

  } catch (error) {
    console.error("Error storing data:", error);
    res.status(500).json({ error: "Failed to store data" });
  }
});

// GET endpoint to check processing status
app.get("/check_status/:process_id", async (req, res) => {
  try {
    const { process_id } = req.params;

    // Query flood_risk_data collection for the given process_id
    const snapshot = await db
      .collection("flood_risk_data")
      .where("process_id", "==", process_id)
      .get();

    if (snapshot.empty) {
      return res.status(202).json({
        message: "Processing not yet complete. Please try again later.",
      });
    }

    // Retrieve and send the processed document
    const result = [];
    snapshot.forEach((doc) => {
      result.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json({
      message: "Document processed successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Error checking status:", error);
    res.status(500).json({ error: "Failed to check status" });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ status: 'Server is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
