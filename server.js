const express = require('express');
const bodyParser = require('body-parser');
const firebaseAdmin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase Admin SDK
const serviceAccount = {
  "type": "service_account",
  "project_id": "test-13da9",
  "private_key_id": "f7b4f3b9e47be5a6a1f4870e07c7849cdef7b39d",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDIXI33qMG9Y5vU\nME2oqReEATxnlTZ3gaIzXND6HTV7jaDRSYAb3NaNXyu/PUeWouiMqQFfPNrYTUxs\n+zElpKJmFgKcuKdb9dtAHdxjy90IrTgFabcg39Vxl1Mw3aWsU52vPz55F15AhcKV\nqgbgfQJTpXPAU5zbs/2ij3MEZvpmUIL2eK4gOrdE3T1g0n5tEDJ7d/RJ3ctZimvp\nbua7kxaZFyqkd4qMetT6w6zzg6VKYbnKkoQEKAZThp189aL5Y6Vbkr/Vk39DUvmb\nIikIjfU4oSjmcbI2OZvTnnCvbiq9Iz9f+r7YdbOJQE88Z+R6sIvpIsxyLQC03dq0\n3jz9RAX/AgMBAAECggEAFtW+6QYRh+aq01zqn47J8Hr9lJFDwwysskLhSagmOMh0\nQXX+2kNp1nSNdVRkF3hwnYYDcy8UgrNomEEWoa4o7g6TH05yOypYNxn6zLWRdumF\nqXmaFpk8EnVHKhoQxYTwGJF81WstjEKntyFI0Fv0Sxk1CdXdr4fMyof5I/wijKIW\nTS0qomtPKNtST0VhXEFcQDqnSvwRh+KzULbPbvVU0H6FLge4fVviQGA5nDVp3Tdh\nfY7K06sffvH7dC1x32Qo9MkoyJvTfXgBtCwdoeWCAmBBHlydtUVu4NlpQK7KLM3m\ntcSJdOYDIOUwxchvkdOzNoDZBQKm/9mf/fugl9zxnQKBgQD0Vp1qTaW/86E/RI89\nqAOHSwCyYVy5X2BdHIgT3o2v0Tf3o4NFomdKS5Vf8QjTUemlFE7ygKrO36K9Pjd4\nowCuxnak52abHYg4X+zk72N05s+XDx+sljMW2KajP8ad5aXnZhKCzp2Pa33h9pXZ\nYq8ZypfKsmZGrSSBrY6BRf2KawKBgQDR7J7XGJbGMlesvvNGeMO9Fr2X2JyEhH+l\nJyoNom0JlWoYZ7qYrYkExBVPRii+CSEevUHzNrSDMNJpNf0+0mmZus1BQzwK8REh\njBQfsWPnA9GNgF1EaeVZKZgH81K/yA7R9r7XN5/T3E6+25YHSrAg99QCmuoF6crp\nuw8A9i2/vQKBgDjbFtIvs0wRUwo31+UO/ZMz3rujcEIqcW/5Pajx9qJc2tsjD17a\nxZJCOEYU/mq9+tJRAXXoftaYr3O90Iaf137T67O/rN6XZqVHnQZAtjHzq4aJHGO6\np7S/QTdnlb4UPCC2XcRWc891wdsc2A23qusje2LNVINJst8CFdD7Cl51AoGAd0nH\nhSES5HNNAPvNEBml2PhoKjZL0r3cLwQPUIog/dYq4M1o6kOKXevy1AZhNoPHj0kq\nhcNrVjVTC7hDPQSiP1o4MsK7BtivzGlmMhBCXc78sDTmSu8GBeGt466wMgzD5yoY\njgGsz94b3Ta4jVIyvbk2f3h6TXvp82F5iClcG90CgYBtz85k9oCHpCCKCDJpAwaF\nbGAjaGDgfmuq5tlQ9ow+jtNrO6NXegomvkx93hwvsNIipvMvN5821Lhih4kGgb2A\nNy9Q1YzaCFGxF3tG5Jr1kD5RuUYm9dxPCH5JT3+GlP7ZZuhO27p4b/ffRvWpNUYG\n2NKnGY2/uHsgfC3fPqv96Q==\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-astns@test-13da9.iam.gserviceaccount.com",
  "client_id": "117750314922039865713",
};

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount)
});
const db = firebaseAdmin.firestore();

const app = express();
app.use(bodyParser.json());

app.post('/store_data', async (req, res) => {
  try {
    const data = req.body;
    const process_id = `${Date.now()}-${uuidv4()}`;

    const documentData = {
      ...data,
      process_id: process_id,
      created_at: firebaseAdmin.firestore.FieldValue.serverTimestamp()
    };

    const tempRef = db.collection('temp_collection');
    const docRef = await tempRef.add(documentData);

    setTimeout(async () => {
      try {
        const floodRiskRef = db.collection('flood_risk');
        const snapshot = await floodRiskRef.where('process_id', '==', process_id).get();

        if (snapshot.empty) {
          return res.status(404).json({ message: 'No document found with the given process_id' });
        }

        const result = [];
        snapshot.forEach(doc => {
          result.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json({ message: 'Document retrieved', data: result });
      } catch (err) {
        console.error('Error retrieving document:', err);
        res.status(500).json({ error: 'Error retrieving document' });
      }
    }, 7000); // 7-second timeout
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
