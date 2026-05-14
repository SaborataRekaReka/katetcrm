# Katet CRM Production Deployment (Timeweb VPS)

This repository includes automatic production deploy from GitHub Actions to a VPS over SSH.

## 1. What is deployed

Production stack is defined in [docker-compose.prod.yml](docker-compose.prod.yml):

1. `postgres` (PostgreSQL 16)
2. `backend` (NestJS + Prisma)
3. `frontend` (Vite static build served by Nginx)
4. `caddy` (reverse proxy + automatic Let's Encrypt TLS)

External traffic goes through Caddy on ports `80/443`. Caddy proxies all requests to `frontend`, and frontend proxies `/api/*` to backend (`backend:3001`).

## 2. Required server prerequisites

On VPS install:

1. Docker Engine
2. Docker Compose plugin (`docker compose` command)
3. SSH access for deploy user
4. DNS `A`/`AAAA` record for your public subdomain pointing to this VPS

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

IPv6 note:

1. You can set `PROD_SSH_HOST` as bare IPv6 (`2a03:6f00:a::1:cd6d`) or bracketed (`[2a03:6f00:a::1:cd6d]`).
2. Workflow normalizes both formats for SSH and rsync.

## 4. Backend env requirements

`app/backend/.env` in production must include at minimum:

1. `NODE_ENV=production`
2. `PORT=3001`
3. `API_PREFIX=/api/v1`
4. `DATABASE_URL=postgresql://<user>:<pass>@postgres:5432/<db>?schema=public`
5. `JWT_SECRET=<strong_secret>`
6. `CORS_ORIGINS=https://<your-domain>`
7. integration secrets as needed (`INTEGRATION_MANGO_API_KEY`, `INTEGRATION_MANGO_SECRET`, ...)

Mango Office note:

1. `INTEGRATION_MANGO_API_KEY` = «Уникальный код вашей АТС» from Mango API connector settings.
2. `INTEGRATION_MANGO_SECRET` = «Ключ для создания подписи» from the same Mango settings.
3. Mango external system URL should be `https://<your-domain>/api/v1/integrations/events/mango`; CRM also accepts Mango typed event paths such as `https://<your-domain>/api/v1/integrations/events/mango/events/call` and `https://<your-domain>/api/v1/integrations/events/call`.

If `DATABASE_URL` uses localhost, deploy script rewrites host to `postgres:5432`.

TLS host note:

1. Deploy script resolves `PUBLIC_HOST` automatically from the first value in `CORS_ORIGINS`.
2. You can override explicitly by exporting `PUBLIC_HOST` before running `scripts/deploy-vps.sh`.

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
6. Check health endpoint on local frontend binding `http://127.0.0.1:8080/api/v1/health`
7. Caddy obtains and renews TLS certificates for `PUBLIC_HOST` automatically

## 6. First manual smoke after deploy

1. Open `https://<your-subdomain>/`
2. Open `https://<your-subdomain>/api/v1/health`
3. Check containers on server:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 backend frontend postgres
```

## 7. Notes

1. HTTPS is terminated by Caddy with automatic Let's Encrypt certificates.
2. Rotate leaked secrets before production use.
3. For stable deployments prefer SSH key auth over password auth.
