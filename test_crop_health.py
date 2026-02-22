"""
Test script for the crop health validation system.
Tests ocean, urban, and agricultural coordinates.
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8002/api/v1/crop-health"

def test_location(name, lat, lon, expected_result, area_km2=10, num_zones=6):
    print(f"\n{'='*60}")
    print(f"TEST: {name}")
    print(f"Coordinates: ({lat}, {lon})")
    print(f"Expected: {expected_result}")
    print('='*60)
    
    try:
        response = requests.post(
            f"{BASE_URL}/analyze",
            json={
                "lat": lat,
                "lon": lon,
                "area_km2": area_km2,
                "num_zones": num_zones
            },
            timeout=30
        )
        
        print(f"HTTP Status: {response.status_code}")
        data = response.json()
        
        if response.status_code == 200:
            # Success case
            print(f"✅ SUCCESS - Analysis completed")
            print(f"   Zones: {data['summary']['total_zones']}")
            print(f"   Healthy: {data['summary']['healthy_count']}")
            validation = data.get('validation', {})
            print(f"   Vegetation: {validation.get('vegetation_percentage', 'N/A')}%")
            print(f"   Land Cover: {validation.get('land_cover_type', 'N/A')}")
        elif response.status_code == 422:
            # Validation error
            print(f"❌ REJECTED - {data.get('status', 'Unknown')}")
            print(f"   Message: {data.get('message', 'N/A')}")
            validation = data.get('validation', {})
            if validation:
                print(f"   Vegetation: {validation.get('vegetation_percentage', 'N/A')}%")
                print(f"   Land Cover: {validation.get('land_cover_type', 'N/A')}")
            if data.get('suggestions'):
                print(f"   Suggestions:")
                for s in data['suggestions'][:2]:
                    print(f"      - {s}")
        else:
            print(f"⚠️ UNEXPECTED STATUS: {response.status_code}")
            print(json.dumps(data, indent=2)[:500])
            
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Could not connect to service. Is it running?")
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("CROP HEALTH VALIDATION SYSTEM - TEST SUITE")
    print("="*60)
    
    # Test 1: Ocean (should reject as WATER_BODY)
    test_location(
        "Ocean - Indian Ocean",
        lat=5.0, lon=79.5,
        expected_result="REJECT (WATER_BODY)"
    )
    
    # Test 2: Urban area (should reject as URBAN_AREA)
    test_location(
        "Urban - Colombo City",
        lat=6.927, lon=79.861,
        expected_result="REJECT (URBAN_AREA)",
        area_km2=5
    )
    
    # Test 3: Agricultural area (should accept)
    test_location(
        "Agricultural - Udawalawa",
        lat=6.44, lon=80.88,
        expected_result="ACCEPT (VALID)"
    )
    
    # Test 4: Another agricultural area
    test_location(
        "Agricultural - Mahaweli Zone",
        lat=7.35, lon=80.65,
        expected_result="ACCEPT (VALID)"
    )
    
    print("\n" + "="*60)
    print("TEST SUITE COMPLETED")
    print("="*60 + "\n")
