# Quick Reference

## Commands

### Docker
```bash
docker-compose up -d              # Start all services
docker-compose down               # Stop all services
docker-compose logs -f backend    # View backend logs
docker-compose exec backend bash  # SSH into backend
docker system prune -f            # Clean up unused images
```

### Development
```bash
npm run setup                     # Initial setup
npm run dev                       # Start all in dev mode
npm run docker:up                # Docker up
npm run docker:down              # Docker down
npm run docker:logs              # View logs
npm run lint                      # Lint all
npm run test                      # Test all
npm run format                    # Format code
```

### Database
```bash
# Migrations
docker-compose exec backend alembic revision --autogenerate -m "description"
docker-compose exec backend alembic upgrade head
docker-compose exec backend alembic downgrade -1

# Backup
docker-compose exec postgres pg_dump -U ra_user ra_db > backup.sql

# Restore
gunzip < backup.sql.gz | docker-compose exec -T postgres psql -U ra_user ra_db
```

## Service Ports

| Service | Port | URL |
|---------|------|-----|
| Web | 3000 | http://localhost:3000 |
| Backend API | 8000 | http://localhost:8000 |
| API Docs | 8000 | http://localhost:8000/docs |
| PostgreSQL | 5432 | postgres://localhost:5432/ra_db |
| Redis | 6379 | redis://localhost:6379 |
| Nginx | 80, 443 | http://localhost, https://localhost |

## Environment Setup

1. Copy `.env.example` to `.env`
2. Update values:
   - `SECRET_KEY`: Strong 64-char random string
   - `JWT_SECRET`: Different from SECRET_KEY
   - `DATABASE_URL`: Your PostgreSQL connection
   - `SMTP_*`: Email service credentials

## API Authentication

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@example.com",
    "password":"SecurePass123!",
    "full_name":"John Doe",
    "phone_number":"+60123456789"
  }'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}'

# Get Profile (replace TOKEN)
curl -X GET http://localhost:8000/api/users/me \
  -H "Authorization: Bearer TOKEN"
```

## Directory Guide

| Path | Purpose |
|------|---------|
| `/apps/web` | Next.js web frontend |
| `/apps/mobile` | React Native mobile app |
| `/apps/backend` | FastAPI Python backend |
| `/shared` | Shared types & validation |
| `/infra` | Docker, Nginx, database configs |
| `/docs` | Architecture, API, deployment guides |

## Common Issues

### Port in use
```bash
# Find process using port 8000
lsof -i :8000
kill -9 <pid>
```

### Database migration errors
```bash
# Rollback
docker-compose exec backend alembic downgrade -1

# Manually check
docker-compose exec postgres psql -U ra_user ra_db
```

### Docker build issues
```bash
# Clean rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## Performance Tips

1. Use connection pooling (enabled by default)
2. Enable Redis caching for frequent queries
3. Add database indices on common lookups
4. Use pagination for large datasets (default: 20 items)
5. Monitor memory usage: `docker stats`

## Security Checklist

- [ ] Change `SECRET_KEY` and `JWT_SECRET`
- [ ] Update `ALLOWED_HOSTS` for your domain
- [ ] Configure SMTP credentials
- [ ] Enable HTTPS/TLS in production
- [ ] Setup firewall (UFW)
- [ ] Regular database backups
- [ ] Update Docker images regularly
- [ ] Review CORS origins
- [ ] Enable rate limiting
- [ ] Setup monitoring/alerts

## Useful Links

- [Architecture](docs/architecture/ARCHITECTURE.md)
- [API Docs](docs/api/AUTHENTICATION.md)
- [Database Schema](docs/api/DATABASE.md)
- [Deployment](docs/deployment/DEPLOYMENT.md)
- [Project Structure](docs/architecture/PROJECT_STRUCTURE.md)

## Getting Help

1. Check logs: `docker-compose logs -f <service>`
2. Read documentation in `/docs`
3. Review GitHub Issues
4. Check healthchecks: `curl http://localhost:8000/health`
