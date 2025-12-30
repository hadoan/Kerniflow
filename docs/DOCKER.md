# Docker Setup for Corely

Complete Docker Compose setup for Corely monorepo with two deployment profiles.

---

## Prerequisites

- **Docker** >= 20.10
- **Docker Compose** >= 2.0
- **Node** >= 22.19.0 (for local development without Docker)
- **pnpm** >= 10.26.0 (for local development without Docker)

### Verify Installation

```bash
docker --version
docker compose version
```

---

## Quick Start

### 1. Copy Environment Variables

```bash
cp .env.example .env
```

Default values in `.env.example` work for local development. Adjust as needed:

- `POSTGRES_PASSWORD`: Change in production
- `VITE_API_BASE_URL`: Backend URL the frontend connects to
- `NODE_ENV`: Set to `production` for production builds

### 2. Run Demo Profile (Mock Server + Frontend)

```bash
docker compose --profile demo up --build
```

Services will be available at:

- **Frontend**: http://localhost:5173
- **Mock Server**: http://localhost:4000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### 3. Run Full Profile (Real API + Worker + Frontend)

```bash
docker compose --profile full up --build
```

Services will be available at:

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

---

## Available Commands

### Start Services

```bash
# Demo profile (mock-server)
docker compose --profile demo up

# Full profile (real API)
docker compose --profile full up

# Start in background
docker compose --profile full up -d

# Build and start
docker compose --profile full up --build
```

### Stop Services

```bash
# Stop all services (keeps volumes)
docker compose down

# Stop and remove volumes (fresh database)
docker compose down -v

# Stop and remove everything (including images, volumes, networks)
docker compose down -v --rmi all
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f web
docker compose logs -f worker

# Follow only errors
docker compose logs -f --tail=50 api
```

### Database Migrations (Prisma)

```bash
# Run pending migrations (one-time on startup)
docker compose --profile full run --rm api pnpm prisma:migrate

# Generate Prisma client
docker compose --profile full run --rm api pnpm prisma:generate

# View database UI (Prisma Studio)
docker compose --profile full run --rm api pnpm prisma:studio
```

### Access Containers

```bash
# Open shell in API container
docker compose exec api sh

# Open shell in Web container
docker compose exec web sh

# Run command in API
docker compose exec api pnpm typecheck
```

### Rebuild Specific Service

```bash
# Rebuild API
docker compose build api

# Rebuild and restart
docker compose up -d --build api
```

---

## Environment Variables

All variables are loaded from `.env` file. Key variables:

```env
# Deployment mode
NODE_ENV=development

# Database (PostgreSQL)
POSTGRES_DB=corely
POSTGRES_USER=corely
POSTGRES_PASSWORD=corely
DATABASE_URL=postgresql://corely:corely@postgres:5432/corely?schema=public

# Cache & Queue (Redis)
REDIS_URL=redis://redis:6379

# Frontend API endpoint
# For demo: http://localhost:4000 (mock-server)
# For full: http://localhost:3000 (api)
VITE_API_BASE_URL=http://localhost:4000

# Ports
WEB_PORT=5173
API_PORT=3000
```

### Important: Vite Environment Variables

Vite requires `VITE_` prefix for client-side environment variables. The compose setup passes `VITE_API_BASE_URL` as a build argument to the frontend.

**Note**: If you change `VITE_API_BASE_URL` after building, you need to rebuild the web service:

```bash
docker compose build web
docker compose up web
```

Alternatively, use Vite's development environment file (create `apps/web/.env.local`) for hot-reload during development:

```env
VITE_API_BASE_URL=http://localhost:3000
```

---

## Profiles Explained

### Demo Profile

```bash
docker compose --profile demo up
```

**Services**:

- `web` (Vite frontend)
- `postgres` (database)
- `redis` (cache/queue)
- `mock-server` (mock backend) — _not yet implemented; stub only_

**Use Case**: Development without full backend setup; frontend development.

### Full Profile

```bash
docker compose --profile full up
```

**Services**:

- `web` (Vite frontend)
- `api` (NestJS API)
- `worker` (NestJS worker process)
- `postgres` (database)
- `redis` (cache/queue)

**Use Case**: Full-stack testing; production-like environment.

---

## Troubleshooting

### Port Conflicts

If you get `bind: address already in use`:

**Find process using port**:

```bash
# macOS/Linux
lsof -i :5173
lsof -i :3000
lsof -i :5432

# Kill process
kill -9 <PID>
```

**Or change ports** in `.env`:

```env
WEB_PORT=5174
API_PORT=3001
```

Then update frontend API URL if needed.

### Container fails to start

**Check logs**:

```bash
docker compose logs api
docker compose logs web
```

**Common issues**:

- Missing environment variables → copy `.env.example` to `.env`
- Port in use → change in `.env`
- Database not ready → wait for healthcheck (30s usually)
- Out of disk space → run `docker system prune`

### Database connection errors

```bash
# Check if postgres is healthy
docker compose exec postgres pg_isready -U corely

# Connect to database
docker compose exec postgres psql -U corely -d corely

# View database
\dt  # list tables
\q   # quit
```

### Redis connection errors

```bash
# Check if redis is healthy
docker compose exec redis redis-cli ping

# View redis keys
docker compose exec redis redis-cli keys '*'
```

### Frontend can't reach API

1. **Check API is running**:

   ```bash
   docker compose logs -f api
   ```

2. **Verify endpoint in .env**:

   ```bash
   VITE_API_BASE_URL=http://localhost:3000  # Full profile
   VITE_API_BASE_URL=http://localhost:4000  # Demo profile (mock)
   ```

3. **Check browser console** for CORS or network errors.

4. **From frontend container**, test:
   ```bash
   docker compose exec web wget -O - http://api:3000/
   ```

### CORS Issues

The API enables CORS with `origin: true` (all origins allowed) in development. If issues persist:

- Check frontend URL matches `VITE_API_BASE_URL`
- Restart both web and api services
- Clear browser cache

### Migrations not running

```bash
# Run migrations manually
docker compose --profile full run --rm api pnpm prisma:migrate

# Check migration status
docker compose --profile full run --rm api pnpm prisma:status
```

### Out of Memory

Docker containers have memory limits. If you see OOM errors:

```bash
# Increase Docker memory limit (Docker Desktop settings)
# Or restart services
docker compose restart
```

---

## Development Workflow

### Hot Reload

All services are configured with hot-reload in development:

1. **Frontend** (Vite): Changes to `apps/web/src/**` reload automatically
2. **API/Worker** (tsx watch): Changes to `services/*/src/**` reload automatically
3. **Packages**: Changes to `packages/*/src/**` trigger rebuilds

### Building Packages

The Dockerfiles automatically build shared packages (`@corely/contracts`, `@corely/domain`, `@corely/data`).

### Testing

```bash
# Run tests in API container
docker compose exec api pnpm test

# Run tests in Web container
docker compose exec web pnpm test
```

### Debugging

```bash
# View build output
docker compose build --verbose api

# Interactive debugging
docker compose exec -it api sh
> pnpm dev  # start manually with debug

# Export logs
docker compose logs > logs.txt
```

---

## Production Considerations

### Do NOT use `--profile demo` in production

Always use `--profile full` with:

- A real backend API (`api` service)
- A worker (`worker` service)

### Build Production Images

Modify Dockerfiles to use `RUN pnpm build` instead of dev servers:

```dockerfile
# For web:
RUN pnpm --filter @corely/web build
CMD ["pnpm", "--filter", "@corely/web", "preview", "--host", "0.0.0.0"]

# For api/worker:
# Add build step and use `npm start` instead of dev
```

### Secure Defaults

- Change `POSTGRES_PASSWORD` in `.env`
- Set `NODE_ENV=production`
- Use secrets management (AWS Secrets Manager, Vault, etc.)
- Run healthchecks
- Enable resource limits in compose

### Database Backups

```bash
# Backup database
docker compose exec postgres pg_dump -U corely corely > backup.sql

# Restore database
docker compose exec -T postgres psql -U corely corely < backup.sql
```

---

## Useful Docker Compose Commands

```bash
# View service status
docker compose ps

# Show resource usage
docker compose stats

# Validate compose file
docker compose config

# Run one-off command
docker compose run --rm api pnpm prisma:migrate

# Scale a service (if stateless)
docker compose up --scale worker=3

# Remove unused resources
docker system prune -a
```

---

## File Structure

```
corely/
├── docker-compose.yml          # Compose configuration
├── .env.example                # Example environment variables
├── Dockerfile.web              # Frontend container
├── Dockerfile.api              # API container
├── Dockerfile.worker           # Worker container
├── docker/
│   ├── postgres/init.sql       # Database initialization
│   └── healthcheck.sh          # Generic healthcheck script
├── docs/DOCKER.md              # This file
├── apps/
│   └── web/                    # Vite frontend
├── services/
│   ├── api/                    # NestJS API
│   └── worker/                 # NestJS worker
└── packages/
    ├── data/                   # Prisma schema & models
    ├── domain/                 # Domain logic
    └── contracts/              # Shared types
```

---

## Support & Issues

- **Docker docs**: https://docs.docker.com/
- **Docker Compose profiles**: https://docs.docker.com/compose/compose-file/compose-file-v3/#profiles
- **Vite env vars**: https://vitejs.dev/guide/env-and-modes
- **NestJS**: https://docs.nestjs.com/

For project-specific issues, check:

- Logs: `docker compose logs -f`
- Database: `docker compose exec postgres psql -U corely -d corely`
- Redis: `docker compose exec redis redis-cli`
