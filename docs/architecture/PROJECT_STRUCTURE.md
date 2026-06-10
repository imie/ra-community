# RA Community Management System - Project Structure & Architecture

## Overview
This is a production-ready, scalable monorepo for the Residence Association (RA) Community Management System. It follows a modern full-stack architecture with separation of concerns across web, mobile, and backend tiers.

## Project Structure

```
ra-community/
├── apps/
│   ├── web/                      # Next.js 14+ web application
│   │   ├── src/
│   │   │   ├── app/             # App Router pages and layouts
│   │   │   ├── components/      # Reusable React components
│   │   │   ├── hooks/           # Custom React hooks
│   │   │   ├── lib/             # Utilities, helpers, API clients
│   │   │   ├── types/           # TypeScript types and interfaces
│   │   │   └── styles/          # Global styles, Tailwind config
│   │   ├── public/              # Static assets
│   │   ├── __tests__/           # Jest unit and integration tests
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── next.config.js       # Next.js configuration with security headers
│   │   ├── .eslintrc.json
│   │   └── Dockerfile.dev
│   │
│   ├── mobile/                   # React Native + Expo mobile app
│   │   ├── src/
│   │   │   ├── screens/         # Screen components
│   │   │   ├── components/      # Reusable UI components
│   │   │   ├── navigation/      # Navigation setup (React Navigation)
│   │   │   ├── hooks/           # Custom hooks
│   │   │   ├── services/        # API and storage services
│   │   │   ├── types/           # TypeScript types
│   │   │   └── context/         # React Context for state
│   │   ├── assets/              # Images, fonts, icons
│   │   ├── package.json
│   │   ├── app.json            # Expo app configuration
│   │   └── tsconfig.json
│   │
│   └── backend/                  # FastAPI Python backend
│       ├── app/
│       │   ├── main.py          # FastAPI app entry point
│       │   ├── api/             # API route handlers
│       │   ├── models/          # SQLAlchemy ORM models
│       │   ├── schemas/         # Pydantic request/response schemas
│       │   ├── services/        # Business logic layer
│       │   ├── middleware/      # Custom middleware
│       │   ├── utils/           # Utilities (JWT, password, etc.)
│       │   └── db/              # Database configuration
│       ├── tests/               # Pytest unit and integration tests
│       ├── requirements.txt     # Python dependencies
│       ├── Dockerfile          # Production Docker image
│       └── .env.example
│
├── shared/                       # Shared code across all applications
│   ├── types/                   # Shared TypeScript/Python types
│   │   └── constants.py        # Enums and constants
│   ├── constants/              # Application constants
│   └── validation/             # Shared validation logic
│
├── infra/                        # Infrastructure and DevOps
│   ├── docker/                 # Docker build contexts
│   ├── nginx/                  # Nginx reverse proxy config
│   │   └── nginx.conf
│   └── postgres/               # PostgreSQL initialization
│       └── init.sql            # Database schema and extensions
│
├── docs/                         # Documentation
│   ├── architecture/           # System architecture and decision records
│   ├── api/                    # API documentation
│   └── deployment/             # Deployment and ops guides
│
├── docker-compose.yml          # Full stack orchestration
├── package.json                # Root workspace configuration
├── .env.example               # Environment variables template
└── .gitignore                 # Git ignore rules
```

## Technology Stack

### Frontend (Web)
- **Framework**: Next.js 14+ with App Router
- **UI Library**: React 18+
- **Styling**: TailwindCSS 3+
- **Forms**: React Hook Form + Zod validation
- **State**: Zustand
- **HTTP Client**: Axios
- **TypeScript**: Strict mode enabled
- **Testing**: Jest + React Testing Library

### Mobile
- **Framework**: React Native + Expo
- **Navigation**: React Navigation (Bottom Tabs + Native Stack)
- **Forms**: React Hook Form + Zod validation
- **State**: Zustand + React Context
- **Secure Storage**: react-native-keychain (or expo-secure-store)
- **HTTP Client**: Axios
- **TypeScript**: Enabled

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 14+
- **ORM**: SQLAlchemy 2.0
- **Authentication**: JWT (PyJWT) + bcrypt
- **Validation**: Pydantic 2.0
- **API Docs**: Swagger UI, ReDoc (auto-generated)
- **Async**: Uvicorn + asyncio
- **Caching**: Redis
- **Testing**: Pytest + pytest-asyncio
- **Code Quality**: Black, isort, flake8, mypy

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx
- **Database**: PostgreSQL with pgBouncer connection pooling
- **Cache**: Redis
- **Deployment**: Supports on-premises with docker-compose

## Key Features (Implementation Priority)

### 1. **Secure Authentication & Registration**
- Email/password registration with email verification
- OAuth 2.0 integrations (Google, Microsoft, Apple)
- Duplicate email handling → auto-generate random password
- Brute-force protection with rate limiting & account lockout
- JWT token-based authentication with refresh tokens
- Password complexity validation (8+ chars, uppercase, lowercase, digits, special)

### 2. **Resident Profile & Data Management**
- Secure form for resident information capture:
  - Full name, IC Number, birth date/location, age, sex, race
  - Marital status, dependents, phone, email, address
  - Taman name, house number, Jalan Aman Serenia
  - Job title, employer information
- Profile update with audit logging
- Data verification workflows
- Secure data encryption at rest

### 3. **Security & Compliance**
- Input validation (Zod/Pydantic schemas)
- SQL injection prevention (parameterized queries, SQLAlchemy ORM)
- CSRF protection (SameSite cookies, CSRF tokens in headers)
- XSS prevention (Content Security Policy headers)
- Rate limiting (100 requests/hour per IP by default)
- CORS policy enforcement
- Audit logging for sensitive operations
- HTTPS/TLS enforced in production

### 4. **Scalability & Performance**
- Database connection pooling (pgBouncer)
- API pagination and cursor-based pagination
- Redis caching layer
- Horizontal scaling support via container orchestration
- Database query optimization with indices
- Async/await patterns throughout backend

### 5. **Testing & Code Quality**
- Unit tests for all critical paths
- Integration tests for API endpoints
- Type-safe codebase (TypeScript, Pydantic)
- ESLint + Prettier for web/mobile
- Black + isort + flake8 for backend

## Environment Variables

See [.env.example](.env.example) for all required environment variables:

### Critical Security Variables
- `SECRET_KEY`: Django/FastAPI secret (64+ character random string)
- `JWT_SECRET`: JWT signing secret (different from SECRET_KEY)
- `DATABASE_URL`: PostgreSQL connection string
- `SMTP_PASSWORD`: Email service password (use app-specific password for Gmail)

## Getting Started

### Prerequisites
- Docker & Docker Compose 4.0+
- Node.js 18+ (for local development without Docker)
- Python 3.11+ (for local backend development)
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd ra-community
   ```

2. **Setup environment**
   ```bash
   npm run setup
   ```
   This copies `.env.example` to `.env` and builds Docker images.

3. **Start the full stack**
   ```bash
   npm run docker:up
   ```
   Services will be available at:
   - Web: http://localhost:3000
   - API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - Database: localhost:5432

4. **View logs**
   ```bash
   npm run docker:logs
   ```

5. **Stop services**
   ```bash
   npm run docker:down
   ```

### Local Development (without Docker)

#### Web App
```bash
cd apps/web
npm install
npm run dev  # Runs on http://localhost:3000
```

#### Mobile App
```bash
cd apps/mobile
npm install
npm start  # Opens Expo DevTools
```

#### Backend
```bash
cd apps/backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload  # Runs on http://localhost:8000
```

## Database Schema

The project uses Alembic for migrations. Key tables:

### Users
- `id` (UUID, primary key)
- `email` (unique, indexed)
- `password_hash` (bcrypt)
- `full_name`, `phone_number`
- `ic_number` (unique, indexed)
- `date_of_birth`, `place_of_birth`, `age`, `sex`, `race`, `marital_status`
- `taman_name`, `house_number`, `jalan_aman_serenia`
- `job_title`, `employer_name`
- `is_active`, `is_verified`, `email_verified_at`
- `created_at`, `updated_at`, `last_login` (timestamps)

### Future Tables
- Committees, Announcements, Events, Payments, etc. (to be implemented)

## Security Considerations

1. **Passwords**: Uses bcrypt with salt rounds = 12 (default)
2. **JWT Tokens**: 
   - Access tokens: 24 hours (configurable)
   - Refresh tokens: 7 days (configurable)
   - Stored in secure cookies (HttpOnly, SameSite)
3. **Database**: 
   - Prepared statements via SQLAlchemy ORM
   - Connection pooling with timeout
   - Encrypted connection strings in secrets
4. **API Security**:
   - Rate limiting middleware
   - CORS validation
   - Security headers (CSP, X-Frame-Options, etc.)
   - Request validation with Pydantic schemas
5. **Infrastructure**:
   - Nginx reverse proxy with SSL/TLS termination
   - PostgreSQL runs in isolated Docker network
   - Redis requires password in production

## Monitoring & Logging

- Backend logs to stdout (captured by Docker)
- Database slow queries logged (configurable)
- Health check endpoints: `/health` (backend), `/api/health`
- Structured logging for audit trails

## Deployment

See [docs/deployment/DEPLOYMENT.md](docs/deployment/DEPLOYMENT.md) for:
- Production environment setup
- SSL/TLS certificate configuration
- Database backup and recovery
- Scaling considerations
- Monitoring setup (Prometheus, Grafana optional)

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes following the code style in each directory
3. Write tests for new features
4. Submit a pull request

## License

See [LICENSE](LICENSE) file for details.

## Support

For issues and questions, please open an issue on GitHub or contact the development team.
