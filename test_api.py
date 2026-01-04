#!/usr/bin/env python
"""Quick test script for IoT API"""
import requests
import json

def test_api():
    base_url = "http://localhost:8006"
    
    # Test health
    print("Testing /health...")
    try:
        r = requests.get(f"{base_url}/health", timeout=5)
        print(f"  Status: {r.status_code}")
        print(f"  Response: {json.dumps(r.json(), indent=2)}")
    except Exception as e:
        print(f"  Error: {e}")
    
    print("\nTesting /api/v1/iot/devices...")
    try:
        r = requests.get(f"{base_url}/api/v1/iot/devices", timeout=5)
        print(f"  Status: {r.status_code}")
        print(f"  Response: {json.dumps(r.json(), indent=2)}")
    except Exception as e:
        print(f"  Error: {e}")

if __name__ == "__main__":
    test_api()
