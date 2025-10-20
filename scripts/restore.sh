#!/bin/bash

set -e

if [ -z "$1" ]; then
    echo "Usage: ./scripts/restore.sh <backup_file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -1th backups/*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

if [ ! -f .env ]; then
    echo "Error: .env file not found"
    exit 1
fi

source .env

echo "⚠️  WARNING: This will overwrite the current database!"
echo "Database: $POSTGRES_DB"
echo "Backup file: $BACKUP_FILE"
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

echo "Restoring database from backup..."

gunzip -c "$BACKUP_FILE" | docker compose exec -T db psql -U "$POSTGRES_USER" "$POSTGRES_DB"

echo "✓ Database restored successfully"

EXPENSE_COUNT=$(docker compose exec -T db psql -U "$POSTGRES_USER" "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM expenses;")
echo "✓ Total expenses in database: $(echo $EXPENSE_COUNT | xargs)"
