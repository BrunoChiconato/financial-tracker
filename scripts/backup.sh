#!/bin/bash

set -e

BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"

DAILY_RETENTION=7
WEEKLY_RETENTION=4
MONTHLY_RETENTION=12

if [ ! -f .env ]; then
    echo "Error: .env file not found"
    exit 1
fi

source .env

mkdir -p "$BACKUP_DIR"

echo "Creating database backup..."
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_FILE"

if [ ! -s "$BACKUP_FILE" ]; then
    echo "Error: Backup file is empty"
    rm -f "$BACKUP_FILE"
    exit 1
fi

gzip "$BACKUP_FILE"

echo "✓ Backup created: ${BACKUP_FILE}.gz"
echo "✓ Backup size: $(du -h ${BACKUP_FILE}.gz | cut -f1)"

echo "Verifying backup integrity..."
if gunzip -t "${BACKUP_FILE}.gz" 2>/dev/null; then
    echo "✓ Backup integrity verified"
else
    echo "Error: Backup file is corrupted"
    rm -f "${BACKUP_FILE}.gz"
    exit 1
fi

echo "Testing backup restore capability..."
TEMP_DB="financial_tracker_test_$$"
if docker compose exec -T db psql -U "$POSTGRES_USER" -c "CREATE DATABASE ${TEMP_DB};" >/dev/null 2>&1; then
    if gunzip -c "${BACKUP_FILE}.gz" | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$TEMP_DB" >/dev/null 2>&1; then
        echo "✓ Backup restore test successful"
    else
        echo "Warning: Backup restore test failed"
    fi
    docker compose exec -T db psql -U "$POSTGRES_USER" -c "DROP DATABASE ${TEMP_DB};" >/dev/null 2>&1
else
    echo "Warning: Could not create test database for verification"
fi

echo "Applying retention policy..."

NOW=$(date +%s)
DAILY_CUTOFF=$((NOW - 86400 * DAILY_RETENTION))
WEEKLY_CUTOFF=$((NOW - 86400 * 7 * WEEKLY_RETENTION))
MONTHLY_CUTOFF=$((NOW - 86400 * 30 * MONTHLY_RETENTION))

BACKUPS_TO_DELETE=""
DAILY_COUNT=0
WEEKLY_COUNT=0
MONTHLY_COUNT=0

for backup in $(ls -1t "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null || true); do
    if [ "$backup" = "${BACKUP_FILE}.gz" ]; then
        continue
    fi

    BACKUP_DATE=$(echo "$backup" | sed -E 's/.*backup_([0-9]{8})_[0-9]{6}\.sql\.gz/\1/')
    BACKUP_TIMESTAMP=$(date -d "$BACKUP_DATE" +%s 2>/dev/null || echo 0)

    if [ "$BACKUP_TIMESTAMP" -eq 0 ]; then
        continue
    fi

    BACKUP_AGE=$((NOW - BACKUP_TIMESTAMP))
    BACKUP_DAY_OF_WEEK=$(date -d "@$BACKUP_TIMESTAMP" +%u)
    BACKUP_DAY_OF_MONTH=$(date -d "@$BACKUP_TIMESTAMP" +%d)

    KEEP=0

    if [ "$BACKUP_TIMESTAMP" -ge "$DAILY_CUTOFF" ]; then
        if [ $DAILY_COUNT -lt $DAILY_RETENTION ]; then
            KEEP=1
            DAILY_COUNT=$((DAILY_COUNT + 1))
        fi
    elif [ "$BACKUP_TIMESTAMP" -ge "$WEEKLY_CUTOFF" ] && [ "$BACKUP_DAY_OF_WEEK" = "7" ]; then
        if [ $WEEKLY_COUNT -lt $WEEKLY_RETENTION ]; then
            KEEP=1
            WEEKLY_COUNT=$((WEEKLY_COUNT + 1))
        fi
    elif [ "$BACKUP_TIMESTAMP" -ge "$MONTHLY_CUTOFF" ] && [ "$BACKUP_DAY_OF_MONTH" = "01" ]; then
        if [ $MONTHLY_COUNT -lt $MONTHLY_RETENTION ]; then
            KEEP=1
            MONTHLY_COUNT=$((MONTHLY_COUNT + 1))
        fi
    fi

    if [ $KEEP -eq 0 ]; then
        BACKUPS_TO_DELETE="$BACKUPS_TO_DELETE $backup"
    fi
done

if [ -n "$BACKUPS_TO_DELETE" ]; then
    DELETE_COUNT=$(echo "$BACKUPS_TO_DELETE" | wc -w)
    echo "Deleting $DELETE_COUNT old backup(s) outside retention policy..."
    rm -f $BACKUPS_TO_DELETE
    echo "✓ Old backups deleted"
fi

TOTAL_BACKUPS=$(ls -1 "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | wc -l)
echo "✓ Backup complete"
echo "  Retention policy: ${DAILY_RETENTION} daily, ${WEEKLY_RETENTION} weekly, ${MONTHLY_RETENTION} monthly"
echo "  Total backups retained: ${TOTAL_BACKUPS}"
