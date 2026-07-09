# AgentBench — Deployment Guide

## Production Deployment Options

### Option 1: Docker Compose (Recommended for Self-Hosted)

**Requirements**: Docker 20.10+, Docker Compose v2+, 2GB RAM

```bash
# 1. Clone
git clone https://github.com/1304674612/agentbench.git
cd agentbench

# 2. Configure
cp .env.example .env
# Edit .env with your production values:
#   DATABASE_URL=postgresql://user:password@postgres:5432/agentbench
#   REDIS_URL=redis://redis:6379
#   NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
#   OPENAI_API_KEY=sk-...
#   ANTHROPIC_API_KEY=sk-ant-...

# 3. Start
docker compose up -d
```

The following services will start:
| Service | Port | Purpose |
|---------|------|---------|
| agentbench-web | 3000 | Next.js dashboard + API |
| postgres | 5432 | Primary database |
| redis | 6379 | Cache & job queue |

### Option 2: Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Fork the repo
2. Import into Vercel
3. Set environment variables:
   - `DATABASE_URL` — PostgreSQL connection (use Neon, Supabase, or Railway)
   - `REDIS_URL` — Redis connection (use Upstash)
   - `NEXTAUTH_SECRET` — Random 32-byte string
   - `OPENAI_API_KEY` — Your OpenAI API key
4. Deploy

> **Note**: The CLI is not included in Vercel deployments. Use Docker for the full stack.

### Option 3: Manual Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Set up PostgreSQL and Redis (manual)
# Ensure PostgreSQL 16+ and Redis 7+ are running

# 3. Configure environment
cp .env.example .env
# Edit .env

# 4. Run database migrations
pnpm db:generate
pnpm db:migrate

# 5. Build and start
pnpm build
pnpm start
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | No | Redis connection (defaults to localhost:6379) |
| `NEXTAUTH_SECRET` | Yes | Session encryption secret |
| `OPENAI_API_KEY` | No | OpenAI API key for running agents |
| `ANTHROPIC_API_KEY` | No | Anthropic API key for running agents |
| `WEBHOOK_SECRET` | No | Shared secret for CI webhooks |
| `AGENTBENCH_API_URL` | No | API URL for CLI (default: http://localhost:3000/api/v1) |

## Health Check

```bash
# API health
curl http://localhost:3000/api/v1/projects

# CLI test
pnpm --filter agentbench exec agentbench --version
```

## Scaling

| Component | Scaling Strategy |
|-----------|-----------------|
| Web | Horizontal via load balancer (stateless) |
| PostgreSQL | Connection pooling (PgBouncer), read replicas |
| Redis | Cluster mode for high throughput |
| Workers | Multiple BullMQ workers for parallel test execution |

## Monitoring

- **Database**: Use Prisma Studio (`pnpm db:studio`) for schema exploration
- **Logs**: Structured JSON logging via `console.log`
- **Metrics**: Run history and scores available in the Dashboard
- **Alerts**: Webhook notifications for CI completion

## Backup

```bash
# PostgreSQL dump
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup-20250101.sql
```
