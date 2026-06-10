# API Documentation - Authentication

## Endpoints

### User Registration

**POST** `/api/auth/register`

Register a new resident account.

**Request Body**
```json
{
  "email": "resident@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "phone_number": "+60123456789"
}
```

**Response** (201 Created)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "resident@example.com",
  "full_name": "John Doe",
  "is_active": true,
  "is_verified": false,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### User Login

**POST** `/api/auth/login`

Authenticate user and receive JWT tokens.

**Request Body**
```json
{
  "email": "resident@example.com",
  "password": "SecurePass123!"
}
```

**Response** (200 OK)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

### Get User Profile

**GET** `/api/users/me`

Get authenticated user's profile.

**Headers**
```
Authorization: Bearer <access_token>
```

**Response** (200 OK)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "resident@example.com",
  "full_name": "John Doe",
  "phone_number": "+60123456789",
  "ic_number": null,
  "date_of_birth": null,
  "place_of_birth": null,
  "sex": null,
  "race": null,
  "marital_status": null,
  "taman_name": null,
  "house_number": null,
  "jalan_aman_serenia": null,
  "job_title": null,
  "employer_name": null,
  "is_active": true,
  "is_verified": false,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Update User Profile

**PUT** `/api/users/me`

Update authenticated user's profile information.

**Headers**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**
```json
{
  "full_name": "John Doe Updated",
  "phone_number": "+60133456789",
  "ic_number": "123456-78-9012",
  "date_of_birth": "1990-01-15T00:00:00Z",
  "place_of_birth": "Kuala Lumpur",
  "sex": "M",
  "race": "Malay",
  "marital_status": "married",
  "taman_name": "Taman Aman Serenia",
  "house_number": "12A",
  "jalan_aman_serenia": "Jalan Aman Serenia 1",
  "job_title": "Software Engineer",
  "employer_name": "Tech Company Sdn Bhd"
}
```

**Response** (200 OK)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "resident@example.com",
  "full_name": "John Doe Updated",
  "phone_number": "+60133456789",
  "ic_number": "123456-78-9012",
  "date_of_birth": "1990-01-15T00:00:00Z",
  "place_of_birth": "Kuala Lumpur",
  "sex": "M",
  "race": "Malay",
  "marital_status": "married",
  "taman_name": "Taman Aman Serenia",
  "house_number": "12A",
  "jalan_aman_serenia": "Jalan Aman Serenia 1",
  "job_title": "Software Engineer",
  "employer_name": "Tech Company Sdn Bhd",
  "is_active": true,
  "is_verified": false,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T11:00:00Z"
}
```

### Refresh Access Token

**POST** `/api/auth/refresh`

Get a new access token using refresh token.

**Request Body**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

### Request Password Reset

**POST** `/api/auth/forgot-password`

Request a password reset token.

**Request Body**
```json
{
  "email": "resident@example.com"
}
```

**Response** (200 OK)
```json
{
  "message": "Password reset email sent. Check your inbox.",
  "email_sent_to": "resident@example.com"
}
```

### Reset Password

**POST** `/api/auth/reset-password`

Reset password using reset token.

**Request Body**
```json
{
  "token": "reset-token-from-email",
  "new_password": "NewSecurePass123!"
}
```

**Response** (200 OK)
```json
{
  "message": "Password reset successfully"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "invalid email format",
      "type": "value_error.email"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "detail": "Invalid credentials"
}
```

### 409 Conflict
```json
{
  "detail": "Email already registered"
}
```

### 429 Too Many Requests
```json
{
  "detail": "Too many login attempts. Try again later."
}
```

## Rate Limiting

- **Default**: 100 requests per hour per IP address
- **Login endpoint**: 5 attempts per 15 minutes
- **Password reset**: 3 attempts per hour

Rate limit headers included in response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705324200
```

## Authentication Flow

### OAuth 2.0 + JWT

1. User initiates login
2. Backend validates credentials
3. JWT tokens issued (access + refresh)
4. Client stores tokens securely:
   - Web: httpOnly cookie or localStorage
   - Mobile: react-native-keychain or expo-secure-store
5. Include access token in Authorization header for all requests
6. When access token expires, use refresh token to get new one

## Security Notes

- All endpoints use HTTPS in production
- Passwords are hashed with bcrypt (12 rounds)
- JWT tokens are time-limited
- Rate limiting prevents brute-force attacks
- Tokens are invalidated on logout
- CORS enabled for registered origins only
