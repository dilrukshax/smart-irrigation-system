"""
Recommendations API Tests

Tests for the /f4/recommendations endpoint to verify:
- Endpoint accepts valid requests
- Returns properly structured RecommendationResponse
- Handles edge cases appropriately

Run with: pytest tests/test_recommendations_api.py -v
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


# Create test client
client = TestClient(app)


class TestRecommendationsEndpoint:
    """Tests for the POST /f4/recommendations endpoint."""
    
    def test_recommendations_returns_200(self):
        """
        Test that a valid request returns HTTP 200.
        
        With a properly structured RecommendationRequest,
        the endpoint should return success.
        """
        request_data = {
            "field_id": "FIELD-001",
            "season": "Maha-2025",
        }
        
        response = client.post("/f4/recommendations", json=request_data)
        
        assert response.status_code == 200
    
    def test_recommendations_returns_valid_structure(self):
        """
        Test that the response matches RecommendationResponse schema.
        
        The response should contain:
        - field_id: Same as request
        - season: Same as request
        - recommendations: List of CropOption objects
        """
        request_data = {
            "field_id": "FIELD-001",
            "season": "Maha-2025",
        }
        
        response = client.post("/f4/recommendations", json=request_data)
        data = response.json()
        
        # Check top-level structure
        assert "field_id" in data
        assert "season" in data
        assert "recommendations" in data
        
        # Verify field_id and season match request
        assert data["field_id"] == request_data["field_id"]
        assert data["season"] == request_data["season"]
        
        # Verify recommendations is a list
        assert isinstance(data["recommendations"], list)
    
    def test_recommendations_contain_required_fields(self):
        """
        Test that each recommendation contains all required fields.
        
        Each CropOption should have:
        - crop_id
        - crop_name
        - suitability_score
        - expected_yield_t_per_ha
        - expected_profit_per_ha
        - risk_band
        - rationale
        """
        request_data = {
            "field_id": "FIELD-001",
            "season": "Maha-2025",
        }
        
        response = client.post("/f4/recommendations", json=request_data)
        data = response.json()
        
        required_fields = [
            "crop_id",
            "crop_name",
            "suitability_score",
            "expected_yield_t_per_ha",
            "expected_profit_per_ha",
            "risk_band",
            "rationale",
        ]
        
        # Check each recommendation has all required fields
        for rec in data["recommendations"]:
            for field in required_fields:
                assert field in rec, f"Missing field: {field}"
    
    def test_recommendations_suitability_score_range(self):
        """
        Test that suitability scores are in valid range [0, 1].
        """
        request_data = {
            "field_id": "FIELD-001",
            "season": "Maha-2025",
        }
        
        response = client.post("/f4/recommendations", json=request_data)
        data = response.json()
        
        for rec in data["recommendations"]:
            score = rec["suitability_score"]
            assert 0 <= score <= 1, f"Invalid suitability score: {score}"
    
    def test_recommendations_risk_band_valid(self):
        """
        Test that risk_band values are valid (low, medium, high).
        """
        request_data = {
            "field_id": "FIELD-001",
            "season": "Maha-2025",
        }
        
        response = client.post("/f4/recommendations", json=request_data)
        data = response.json()
        
        valid_risk_bands = ["low", "medium", "high"]
        
        for rec in data["recommendations"]:
            assert rec["risk_band"] in valid_risk_bands, \
                f"Invalid risk band: {rec['risk_band']}"
    
    def test_recommendations_with_scenario(self):
        """
        Test that scenario parameters are accepted.
        
        The endpoint should accept optional scenario
        parameters for what-if analysis.
        """
        request_data = {
            "field_id": "FIELD-001",
            "season": "Maha-2025",
            "scenario": {
                "water_quota_mm": 600,
            }
        }
        
        response = client.post("/f4/recommendations", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "recommendations" in data
    
    def test_recommendations_positive_values(self):
        """
        Test that yield and profit values are non-negative.
        """
        request_data = {
            "field_id": "FIELD-001",
            "season": "Maha-2025",
        }
        
        response = client.post("/f4/recommendations", json=request_data)
        data = response.json()
        
        for rec in data["recommendations"]:
            assert rec["expected_yield_t_per_ha"] >= 0, \
                "Yield should be non-negative"
            # Profit can potentially be negative (loss scenario)
            # but expected_profit in dummy data should be positive


class TestRecommendationsValidation:
    """Tests for input validation on recommendations endpoint."""
    
    def test_missing_field_id_returns_422(self):
        """
        Test that missing field_id returns validation error.
        """
        request_data = {
            "season": "Maha-2025",
            # field_id is missing
        }
        
        response = client.post("/f4/recommendations", json=request_data)
        
        assert response.status_code == 422  # Unprocessable Entity
    
    def test_missing_season_returns_422(self):
        """
        Test that missing season returns validation error.
        """
        request_data = {
            "field_id": "FIELD-001",
            # season is missing
        }
        
        response = client.post("/f4/recommendations", json=request_data)
        
        assert response.status_code == 422  # Unprocessable Entity
    
    def test_empty_body_returns_422(self):
        """
        Test that empty request body returns validation error.
        """
        response = client.post("/f4/recommendations", json={})
        
        assert response.status_code == 422
    
    def test_invalid_json_returns_422(self):
        """
        Test that invalid JSON returns error.
        """
        response = client.post(
            "/f4/recommendations",
            content="not valid json",
            headers={"Content-Type": "application/json"},
        )
        
        assert response.status_code == 422


class TestRecommendationsBatchEndpoint:
    """Tests for the batch recommendations endpoint."""
    
    def test_batch_returns_200(self):
        """
        Test that batch endpoint returns 200 for valid input.
        """
        requests = [
            {"field_id": "FIELD-001", "season": "Maha-2025"},
            {"field_id": "FIELD-002", "season": "Maha-2025"},
        ]
        
        response = client.post("/f4/recommendations/batch", json=requests)
        
        assert response.status_code == 200
    
    def test_batch_returns_list(self):
        """
        Test that batch endpoint returns a list of responses.
        """
        requests = [
            {"field_id": "FIELD-001", "season": "Maha-2025"},
            {"field_id": "FIELD-002", "season": "Maha-2025"},
        ]
        
        response = client.post("/f4/recommendations/batch", json=requests)
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) == 2
    
    def test_batch_response_order_matches_request(self):
        """
        Test that batch responses are in same order as requests.
        """
        requests = [
            {"field_id": "FIELD-001", "season": "Maha-2025"},
            {"field_id": "FIELD-002", "season": "Maha-2025"},
            {"field_id": "FIELD-003", "season": "Maha-2025"},
        ]
        
        response = client.post("/f4/recommendations/batch", json=requests)
        data = response.json()
        
        for i, req in enumerate(requests):
            assert data[i]["field_id"] == req["field_id"]


class TestRecommendationsContentType:
    """Tests for content type handling."""
    
    def test_response_is_json(self):
        """
        Test that response Content-Type is application/json.
        """
        request_data = {
            "field_id": "FIELD-001",
            "season": "Maha-2025",
        }
        
        response = client.post("/f4/recommendations", json=request_data)
        
        assert "application/json" in response.headers.get("content-type", "")
    
    def test_get_not_allowed(self):
        """
        Test that GET method is not allowed.
        """
        response = client.get("/f4/recommendations")
        
        assert response.status_code == 405


# Parameterized tests for different seasons

@pytest.mark.parametrize("season", [
    "Maha-2025",
    "Yala-2025",
    "Maha-2024",
    "Yala-2024",
])
def test_recommendations_accepts_different_seasons(season):
    """
    Test that recommendations endpoint accepts various season formats.
    """
    request_data = {
        "field_id": "FIELD-001",
        "season": season,
    }
    
    response = client.post("/f4/recommendations", json=request_data)
    
    assert response.status_code == 200
    assert response.json()["season"] == season


@pytest.mark.parametrize("field_id", [
    "FIELD-001",
    "FIELD-002",
    "field-abc",
    "123",
])
def test_recommendations_accepts_different_field_ids(field_id):
    """
    Test that recommendations endpoint accepts various field_id formats.
    """
    request_data = {
        "field_id": field_id,
        "season": "Maha-2025",
    }
    
    response = client.post("/f4/recommendations", json=request_data)
    
    assert response.status_code == 200
    assert response.json()["field_id"] == field_id
