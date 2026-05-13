# Katet CRM Production Deployment (Timeweb VPS)

This repository includes automatic production deploy from GitHub Actions to a VPS over SSH.

## 1. What is deployed

Production stack is defined in [docker-compose.prod.yml](docker-compose.prod.yml):

1. `postgres` (PostgreSQL 16)
2. `backend` (NestJS + Prisma)
3. `frontend` (Vite static build served by Nginx)

Frontend container proxies `/api/*` to backend (`backend:3001`).

## 2. Required server prerequisites

On VPS install:

1. Docker Engine
2. Docker Compose plugin (`docker compose` command)
3. SSH access for deploy user

Recommended app path on server: `/opt/katet-crm-2`.

## 3. Required GitHub Actions secrets

Create these repository secrets:

1. `PROD_SSH_HOST` - VPS host or IP
2. `PROD_SSH_USER` - SSH user (for example `root`)
3. `PROD_SSH_PORT` - optional, default `22`
4. `PROD_SSH_PRIVATE_KEY` - recommended SSH key auth
5. `PROD_SSH_PASSWORD` - optional password fallback
6. `PROD_SSH_KNOWN_HOSTS` - optional pinned known_hosts entry
7. `PROD_APP_PATH` - optional, default `/opt/katet-crm-2`
8. `PROD_BACKEND_ENV` - full content of `app/backend/.env` for production

At least one auth secret is required: `PROD_SSH_PRIVATE_KEY` or `PROD_SSH_PASSWORD`.

## 4. Backend env requirements

`app/backend/.env` in production must include at minimum:

1. `NODE_ENV=production`
2. `PORT=3001`
3. `API_PREFIX=/api/v1`
4. `DATABASE_URL=postgresql://<user>:<pass>@postgres:5432/<db>?schema=public`
5. `JWT_SECRET=<strong_secret>`
6. `CORS_ORIGINS=https://<your-domain>`
7. integration secrets as needed (`INTEGRATION_MANGO_SECRET`, ...)

If `DATABASE_URL` uses localhost, deploy script rewrites host to `postgres:5432`.

## 5. Auto deploy workflow

Workflow file: [.github/workflows/deploy-production.yml](.github/workflows/deploy-production.yml)

Trigger:

1. Push to `main` with changes in deployment/backend/frontend paths
2. Manual run via `workflow_dispatch`

Deploy flow:

1. SSH connect to VPS
2. Sync repository files via rsync
3. Optionally write `app/backend/.env` from `PROD_BACKEND_ENV`
4. Run [scripts/deploy-vps.sh](scripts/deploy-vps.sh)
5. Build and restart compose stack
6. Check health endpoint `/api/v1/health`

## 6. First manual smoke after deploy

1. Open `http://<server-ip>/`
2. Open `http://<server-ip>/api/v1/health`
3. Check containers on server:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 backend frontend postgres
```

## 7. Notes

1. This setup is HTTP-first for initial bring-up; put a reverse proxy or TLS terminator in front for HTTPS.
2. Rotate leaked secrets before production use.
3. For stable deployments prefer SSH key auth over password auth.
