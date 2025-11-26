"""
Health Endpoint Tests

Tests for the /health endpoint to verify:
- Service is running and responsive
- Returns correct status and service name
- Response format is valid JSON

Run with: pytest tests/test_health.py -v
"""

import pytest
from fastapi.testclient import TestClient

from src.main import app


# Create test client
client = TestClient(app)


class TestHealthEndpoint:
    """Tests for the /health endpoint."""
    
    def test_health_check_returns_200(self):
        """
        Test that the health check endpoint returns HTTP 200.
        
        The health endpoint should always return 200 when the 
        service is running correctly.
        """
        response = client.get("/health")
        
        assert response.status_code == 200
    
    def test_health_check_returns_ok_status(self):
        """
        Test that the health check returns status: ok.
        
        The response should contain a 'status' field with value 'ok'
        indicating the service is healthy.
        """
        response = client.get("/health")
        data = response.json()
        
        assert "status" in data
        assert data["status"] == "ok"
    
    def test_health_check_returns_service_name(self):
        """
        Test that the health check returns the service name.
        
        The response should contain a 'service' field identifying
        this as the aca-o-service.
        """
        response = client.get("/health")
        data = response.json()
        
        assert "service" in data
        assert data["service"] == "aca-o-service"
    
    def test_health_check_response_structure(self):
        """
        Test the complete structure of the health check response.
        
        Verifies the response contains all expected fields with
        correct values.
        """
        response = client.get("/health")
        data = response.json()
        
        expected = {
            "status": "ok",
            "service": "aca-o-service",
        }
        
        assert data == expected
    
    def test_health_check_content_type(self):
        """
        Test that the response Content-Type is JSON.
        """
        response = client.get("/health")
        
        assert "application/json" in response.headers.get("content-type", "")


class TestReadinessEndpoint:
    """Tests for the /health/ready endpoint."""
    
    def test_readiness_check_returns_200(self):
        """
        Test that the readiness check returns HTTP 200.
        """
        response = client.get("/health/ready")
        
        assert response.status_code == 200
    
    def test_readiness_check_contains_status(self):
        """
        Test that readiness check contains a status field.
        """
        response = client.get("/health/ready")
        data = response.json()
        
        assert "status" in data
        assert data["status"] in ["ready", "not_ready"]
    
    def test_readiness_check_contains_checks(self):
        """
        Test that readiness check contains individual check results.
        """
        response = client.get("/health/ready")
        data = response.json()
        
        assert "checks" in data
        assert isinstance(data["checks"], dict)


class TestLivenessEndpoint:
    """Tests for the /health/live endpoint."""
    
    def test_liveness_check_returns_200(self):
        """
        Test that the liveness check returns HTTP 200.
        """
        response = client.get("/health/live")
        
        assert response.status_code == 200
    
    def test_liveness_check_returns_alive(self):
        """
        Test that the liveness check indicates the service is alive.
        """
        response = client.get("/health/live")
        data = response.json()
        
        assert data["status"] == "alive"


# Additional test cases for edge cases

class TestHealthEndpointEdgeCases:
    """Edge case tests for health endpoints."""
    
    def test_health_endpoint_is_idempotent(self):
        """
        Test that multiple calls return the same result.
        
        Health checks should be idempotent - calling them
        multiple times should not change the result.
        """
        response1 = client.get("/health")
        response2 = client.get("/health")
        response3 = client.get("/health")
        
        assert response1.json() == response2.json() == response3.json()
    
    def test_health_post_not_allowed(self):
        """
        Test that POST method is not allowed on health endpoint.
        """
        response = client.post("/health")
        
        assert response.status_code == 405  # Method Not Allowed
    
    def test_health_no_auth_required(self):
        """
        Test that health endpoint does not require authentication.
        
        Health endpoints should be publicly accessible for
        load balancers and monitoring systems.
        """
        # Simply making a request without any auth headers should work
        response = client.get("/health")
        
        assert response.status_code == 200
