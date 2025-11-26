"""
Tests for admin endpoints.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock
from bson import ObjectId
from datetime import datetime, timezone

# Test data
ADMIN_USER_ID = str(ObjectId())
REGULAR_USER_ID = str(ObjectId())

ADMIN_USER = {
    "_id": ObjectId(ADMIN_USER_ID),
    "username": "admin",
    "email": "admin@example.com",
    "hashed_password": "hashed",
    "roles": ["admin", "user"],
    "is_active": True,
    "created_at": datetime.now(timezone.utc),
    "updated_at": datetime.now(timezone.utc),
}

REGULAR_USER = {
    "_id": ObjectId(REGULAR_USER_ID),
    "username": "regularuser",
    "email": "regular@example.com",
    "hashed_password": "hashed",
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


@pytest.fixture
def admin_token():
    """Create an admin token."""
    from app.core.security import create_access_token
    return create_access_token({
        "sub": ADMIN_USER_ID,
        "username": "admin",
        "roles": ["admin", "user"]
    })


@pytest.fixture
def user_token():
    """Create a regular user token."""
    from app.core.security import create_access_token
    return create_access_token({
        "sub": REGULAR_USER_ID,
        "username": "regularuser",
        "roles": ["user"]
    })


@pytest.mark.asyncio
async def test_list_users_as_admin(app_with_mock_db, admin_token):
    """Test listing users as admin."""
    app, mock_collection = app_with_mock_db
    
    # Mock find_one for admin user validation
    mock_collection.find_one = AsyncMock(return_value=ADMIN_USER)
    
    # Mock count_documents
    mock_collection.count_documents = AsyncMock(return_value=2)
    
    # Mock find with cursor
    mock_cursor = MagicMock()
    mock_cursor.skip = MagicMock(return_value=mock_cursor)
    mock_cursor.limit = MagicMock(return_value=mock_cursor)
    mock_cursor.sort = MagicMock(return_value=mock_cursor)
    mock_cursor.to_list = AsyncMock(return_value=[ADMIN_USER, REGULAR_USER])
    mock_collection.find = MagicMock(return_value=mock_cursor)
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.get(
            "/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["users"]) == 2


@pytest.mark.asyncio
async def test_list_users_as_regular_user(app_with_mock_db, user_token):
    """Test listing users as regular user (should fail)."""
    app, mock_collection = app_with_mock_db
    
    # Mock find_one for user validation
    mock_collection.find_one = AsyncMock(return_value=REGULAR_USER)
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.get(
            "/api/admin/users",
            headers={"Authorization": f"Bearer {user_token}"}
        )
    
    assert response.status_code == 403
    assert "Admin privileges required" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_user_by_id(app_with_mock_db, admin_token):
    """Test getting a specific user by ID."""
    app, mock_collection = app_with_mock_db
    
    # First call returns admin (for auth), second returns the requested user
    mock_collection.find_one = AsyncMock(side_effect=[ADMIN_USER, REGULAR_USER])
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.get(
            f"/api/admin/users/{REGULAR_USER_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "regularuser"


@pytest.mark.asyncio
async def test_get_user_not_found(app_with_mock_db, admin_token):
    """Test getting a non-existent user."""
    app, mock_collection = app_with_mock_db
    
    # First call returns admin (for auth), second returns None
    mock_collection.find_one = AsyncMock(side_effect=[ADMIN_USER, None])
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.get(
            f"/api/admin/users/{str(ObjectId())}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_user_roles(app_with_mock_db, admin_token):
    """Test updating user roles."""
    app, mock_collection = app_with_mock_db
    
    updated_user = REGULAR_USER.copy()
    updated_user["roles"] = ["farmer", "user"]
    
    # Mock find_one for auth and then for user lookup
    mock_collection.find_one = AsyncMock(side_effect=[ADMIN_USER, REGULAR_USER, updated_user])
    
    # Mock update_one
    mock_result = MagicMock()
    mock_result.modified_count = 1
    mock_collection.update_one = AsyncMock(return_value=mock_result)
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.patch(
            f"/api/admin/users/{REGULAR_USER_ID}/role",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"roles": ["farmer", "user"]}
        )
    
    assert response.status_code == 200
    data = response.json()
    assert "farmer" in data["roles"]


@pytest.mark.asyncio
async def test_admin_cannot_remove_own_admin_role(app_with_mock_db, admin_token):
    """Test that admin cannot remove their own admin role."""
    app, mock_collection = app_with_mock_db
    
    # Mock find_one returns admin user for both auth and lookup
    mock_collection.find_one = AsyncMock(return_value=ADMIN_USER)
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.patch(
            f"/api/admin/users/{ADMIN_USER_ID}/role",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"roles": ["user"]}  # Removing admin role
        )
    
    assert response.status_code == 400
    assert "Cannot remove your own admin role" in response.json()["detail"]


@pytest.mark.asyncio
async def test_update_user_status(app_with_mock_db, admin_token):
    """Test updating user status."""
    app, mock_collection = app_with_mock_db
    
    updated_user = REGULAR_USER.copy()
    updated_user["is_active"] = False
    
    mock_collection.find_one = AsyncMock(side_effect=[ADMIN_USER, REGULAR_USER, updated_user])
    
    mock_result = MagicMock()
    mock_result.modified_count = 1
    mock_collection.update_one = AsyncMock(return_value=mock_result)
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.patch(
            f"/api/admin/users/{REGULAR_USER_ID}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_active": False}
        )
    
    assert response.status_code == 200
    data = response.json()
    assert data["is_active"] is False


@pytest.mark.asyncio
async def test_admin_cannot_deactivate_self(app_with_mock_db, admin_token):
    """Test that admin cannot deactivate their own account."""
    app, mock_collection = app_with_mock_db
    
    mock_collection.find_one = AsyncMock(return_value=ADMIN_USER)
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.patch(
            f"/api/admin/users/{ADMIN_USER_ID}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_active": False}
        )
    
    assert response.status_code == 400
    assert "Cannot deactivate your own account" in response.json()["detail"]


@pytest.mark.asyncio
async def test_delete_user_soft(app_with_mock_db, admin_token):
    """Test soft deleting a user."""
    app, mock_collection = app_with_mock_db
    
    mock_collection.find_one = AsyncMock(side_effect=[ADMIN_USER, REGULAR_USER])
    
    mock_result = MagicMock()
    mock_result.modified_count = 1
    mock_collection.update_one = AsyncMock(return_value=mock_result)
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.delete(
            f"/api/admin/users/{REGULAR_USER_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_delete_user_hard(app_with_mock_db, admin_token):
    """Test hard deleting a user."""
    app, mock_collection = app_with_mock_db
    
    mock_collection.find_one = AsyncMock(side_effect=[ADMIN_USER, REGULAR_USER])
    
    mock_result = MagicMock()
    mock_result.deleted_count = 1
    mock_collection.delete_one = AsyncMock(return_value=mock_result)
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.delete(
            f"/api/admin/users/{REGULAR_USER_ID}?hard_delete=true",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_admin_cannot_delete_self(app_with_mock_db, admin_token):
    """Test that admin cannot delete their own account."""
    app, mock_collection = app_with_mock_db
    
    mock_collection.find_one = AsyncMock(return_value=ADMIN_USER)
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.delete(
            f"/api/admin/users/{ADMIN_USER_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    assert response.status_code == 400
    assert "Cannot delete your own account" in response.json()["detail"]


@pytest.mark.asyncio
async def test_list_users_with_pagination(app_with_mock_db, admin_token):
    """Test user listing with pagination parameters."""
    app, mock_collection = app_with_mock_db
    
    mock_collection.find_one = AsyncMock(return_value=ADMIN_USER)
    mock_collection.count_documents = AsyncMock(return_value=50)
    
    mock_cursor = MagicMock()
    mock_cursor.skip = MagicMock(return_value=mock_cursor)
    mock_cursor.limit = MagicMock(return_value=mock_cursor)
    mock_cursor.sort = MagicMock(return_value=mock_cursor)
    mock_cursor.to_list = AsyncMock(return_value=[REGULAR_USER])
    mock_collection.find = MagicMock(return_value=mock_cursor)
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.get(
            "/api/admin/users?page=2&limit=5",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 2
    assert data["limit"] == 5
    assert data["total"] == 50
    assert data["pages"] == 10


@pytest.mark.asyncio
async def test_list_users_with_search(app_with_mock_db, admin_token):
    """Test user listing with search parameter."""
    app, mock_collection = app_with_mock_db
    
    mock_collection.find_one = AsyncMock(return_value=ADMIN_USER)
    mock_collection.count_documents = AsyncMock(return_value=1)
    
    mock_cursor = MagicMock()
    mock_cursor.skip = MagicMock(return_value=mock_cursor)
    mock_cursor.limit = MagicMock(return_value=mock_cursor)
    mock_cursor.sort = MagicMock(return_value=mock_cursor)
    mock_cursor.to_list = AsyncMock(return_value=[REGULAR_USER])
    mock_collection.find = MagicMock(return_value=mock_cursor)
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.get(
            "/api/admin/users?search=regular",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
