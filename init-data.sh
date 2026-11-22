#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Waiting for the backend to become healthy..."
docker compose up -d --wait

echo "Populating PostgreSQL from data/structured_json..."
docker compose exec backend python -m scripts.ingest_colleges

echo "Building the Qdrant branch index..."
docker compose exec backend python -m scripts.build_embeddings

echo
echo "Data ready."
echo "Frontend: http://localhost:8080"
echo "Backend:  http://localhost:8000"
echo "Qdrant:   http://localhost:6333/dashboard"
