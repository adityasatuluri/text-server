import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd
import joblib
import time
import threading
import warnings

# Suppress warnings
warnings.filterwarnings("ignore", category=UserWarning, module='sklearn')

# Initialize Firebase
cred = credentials.Certificate(r'test-13da9-firebase-adminsdk-astns-f7b4f3b9e4.json')
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

# Initialize Firestore
db = firestore.client()

# Load the model and scaler
model = joblib.load(r'best_flood_model.pkl')
scaler = joblib.load(r'scaler.pkl')

# Function to predict flood risk
def predict_flood_risk(data):
    # Ensure data is in the correct format for prediction
    try:
        # If data is a dictionary, convert to DataFrame
        if isinstance(data, dict):
            # Create a DataFrame with a single row
            new_data = pd.DataFrame([data])
        elif isinstance(data, pd.DataFrame):
            new_data = data
        else:
            # Convert to DataFrame if it's not already
            new_data = pd.DataFrame([data])

        # Ensure all columns are present and in the correct order
        expected_columns = [
            'Rainfall (mm)', 'Temperature (°C)', 'Humidity (%)', 
            'River Discharge (m³/s)', 'Water Level (m)', 'Elevation (m)', 
            'Population Density', 'Infrastructure', 'Historical Floods',
            'Land Cover_Agricultural', 'Land Cover_Desert', 'Land Cover_Forest', 
            'Land Cover_Urban', 'Land Cover_Water Body',
            'Soil Type_Clay', 'Soil Type_Loam', 'Soil Type_Peat', 
            'Soil Type_Sandy', 'Soil Type_Silt'
        ]

        # Fill missing columns with 0
        for col in expected_columns:
            if col not in new_data.columns:
                new_data[col] = 0

        # Reorder columns to match training data
        new_data = new_data[expected_columns]

        # Scale the input data
        new_data_scaled = scaler.transform(new_data)

        # Predict flood risk
        prediction = model.predict(new_data_scaled)
        return prediction[0]

    except Exception as e:
        print(f"Error in predict_flood_risk: {e}")
        print("Problematic data:", data)
        return 0  # Default to no flood risk if prediction fails

# Real-time listener function
def start_realtime_listener():
    # Reference to the temp_collection
    temp_collection_ref = db.collection('temp_collection')

    # Function to process documents
    def process_documents():
        while True:
            try:
                # Query unprocessed documents
                docs = temp_collection_ref.stream()
                
                for doc in docs:
                    # Retrieve document data
                    doc_data = doc.to_dict()
                    
                    # Perform flood risk prediction
                    prediction = predict_flood_risk(doc_data)

                    # Prepare data for flood_risk_data collection
                    data2 = doc_data.copy()
                    data2['Flood Occurred'] = int(prediction)

                    # Add data to flood_risk_data collection
                    flood_risk_collection_ref = db.collection('flood_risk')
                    flood_risk_collection_ref.add(data2)

                    # Delete the document from temp_collection after processing
                    temp_collection_ref.document(doc.id).delete()

                    # Print the processing
                    print(f"Processed and moved document {doc.id} to flood_risk. Prediction: {prediction}")

                # Wait for a short time before next check
                time.sleep(5)

            except Exception as e:
                print(f"Error in processing documents: {e}")
                time.sleep(10)

    # Start the listener in a separate thread
    listener_thread = threading.Thread(target=process_documents, daemon=True)
    listener_thread.start()
    
    # Keep the main thread running
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Listener stopped.")

# Run the listener
if __name__ == "__main__":
    print("Starting Flood Risk Document Listener...")
    start_realtime_listener()