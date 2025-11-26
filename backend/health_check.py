#!/usr/bin/env python3
"""
Health check script for Smart Irrigation System
Tests all microservices and their endpoints
"""

import requests
import time
import json
from datetime import datetime

class SystemHealthChecker:
    def __init__(self):
        self.services = {
            'irrigation-service': 'http://localhost:5001',
            'sediment-mapping-service': 'http://localhost:5002',
            'forecasting-service': 'http://localhost:5003'
        }
        self.results = {}
    
    def check_service_health(self, service_name, base_url):
        """Check health of a specific service"""
        print(f"\n🔍 Testing {service_name}...")
        results = {}
        
        try:
            # Test status endpoint
            response = requests.get(f"{base_url}/status", timeout=5)
            results['status'] = {
                'code': response.status_code,
                'data': response.json() if response.status_code == 200 else None
            }
            
            if response.status_code == 200:
                print(f"  ✅ Status endpoint: OK")
            else:
                print(f"  ❌ Status endpoint: Failed ({response.status_code})")
            
        except Exception as e:
            results['status'] = {'error': str(e)}
            print(f"  ❌ Status endpoint: Error - {e}")
        
        # Test service-specific endpoints
        if service_name == 'irrigation-service':
            results.update(self._test_irrigation_endpoints(base_url))
        elif service_name == 'sediment-mapping-service':
            results.update(self._test_sediment_endpoints(base_url))
        elif service_name == 'forecasting-service':
            results.update(self._test_forecasting_endpoints(base_url))
        
        return results
    
    def _test_irrigation_endpoints(self, base_url):
        """Test irrigation service specific endpoints"""
        results = {}
        
        try:
            # Test sensor data endpoint
            response = requests.get(f"{base_url}/sensor-data", timeout=5)
            results['sensor_data'] = {
                'code': response.status_code,
                'data': response.json() if response.status_code == 200 else None
            }
            
            if response.status_code == 200:
                print(f"  ✅ Sensor data endpoint: OK")
                data = response.json()
                if 'prediction' in data and 'sensor_data' in data:
                    print(f"    📊 Soil moisture: {data['sensor_data']['soil_moisture']}%")
                    print(f"    🌡️  Temperature: {data['sensor_data']['temperature']}°C")
                    print(f"    💧 Recommendation: {data['prediction']['recommendation']}")
            else:
                print(f"  ❌ Sensor data endpoint: Failed ({response.status_code})")
                
        except Exception as e:
            results['sensor_data'] = {'error': str(e)}
            print(f"  ❌ Sensor data endpoint: Error - {e}")
        
        return results
    
    def _test_sediment_endpoints(self, base_url):
        """Test sediment mapping service specific endpoints"""
        results = {}
        
        try:
            # Test data collection endpoint
            response = requests.get(f"{base_url}/collect-data", timeout=5)
            results['collect_data'] = {
                'code': response.status_code,
                'data': response.json() if response.status_code == 200 else None
            }
            
            if response.status_code == 200:
                print(f"  ✅ Data collection endpoint: OK")
                
            # Test sediment analysis
            response = requests.get(f"{base_url}/sediment-analysis", timeout=5)
            results['sediment_analysis'] = {
                'code': response.status_code,
                'data': response.json() if response.status_code == 200 else None
            }
            
            if response.status_code == 200:
                print(f"  ✅ Sediment analysis endpoint: OK")
                data = response.json()
                if 'alert_level' in data:
                    print(f"    🚨 Alert level: {data['alert_level']}")
                    if 'analysis' in data and 'total_measurements' in data['analysis']:
                        print(f"    📈 Data points: {data['analysis']['total_measurements']}")
            else:
                print(f"  ❌ Sediment analysis endpoint: Failed ({response.status_code})")
                
        except Exception as e:
            results['collect_data'] = {'error': str(e)}
            print(f"  ❌ Sediment endpoints: Error - {e}")
        
        return results
    
    def _test_forecasting_endpoints(self, base_url):
        """Test forecasting service specific endpoints"""
        results = {}
        
        try:
            # Test current data endpoint
            response = requests.get(f"{base_url}/current-data", timeout=5)
            results['current_data'] = {
                'code': response.status_code,
                'data': response.json() if response.status_code == 200 else None
            }
            
            if response.status_code == 200:
                print(f"  ✅ Current data endpoint: OK")
                
            # Test forecast endpoint
            response = requests.get(f"{base_url}/forecast?hours=12", timeout=5)
            results['forecast'] = {
                'code': response.status_code,
                'data': response.json() if response.status_code == 200 else None
            }
            
            if response.status_code == 200:
                print(f"  ✅ Forecast endpoint: OK")
                
            # Test risk assessment
            response = requests.get(f"{base_url}/risk-assessment", timeout=5)
            results['risk_assessment'] = {
                'code': response.status_code,
                'data': response.json() if response.status_code == 200 else None
            }
            
            if response.status_code == 200:
                print(f"  ✅ Risk assessment endpoint: OK")
                data = response.json()
                if 'flood_risk' in data and 'drought_risk' in data:
                    print(f"    🌊 Flood risk: {data['flood_risk']}")
                    print(f"    🏜️  Drought risk: {data['drought_risk']}")
                    if data.get('alerts'):
                        for alert in data['alerts']:
                            print(f"    ⚠️  Alert: {alert}")
            else:
                print(f"  ❌ Risk assessment endpoint: Failed ({response.status_code})")
                
        except Exception as e:
            results['forecasting'] = {'error': str(e)}
            print(f"  ❌ Forecasting endpoints: Error - {e}")
        
        return results
    
    def run_full_health_check(self):
        """Run complete health check on all services"""
        print("🌾 Smart Irrigation System - Health Check")
        print("=" * 50)
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        all_healthy = True
        
        for service_name, base_url in self.services.items():
            results = self.check_service_health(service_name, base_url)
            self.results[service_name] = results
            
            # Check if service is healthy
            if 'status' not in results or results['status'].get('code') != 200:
                all_healthy = False
        
        print("\n" + "=" * 50)
        if all_healthy:
            print("🎉 All services are healthy!")
        else:
            print("⚠️  Some services have issues - check logs above")
        
        print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        return self.results
    
    def generate_report(self):
        """Generate a summary report"""
        print("\n📊 SYSTEM HEALTH SUMMARY")
        print("-" * 30)
        
        for service_name, results in self.results.items():
            status = results.get('status', {})
            if status.get('code') == 200:
                print(f"✅ {service_name}: HEALTHY")
            else:
                print(f"❌ {service_name}: UNHEALTHY")
                if 'error' in status:
                    print(f"   Error: {status['error']}")

if __name__ == "__main__":
    checker = SystemHealthChecker()
    results = checker.run_full_health_check()
    checker.generate_report()
    
    # Save results to file
    with open('health_check_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'results': results
        }, f, indent=2)
    
    print(f"\n💾 Results saved to: health_check_results.json")
