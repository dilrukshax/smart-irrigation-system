from flask import Flask, jsonify, request
import random
import time
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

class SmartIrrigationSystem:
    def __init__(self):
        # Initialize a simple ML model for irrigation prediction
        self.model = RandomForestClassifier(n_estimators=10, random_state=42)
        self._train_model()
        
    def _train_model(self):
        """Train a simple model with synthetic data"""
        # Generate synthetic training data
        # Features: [soil_moisture, temperature, humidity, time_of_day]
        X = np.random.rand(1000, 4)
        X[:, 0] = X[:, 0] * 100  # soil moisture (0-100%)
        X[:, 1] = X[:, 1] * 20 + 20  # temperature (20-40°C)
        X[:, 2] = X[:, 2] * 60 + 30  # humidity (30-90%)
        X[:, 3] = X[:, 3] * 24  # time of day (0-24 hours)
        
        # Simple rule: irrigate if soil moisture < 30% and temp > 25°C
        y = ((X[:, 0] < 30) & (X[:, 1] > 25)).astype(int)
        
        self.model.fit(X, y)
        logging.info("Irrigation prediction model trained successfully")
    
    def simulate_sensor_data(self):
        """Simulate IoT sensor readings"""
        return {
            'soil_moisture': round(random.uniform(10, 90), 2),
            'temperature': round(random.uniform(20, 40), 2),
            'humidity': round(random.uniform(30, 90), 2),
            'timestamp': time.time()
        }
    
    def predict_irrigation_need(self, sensor_data):
        """Predict if irrigation is needed based on sensor data"""
        current_hour = time.localtime().tm_hour
        features = np.array([[
            sensor_data['soil_moisture'],
            sensor_data['temperature'],
            sensor_data['humidity'],
            current_hour
        ]])
        
        prediction = self.model.predict(features)[0]
        confidence = self.model.predict_proba(features)[0].max()
        
        return {
            'irrigation_needed': bool(prediction),
            'confidence': round(confidence, 3),
            'recommendation': 'WATER_ON' if prediction else 'WATER_OFF'
        }

# Initialize the irrigation system
irrigation_system = SmartIrrigationSystem()

@app.route('/status', methods=['GET'])
def get_status():
    """Health check endpoint"""
    return jsonify({
        'service': 'Smart Irrigation Service',
        'status': 'running',
        'timestamp': time.time()
    })

@app.route('/sensor-data', methods=['GET'])
def get_sensor_data():
    """Get current sensor readings"""
    sensor_data = irrigation_system.simulate_sensor_data()
    prediction = irrigation_system.predict_irrigation_need(sensor_data)
    
    response = {
        'sensor_data': sensor_data,
        'prediction': prediction,
        'actuator_signal': prediction['recommendation']
    }
    
    logging.info(f"Sensor reading: {sensor_data['soil_moisture']}% moisture, "
                f"{sensor_data['temperature']}°C - Action: {prediction['recommendation']}")
    
    return jsonify(response)

@app.route('/irrigation-control', methods=['POST'])
def irrigation_control():
    """Manual irrigation control endpoint"""
    data = request.get_json()
    action = data.get('action', '').upper()
    
    if action not in ['WATER_ON', 'WATER_OFF']:
        return jsonify({'error': 'Invalid action. Use WATER_ON or WATER_OFF'}), 400
    
    logging.info(f"Manual irrigation control: {action}")
    
    return jsonify({
        'status': 'success',
        'action_taken': action,
        'timestamp': time.time()
    })

if __name__ == '__main__':
    logging.info("Starting Smart Irrigation Service...")
    app.run(host='0.0.0.0', port=5001, debug=True)
