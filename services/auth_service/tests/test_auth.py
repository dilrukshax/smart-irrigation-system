"""
Tests for authentication endpoints.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch, MagicMock
from bson import ObjectId
from datetime import datetime, timezone

# Test data
TEST_USER_ID = str(ObjectId())
TEST_USER = {
    "_id": ObjectId(TEST_USER_ID),
    "username": "testuser",
    "email": "test@example.com",
    "hashed_password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.NnXVDp1UjH9XAG",  # "password123"
    "roles": ["user"],
    "is_active": True,
    "created_at": datetime.now(timezone.utc),
    "updated_at": datetime.now(timezone.utc),
}


@pytest.fixture
def mock_db():
    """Create a mock database."""
    mock_collection = AsyncMock()
    mock_database = MagicMock()
    mock_database.__getitem__ = MagicMock(return_value=mock_collection)
    return mock_database, mock_collection


@pytest.fixture
def app_with_mock_db(mock_db):
    """Create app with mocked database."""
    from app.main import app
    from app.db import mongo
    
    mock_database, mock_collection = mock_db
    mongo.db.database = mock_database
    
    return app, mock_collection


@pytest.mark.asyncio
async def test_register_success(app_with_mock_db):
    """Test successful user registration."""
    app, mock_collection = app_with_mock_db
    
    # Mock insert_one to return a result with inserted_id
    mock_result = MagicMock()
    mock_result.inserted_id = ObjectId()
    mock_collection.insert_one = AsyncMock(return_value=mock_result)
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/auth/register",
            json={
                "username": "newuser",
                "password": "password123",
                "email": "newuser@example.com"
            }
        )
    
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "newuser"
    assert data["email"] == "newuser@example.com"
    assert data["roles"] == ["user"]
    assert data["is_active"] is True
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_username(app_with_mock_db):
    """Test registration with duplicate username."""
    from pymongo.errors import DuplicateKeyError
    
    app, mock_collection = app_with_mock_db
    
    # Mock insert_one to raise DuplicateKeyError
    mock_collection.insert_one = AsyncMock(
        side_effect=DuplicateKeyError("username_1 dup key")
    )
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/auth/register",
            json={
                "username": "existinguser",
                "password": "password123"
            }
        )
    
    assert response.status_code == 409
    assert "Username already exists" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_success(app_with_mock_db):
    """Test successful login."""
    app, mock_collection = app_with_mock_db
    
    # Create a user with known password hash
    from app.core.security import hash_password
    test_user = TEST_USER.copy()
    test_user["hashed_password"] = hash_password("password123")
    
    mock_collection.find_one = AsyncMock(return_value=test_user)
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/auth/login",
            json={
                "username": "testuser",
                "password": "password123"
            }
        )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "testuser"


@pytest.mark.asyncio
async def test_login_invalid_password(app_with_mock_db):
    """Test login with invalid password."""
    app, mock_collection = app_with_mock_db
    
    from app.core.security import hash_password
    test_user = TEST_USER.copy()
    test_user["hashed_password"] = hash_password("password123")
    
    mock_collection.find_one = AsyncMock(return_value=test_user)
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/auth/login",
            json={
                "username": "testuser",
                "password": "wrongpassword"
            }
        )
    
    assert response.status_code == 401
    assert "Invalid username or password" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_user_not_found(app_with_mock_db):
    """Test login with non-existent user."""
    app, mock_collection = app_with_mock_db
    
    mock_collection.find_one = AsyncMock(return_value=None)
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/auth/login",
            json={
                "username": "nonexistent",
                "password": "password123"
            }
        )
    
    assert response.status_code == 401
    assert "Invalid username or password" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_inactive_user(app_with_mock_db):
    """Test login with deactivated user."""
    app, mock_collection = app_with_mock_db
    
    from app.core.security import hash_password
    test_user = TEST_USER.copy()
    test_user["hashed_password"] = hash_password("password123")
    test_user["is_active"] = False
    
    mock_collection.find_one = AsyncMock(return_value=test_user)
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/auth/login",
            json={
                "username": "testuser",
                "password": "password123"
            }
        )
    
    assert response.status_code == 403
    assert "deactivated" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_me_success(app_with_mock_db):
    """Test getting current user info with valid token."""
    app, mock_collection = app_with_mock_db
    
    from app.core.security import create_access_token
    
    # Create a valid token
    token = create_access_token({
        "sub": TEST_USER_ID,
        "username": "testuser",
        "roles": ["user"]
    })
    
    mock_collection.find_one = AsyncMock(return_value=TEST_USER)
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
    
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert data["roles"] == ["user"]


@pytest.mark.asyncio
async def test_get_me_invalid_token(app_with_mock_db):
    """Test getting current user with invalid token."""
    app, mock_collection = app_with_mock_db
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
    
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_no_token(app_with_mock_db):
    """Test getting current user without token."""
    app, mock_collection = app_with_mock_db
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.get("/api/auth/me")
    
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_refresh_token_success(app_with_mock_db):
    """Test successful token refresh."""
    app, mock_collection = app_with_mock_db
    
    from app.core.security import create_refresh_token
    
    # Create a valid refresh token
    refresh_token = create_refresh_token({
        "sub": TEST_USER_ID,
        "username": "testuser",
        "roles": ["user"]
    })
    
    mock_collection.find_one = AsyncMock(return_value=TEST_USER)
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token}
        )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_refresh_token_invalid(app_with_mock_db):
    """Test token refresh with invalid token."""
    app, mock_collection = app_with_mock_db
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/auth/refresh",
            json={"refresh_token": "invalid_token"}
        )
    
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_health_check(app_with_mock_db):
    """Test health check endpoint."""
    app, _ = app_with_mock_db
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.get("/health")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
