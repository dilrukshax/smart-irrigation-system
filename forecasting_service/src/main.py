from flask import Flask, jsonify, request
import random
import time
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.linear_model import LinearRegression
import logging
from datetime import datetime, timedelta

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

class TimeSeriesForecastingSystem:
    def __init__(self):
        self.water_level_data = []
        self.rainfall_data = []
        self.dam_gate_data = []
        self.scaler = MinMaxScaler()
        self.model = LinearRegression()
        self._initialize_historical_data()
        
    def _initialize_historical_data(self):
        """Initialize with some historical data for better predictions"""
        # Generate 30 days of historical data
        base_time = time.time() - (30 * 24 * 3600)  # 30 days ago
        
        for i in range(720):  # 30 days * 24 hours
            timestamp = base_time + (i * 3600)  # hourly data
            
            # Simulate seasonal patterns
            day_of_year = datetime.fromtimestamp(timestamp).timetuple().tm_yday
            seasonal_factor = 0.5 + 0.5 * np.sin(2 * np.pi * day_of_year / 365)
            
            # Water level (0-100% of capacity)
            base_level = 60 + 20 * seasonal_factor
            water_level = max(10, min(95, base_level + random.uniform(-10, 10)))
            
            # Rainfall (mm per hour)
            rainfall_prob = 0.3 if seasonal_factor > 0.6 else 0.1  # More rain in monsoon
            rainfall = random.uniform(0, 15) if random.random() < rainfall_prob else 0
            
            # Dam gate opening (0-100%)
            gate_opening = min(80, max(0, water_level - 50 + random.uniform(-10, 10)))
            
            self.water_level_data.append({
                'timestamp': timestamp,
                'water_level_percent': round(water_level, 2)
            })
            
            self.rainfall_data.append({
                'timestamp': timestamp,
                'rainfall_mm': round(rainfall, 2)
            })
            
            self.dam_gate_data.append({
                'timestamp': timestamp,
                'gate_opening_percent': round(gate_opening, 2)
            })
    
    def simulate_current_data(self):
        """Simulate current sensor readings"""
        current_time = time.time()
        
        # Get recent trend from last few readings
        recent_water_levels = [d['water_level_percent'] for d in self.water_level_data[-5:]]
        recent_rainfall = [d['rainfall_mm'] for d in self.rainfall_data[-5:]]
        
        avg_water_level = np.mean(recent_water_levels) if recent_water_levels else 50
        avg_rainfall = np.mean(recent_rainfall) if recent_rainfall else 0
        
        # Simulate with some trend continuation
        new_water_level = max(5, min(98, avg_water_level + random.uniform(-5, 5)))
        new_rainfall = max(0, avg_rainfall + random.uniform(-2, 8))
        new_gate_opening = min(90, max(0, new_water_level - 45 + random.uniform(-5, 5)))
        
        data = {
            'timestamp': current_time,
            'water_level_percent': round(new_water_level, 2),
            'rainfall_mm': round(new_rainfall, 2),
            'gate_opening_percent': round(new_gate_opening, 2)
        }
        
        # Add to historical data
        self.water_level_data.append({'timestamp': current_time, 'water_level_percent': data['water_level_percent']})
        self.rainfall_data.append({'timestamp': current_time, 'rainfall_mm': data['rainfall_mm']})
        self.dam_gate_data.append({'timestamp': current_time, 'gate_opening_percent': data['gate_opening_percent']})
        
        # Keep only last 1000 records to prevent memory issues
        for data_list in [self.water_level_data, self.rainfall_data, self.dam_gate_data]:
            if len(data_list) > 1000:
                data_list[:] = data_list[-1000:]
        
        return data
    
    def prepare_forecast_features(self, lookback_hours=24):
        """Prepare features for forecasting"""
        if len(self.water_level_data) < lookback_hours:
            return None, None
        
        # Get recent data
        recent_water = [d['water_level_percent'] for d in self.water_level_data[-lookback_hours:]]
        recent_rainfall = [d['rainfall_mm'] for d in self.rainfall_data[-lookback_hours:]]
        recent_gates = [d['gate_opening_percent'] for d in self.dam_gate_data[-lookback_hours:]]
        
        # Create features: [avg_water_level, total_rainfall, avg_gate_opening, trend]
        features = [
            np.mean(recent_water),
            np.sum(recent_rainfall),
            np.mean(recent_gates),
            recent_water[-1] - recent_water[0]  # trend
        ]
        
        return np.array(features).reshape(1, -1), recent_water[-1]
    
    def forecast_water_level(self, hours_ahead=24):
        """Forecast water level for the next few hours"""
        features, current_level = self.prepare_forecast_features()
        
        if features is None:
            return {
                'status': 'insufficient_data',
                'message': 'Need at least 24 hours of data for forecasting'
            }
        
        # Simple linear trend forecast
        predictions = []
        current_features = features.copy()
        
        for hour in range(1, hours_ahead + 1):
            # Predict change in water level
            level_change = self.model.fit(
                np.arange(len(self.water_level_data[-24:])).reshape(-1, 1),
                [d['water_level_percent'] for d in self.water_level_data[-24:]]
            ).predict([[24 + hour]])[0] - current_level
            
            # Apply some realistic constraints
            predicted_level = current_level + level_change * 0.1  # Dampen the prediction
            predicted_level = max(0, min(100, predicted_level))
            
            predictions.append({
                'hour': hour,
                'predicted_water_level': round(predicted_level, 2),
                'timestamp': time.time() + (hour * 3600)
            })
        
        return {
            'status': 'success',
            'current_level': current_level,
            'predictions': predictions,
            'forecast_generated_at': time.time()
        }
    
    def analyze_flood_risk(self):
        """Analyze flood and drought risk based on current trends"""
        if len(self.water_level_data) < 10:
            return {'status': 'insufficient_data'}
        
        current_level = self.water_level_data[-1]['water_level_percent']
        recent_rainfall = sum([d['rainfall_mm'] for d in self.rainfall_data[-24:]])  # Last 24 hours
        trend = np.mean([d['water_level_percent'] for d in self.water_level_data[-5:]]) - \
                np.mean([d['water_level_percent'] for d in self.water_level_data[-10:-5]])
        
        # Risk assessment
        flood_risk = 'LOW'
        drought_risk = 'LOW'
        alerts = []
        
        # Flood risk assessment
        if current_level > 85 and trend > 2:
            flood_risk = 'HIGH'
            alerts.append('FLOOD WARNING: Water level rising rapidly')
        elif current_level > 75 or (current_level > 60 and recent_rainfall > 50):
            flood_risk = 'MEDIUM'
            alerts.append('Flood watch: Monitor water levels closely')
        
        # Drought risk assessment
        if current_level < 20 and trend < -1:
            drought_risk = 'HIGH'
            alerts.append('DROUGHT WARNING: Water level critically low')
        elif current_level < 35 and recent_rainfall < 5:
            drought_risk = 'MEDIUM'
            alerts.append('Drought watch: Low water levels detected')
        
        return {
            'current_water_level': current_level,
            'flood_risk': flood_risk,
            'drought_risk': drought_risk,
            'recent_rainfall_24h': round(recent_rainfall, 2),
            'level_trend': round(trend, 2),
            'alerts': alerts,
            'assessment_time': time.time()
        }

# Initialize the forecasting system
forecasting_system = TimeSeriesForecastingSystem()

@app.route('/status', methods=['GET'])
def get_status():
    """Health check endpoint"""
    return jsonify({
        'service': 'Time-Series Forecasting Service',
        'status': 'running',
        'data_points': {
            'water_level': len(forecasting_system.water_level_data),
            'rainfall': len(forecasting_system.rainfall_data),
            'dam_gates': len(forecasting_system.dam_gate_data)
        },
        'timestamp': time.time()
    })

@app.route('/current-data', methods=['GET'])
def get_current_data():
    """Get current sensor readings and update data"""
    current_data = forecasting_system.simulate_current_data()
    
    logging.info(f"Current conditions - Water: {current_data['water_level_percent']}%, "
                f"Rainfall: {current_data['rainfall_mm']}mm, "
                f"Gates: {current_data['gate_opening_percent']}%")
    
    return jsonify({
        'status': 'success',
        'current_data': current_data,
        'data_points_total': len(forecasting_system.water_level_data)
    })

@app.route('/forecast', methods=['GET'])
def get_forecast():
    """Get water level forecast"""
    hours_ahead = request.args.get('hours', 24, type=int)
    hours_ahead = min(72, max(1, hours_ahead))  # Limit to 1-72 hours
    
    forecast = forecasting_system.forecast_water_level(hours_ahead)
    
    if forecast['status'] == 'success':
        logging.info(f"Generated {hours_ahead}-hour forecast")
    
    return jsonify(forecast)

@app.route('/risk-assessment', methods=['GET'])
def get_risk_assessment():
    """Get flood and drought risk assessment"""
    risk_analysis = forecasting_system.analyze_flood_risk()
    
    if 'alerts' in risk_analysis and risk_analysis['alerts']:
        for alert in risk_analysis['alerts']:
            logging.warning(f"ALERT: {alert}")
    
    return jsonify(risk_analysis)

@app.route('/submit-data', methods=['POST'])
def submit_sensor_data():
    """Accept external sensor data"""
    try:
        data = request.get_json()
        
        # Validate and add data
        if 'water_level_percent' in data:
            forecasting_system.water_level_data.append({
                'timestamp': data.get('timestamp', time.time()),
                'water_level_percent': data['water_level_percent']
            })
        
        if 'rainfall_mm' in data:
            forecasting_system.rainfall_data.append({
                'timestamp': data.get('timestamp', time.time()),
                'rainfall_mm': data['rainfall_mm']
            })
        
        if 'gate_opening_percent' in data:
            forecasting_system.dam_gate_data.append({
                'timestamp': data.get('timestamp', time.time()),
                'gate_opening_percent': data['gate_opening_percent']
            })
        
        return jsonify({
            'status': 'success',
            'message': 'Data recorded successfully'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logging.info("Starting Time-Series Forecasting Service...")
    app.run(host='0.0.0.0', port=5003, debug=True)
