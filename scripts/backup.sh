#!/bin/bash

set -e

BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"

if [ ! -f .env ]; then
    echo "Error: .env file not found"
    exit 1
fi

source .env

mkdir -p "$BACKUP_DIR"

echo "Creating database backup..."
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_FILE"

gzip "$BACKUP_FILE"

echo "✓ Backup created: ${BACKUP_FILE}.gz"
echo "✓ Backup size: $(du -h ${BACKUP_FILE}.gz | cut -f1)"

BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l)
echo "✓ Total backups: $BACKUP_COUNT"
