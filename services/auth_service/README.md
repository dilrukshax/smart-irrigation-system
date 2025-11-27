# Auth Service

A FastAPI-based authentication microservice for the Smart Irrigation System.

## Features

- **User Registration**: Create new user accounts
- **JWT Authentication**: Secure login with access and refresh tokens
- **Role-Based Access Control**: Support for dynamic roles (admin, farmer, officer, etc.)
- **Admin User Management**: Manage users, roles, and account status
- **MongoDB Integration**: Persistent user storage with Motor async driver
- **Password Security**: Bcrypt hashing for secure password storage

## Project Structure

```
auth_service/
├── app/
│   ├── main.py                 # FastAPI application entry point
│   ├── core/
│   │   ├── config.py           # Application settings
│   │   └── security.py         # JWT & password utilities
│   ├── db/
│   │   └── mongo.py            # MongoDB connection
│   ├── models/
│   │   └── user.py             # User model structure
│   ├── schemas/
│   │   ├── auth.py             # Auth request/response schemas
│   │   └── user.py             # User schemas
│   ├── api/
│   │   └── routes/
│   │       ├── auth.py         # Auth endpoints
│   │       └── admin.py        # Admin endpoints
│   └── dependencies/
│       └── auth.py             # Auth dependencies
├── tests/
│   ├── test_auth.py            # Auth endpoint tests
│   └── test_admin.py           # Admin endpoint tests
├── requirements.txt
├── Dockerfile
├── .env.example
└── README.md
```

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint   | Description                    | Auth Required |
|--------|-----------|--------------------------------|---------------|
| POST   | /register | Register a new user            | No            |
| POST   | /login    | Login and get tokens           | No            |
| POST   | /refresh  | Refresh access token           | No            |
| GET    | /me       | Get current user info          | Yes           |

### Admin (`/api/admin`)

| Method | Endpoint              | Description                    | Auth Required |
|--------|----------------------|--------------------------------|---------------|
| GET    | /users               | List all users (paginated)     | Admin         |
| GET    | /users/{user_id}     | Get user details               | Admin         |
| PATCH  | /users/{user_id}/role| Update user roles              | Admin         |
| PATCH  | /users/{user_id}/status| Update user status           | Admin         |
| DELETE | /users/{user_id}     | Delete user (soft by default)  | Admin         |

## Setup

### 1. Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Required environment variables:
- `MONGODB_URI`: MongoDB connection string
- `MONGODB_DB_NAME`: Database name
- `JWT_SECRET_KEY`: Secret key for JWT signing (use a strong random string)

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the Service

```bash
# Development mode
uvicorn app.main:app --reload --port 8001

# Or using Python
python -m app.main
```

### 4. Run with Docker

```bash
# Build the image
docker build -t auth-service .

# Run the container
docker run -p 8001:8001 --env-file .env auth-service
```

## Usage Examples

### Register a New User

```bash
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "password": "secretpassword123",
    "email": "john@example.com"
  }'
```

### Login

```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "password": "secretpassword123"
  }'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": "...",
    "username": "johndoe",
    "roles": ["user"]
  }
}
```

### Get Current User

```bash
curl http://localhost:8001/api/auth/me \
  -H "Authorization: Bearer <access_token>"
```

### Refresh Token

```bash
curl -X POST http://localhost:8001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "<refresh_token>"
  }'
```

## Creating an Admin User

To create the first admin user:

1. Register a normal user through the API
2. Connect to MongoDB and update the user's roles:

```javascript
// In MongoDB shell or Compass
db.users.updateOne(
  { username: "admin" },
  { $set: { roles: ["admin", "user"] } }
)
```

Or use a script to seed the admin user.

## Testing

Run the tests:

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest tests/ -v
```

## API Documentation

Once the service is running, access the interactive API documentation:

- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

## Security Considerations

1. **JWT Secret**: Use a strong, random secret key in production
2. **HTTPS**: Always use HTTPS in production
3. **Token Expiry**: Access tokens expire in 15 minutes by default
4. **Password Hashing**: Uses bcrypt with default rounds
5. **CORS**: Configure allowed origins appropriately

## License

MIT License
