#!/usr/bin/env bash
set -euo pipefail

echo "=== katet deploy started at $(date -u +%FT%TZ) ==="

docker info >/dev/null 2>&1 || {
  echo "::error::docker is not accessible for user $(whoami)"
  exit 1
}
docker compose version >/dev/null 2>&1 || {
  echo "::error::docker compose is not available"
  exit 1
}

if [ ! -s app/backend/.env ]; then
  echo "::error::app/backend/.env is missing or empty"
  exit 1
fi

# Read a value from app/backend/.env while tolerating export-prefix, quotes,
# and inline comments in unquoted values.
read_env_value() {
  local key="$1"

  awk -v key="$key" '
    BEGIN { pattern = "^[[:space:]]*(export[[:space:]]+)?" key "=" }

    $0 ~ /^[[:space:]]*#/ { next }
    $0 ~ /^[[:space:]]*$/ { next }

    $0 ~ pattern {
      line = $0
      sub(/\r$/, "", line)
      sub(/^[[:space:]]*export[[:space:]]+/, "", line)
      sub(/^[[:space:]]*[^=]+=/, "", line)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", line)

      if (line ~ /^".*"$/ || line ~ /^'\''.*'\''$/) {
        line = substr(line, 2, length(line) - 2)
      } else {
        sub(/[[:space:]]+#.*$/, "", line)
      }

      gsub(/^[[:space:]]+|[[:space:]]+$/, "", line)
      print line
      exit
    }
  ' app/backend/.env
}

# Keep compose DB host resolvable inside docker network.
db_url="$(read_env_value DATABASE_URL || true)"
if [ -z "$db_url" ]; then
  echo "::error::DATABASE_URL is missing in app/backend/.env"
  exit 1
fi

normalized_db_url="$(echo "$db_url" | sed -E 's#(://[^@]+@)(localhost|127\.0\.0\.1)(:[0-9]+)?/#\1postgres:5432/#')"
if [ "$normalized_db_url" != "$db_url" ]; then
  awk -v value="$normalized_db_url" 'BEGIN{done=0} /^DATABASE_URL=/{print "DATABASE_URL=" value; done=1; next} {print} END{if(!done) print "DATABASE_URL=" value}' app/backend/.env > app/backend/.env.tmp
  mv app/backend/.env.tmp app/backend/.env
  echo "DATABASE_URL normalized: localhost -> postgres:5432"
fi

public_host="${PUBLIC_HOST:-}"
if [ -z "$public_host" ]; then
  cors_origins="$(read_env_value CORS_ORIGINS || true)"
  first_origin="$(echo "$cors_origins" | cut -d',' -f1 | tr -d '"' | xargs)"
  if echo "$first_origin" | grep -Eq '^https?://'; then
    public_host="$(echo "$first_origin" | sed -E 's#^https?://([^/:]+).*$#\1#')"
  fi
fi

if [ -z "$public_host" ]; then
  echo "::error::PUBLIC_HOST is not set and could not be inferred from CORS_ORIGINS in app/backend/.env"
  exit 1
fi

export PUBLIC_HOST="$public_host"
echo "PUBLIC_HOST resolved: $PUBLIC_HOST"

workflow_profile_raw="$(read_env_value CRM_WORKFLOW_PROFILE || true)"
workflow_profile_normalized="$(echo "$workflow_profile_raw" | tr '[:upper:]' '[:lower:]' | tr '_' '-')"

if [ "$workflow_profile_normalized" = "sales-lite" ]; then
  workflow_profile="sales-lite"
else
  workflow_profile="full"
fi

export CRM_WORKFLOW_PROFILE="$workflow_profile"
export VITE_CRM_WORKFLOW_PROFILE="$workflow_profile"
echo "CRM_WORKFLOW_PROFILE resolved: $CRM_WORKFLOW_PROFILE"
echo "VITE_CRM_WORKFLOW_PROFILE resolved: $VITE_CRM_WORKFLOW_PROFILE"

compose_args=(--env-file app/backend/.env -f docker-compose.prod.yml)

echo "--- Building images"
docker compose "${compose_args[@]}" build --no-cache backend frontend

echo "--- Starting stack"
docker compose "${compose_args[@]}" up -d --force-recreate --remove-orphans

echo "--- Waiting for health"
healthy="false"
for attempt in $(seq 1 36); do
  if command -v curl >/dev/null 2>&1; then
    if curl -fsS http://127.0.0.1:8080/api/v1/health >/dev/null 2>&1; then
      healthy="true"
      break
    fi
  elif command -v wget >/dev/null 2>&1; then
    if wget -qO- http://127.0.0.1:8080/api/v1/health >/dev/null 2>&1; then
      healthy="true"
      break
    fi
  fi
  echo "  attempt $attempt/36: waiting for /api/v1/health"
  sleep 5
done

if [ "$healthy" != "true" ]; then
  echo "::error::Health check failed: http://127.0.0.1:8080/api/v1/health"
  docker compose "${compose_args[@]}" ps || true
  docker compose "${compose_args[@]}" logs --tail=200 backend frontend caddy postgres || true
  exit 1
fi

echo "=== katet deploy SUCCESS at $(date -u +%FT%TZ) ==="
docker compose "${compose_args[@]}" ps
