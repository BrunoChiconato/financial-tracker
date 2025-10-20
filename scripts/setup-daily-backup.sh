#!/bin/bash

set -e

PROJECT_DIR="/home/bruno/Jornada/financial-tracker"
CRON_TIME="0 20 * * *"
CRON_CMD="cd $PROJECT_DIR && make backup >> $PROJECT_DIR/logs/backup.log 2>&1"
CRON_ENTRY="$CRON_TIME $CRON_CMD"

echo "Setting up daily backup at 8 PM Brasilia Time..."
echo ""

if ! command -v cron &> /dev/null; then
    echo "❌ Error: cron is not installed"
    echo "Install with: sudo apt-get install cron"
    exit 1
fi

if ! service cron status > /dev/null 2>&1; then
    echo "⚠️  Warning: cron service is not running"
    echo "Start with: sudo service cron start"
fi

mkdir -p "$PROJECT_DIR/logs"

if crontab -l 2>/dev/null | grep -F "$CRON_CMD" > /dev/null; then
    echo "✓ Backup cron job already exists"
    echo ""
    echo "Current backup schedule:"
    crontab -l | grep -F "make backup"
else
    echo "Adding backup cron job..."
    (crontab -l 2>/dev/null || true; echo "$CRON_ENTRY") | crontab -
    echo "✓ Backup cron job added successfully"
fi

echo ""
echo "📅 Backup Schedule: Every day at 8:00 PM Brasilia Time"
echo "📁 Backup Location: $PROJECT_DIR/backups/"
echo "📝 Log File: $PROJECT_DIR/logs/backup.log"
echo ""
echo "View current crontab:"
echo "  crontab -l"
echo ""
echo "View backup logs:"
echo "  tail -f $PROJECT_DIR/logs/backup.log"
echo ""
echo "Manual backup:"
echo "  make backup"
echo ""
