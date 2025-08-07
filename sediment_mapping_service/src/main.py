from flask import Flask, jsonify, request
import random
import time
import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN, KMeans
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

class SedimentMappingSystem:
    def __init__(self):
        self.sediment_data = []
        self.reservoir_bounds = {
            'lat_min': 7.0, 'lat_max': 7.5,  # Sri Lankan coordinates
            'lon_min': 80.0, 'lon_max': 80.5
        }
        
    def simulate_boat_sensor_data(self):
        """Simulate GPS and depth sensor data from survey boat"""
        # Simulate boat movement within reservoir bounds
        lat = random.uniform(self.reservoir_bounds['lat_min'], 
                           self.reservoir_bounds['lat_max'])
        lon = random.uniform(self.reservoir_bounds['lon_min'], 
                           self.reservoir_bounds['lon_max'])
        
        # Simulate depth (meters) - deeper areas might have more sediment
        depth = random.uniform(2.0, 15.0)
        
        # Simulate sediment thickness (cm) - correlated with depth
        sediment_thickness = random.uniform(0.5, 5.0) if depth > 8 else random.uniform(0.1, 2.0)
        
        return {
            'gps_coordinates': {
                'latitude': round(lat, 6),
                'longitude': round(lon, 6)
            },
            'depth_meters': round(depth, 2),
            'sediment_thickness_cm': round(sediment_thickness, 2),
            'timestamp': time.time(),
            'boat_id': 'SurveyBoat-01'
        }
    
    def add_sediment_data(self, data):
        """Add new sediment measurement to dataset"""
        self.sediment_data.append(data)
        
        # Keep only last 1000 measurements to prevent memory issues
        if len(self.sediment_data) > 1000:
            self.sediment_data = self.sediment_data[-1000:]
    
    def analyze_sediment_buildup(self):
        """Analyze sediment patterns using clustering"""
        if len(self.sediment_data) < 10:
            return {
                'status': 'insufficient_data',
                'message': 'Need at least 10 data points for analysis'
            }
        
        # Convert to DataFrame for analysis
        df = pd.DataFrame(self.sediment_data)
        
        # Prepare features for clustering: [lat, lon, sediment_thickness]
        features = np.array([
            [point['gps_coordinates']['latitude'],
             point['gps_coordinates']['longitude'],
             point['sediment_thickness_cm']] 
            for point in self.sediment_data
        ])
        
        # Use DBSCAN to identify sediment hotspots
        clustering = DBSCAN(eps=0.01, min_samples=3).fit(features)
        
        # Analyze clusters
        unique_labels = set(clustering.labels_)
        n_clusters = len(unique_labels) - (1 if -1 in clustering.labels_ else 0)
        
        # Find high sediment areas
        high_sediment_threshold = 3.0  # cm
        high_sediment_points = [
            point for point in self.sediment_data 
            if point['sediment_thickness_cm'] > high_sediment_threshold
        ]
        
        return {
            'total_measurements': len(self.sediment_data),
            'sediment_clusters': n_clusters,
            'high_sediment_areas': len(high_sediment_points),
            'average_sediment_thickness': round(np.mean([p['sediment_thickness_cm'] for p in self.sediment_data]), 2),
            'max_sediment_thickness': max([p['sediment_thickness_cm'] for p in self.sediment_data]),
            'critical_areas': high_sediment_points[-5:] if high_sediment_points else [],
            'analysis_timestamp': time.time()
        }
    
    def get_sediment_map_summary(self):
        """Get summary of current sediment mapping"""
        analysis = self.analyze_sediment_buildup()
        
        # Determine alert level
        if len(self.sediment_data) > 0:
            avg_sediment = analysis.get('average_sediment_thickness', 0)
            if avg_sediment > 4.0:
                alert_level = 'HIGH'
                message = 'Significant sediment buildup detected - dredging recommended'
            elif avg_sediment > 2.5:
                alert_level = 'MEDIUM'
                message = 'Moderate sediment buildup - monitor closely'
            else:
                alert_level = 'LOW'
                message = 'Normal sediment levels'
        else:
            alert_level = 'UNKNOWN'
            message = 'No data available'
        
        return {
            'alert_level': alert_level,
            'message': message,
            'analysis': analysis
        }

# Initialize the sediment mapping system
mapping_system = SedimentMappingSystem()

@app.route('/status', methods=['GET'])
def get_status():
    """Health check endpoint"""
    return jsonify({
        'service': 'Autonomous Sediment Mapping Service',
        'status': 'running',
        'data_points_collected': len(mapping_system.sediment_data),
        'timestamp': time.time()
    })

@app.route('/collect-data', methods=['GET'])
def collect_sensor_data():
    """Simulate collecting data from boat sensors"""
    sensor_data = mapping_system.simulate_boat_sensor_data()
    mapping_system.add_sediment_data(sensor_data)
    
    logging.info(f"Collected sediment data at ({sensor_data['gps_coordinates']['latitude']}, "
                f"{sensor_data['gps_coordinates']['longitude']}) - "
                f"Sediment: {sensor_data['sediment_thickness_cm']}cm")
    
    return jsonify({
        'status': 'success',
        'data_collected': sensor_data,
        'total_points': len(mapping_system.sediment_data)
    })

@app.route('/sediment-analysis', methods=['GET'])
def get_sediment_analysis():
    """Get current sediment buildup analysis"""
    analysis = mapping_system.get_sediment_map_summary()
    
    logging.info(f"Sediment analysis - Alert Level: {analysis['alert_level']}")
    
    return jsonify(analysis)

@app.route('/submit-data', methods=['POST'])
def submit_sensor_data():
    """Accept external sensor data"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['gps_coordinates', 'depth_meters', 'sediment_thickness_cm']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Add timestamp if not provided
        if 'timestamp' not in data:
            data['timestamp'] = time.time()
        
        mapping_system.add_sediment_data(data)
        
        return jsonify({
            'status': 'success',
            'message': 'Sediment data recorded',
            'total_points': len(mapping_system.sediment_data)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logging.info("Starting Autonomous Sediment Mapping Service...")
    app.run(host='0.0.0.0', port=5002, debug=True)
