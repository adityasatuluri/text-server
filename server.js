const express = require('express');
const bodyParser = require('body-parser');
const firebaseAdmin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

load_dotenv()

// Initialize Firebase Admin SDK (same as your original code)
cred = credentials.Certificate({
    "type": "service_account",
    "project_id": os.getenv("FIREBASE_PROJECT_ID"),
    "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
    "private_key": os.getenv("FIREBASE_PRIVATE_KEY").replace('\\n', '\n'),
    "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
    "client_id": os.getenv("FIREBASE_CLIENT_ID"),
    "auth_uri": os.getenv("FIREBASE_AUTH_URI"),
    "token_uri": os.getenv("FIREBASE_TOKEN_URI"),
    "auth_provider_x509_cert_url": os.getenv("FIREBASE_AUTH_PROVIDER_X509_CERT_URL"),
    "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_X509_CERT_URL"),
    "universe_domain": os.getenv("FIREBASE_UNIVERSE_DOMAIN")
})

firebase_admin.initialize_app(cred)

const db = firebaseAdmin.firestore();
const app = express();
app.use(bodyParser.json());

app.post('/store_data', async (req, res) => {
  try {
    const data = req.body;
    const process_id = `${Date.now()}-${uuidv4()}`;
    
    // Store initial data in temp collection
    const documentData = {
      ...data,
      process_id: process_id,
      created_at: firebaseAdmin.firestore.FieldValue.serverTimestamp()
    };
    
    // Add document to temp collection
    const tempRef = db.collection('temp_collection');
    await tempRef.add(documentData);

    // Simulate processing and adding to flood_risk collection
    // You would replace this with your actual processing logic
    const floodRiskRef = db.collection('flood_risk_data');
    await floodRiskRef.add({
      ...documentData,
      processed: true,
      risk_level: 'medium' // Example risk level
    });

    // Retrieve the document immediately
    const snapshot = await floodRiskRef.where('process_id', '==', process_id).get();
    
    if (snapshot.empty) {
      return res.status(404).json({ message: 'No document found with the given process_id' });
    }

    const result = [];
    snapshot.forEach(doc => {
      result.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json({ message: 'Document retrieved', data: result });

  } catch (error) {
    console.error('Error storing data:', error);
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
