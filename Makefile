SHELL := /bin/sh
.DEFAULT_GOAL := help

ifneq (,$(wildcard .env))
include .env
export
endif

COMPOSE := $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

PROJECT ?= $(if $(COMPOSE_PROJECT_NAME),$(COMPOSE_PROJECT_NAME),$(notdir $(CURDIR)))
DB_SVC ?= db
BOT_SVC ?= bot
BACKEND_SVC ?= backend
FRONTEND_SVC ?= frontend

REQUIRED_ENV = POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB TELEGRAM_BOT_TOKEN ALLOWED_USER_ID TZ

BOT_SRC       := $(shell [ -d bot ] && find bot -type f -not -path "*/__pycache__/*" -not -name "*.pyc" || echo "")
DASH_SRC      := $(shell [ -d dashboard ] && find dashboard -type f -not -path "*/__pycache__/*" -not -name "*.pyc" || echo "")
COMPOSE_FILES := $(shell ls docker-compose*.yml 2>/dev/null || echo docker-compose.yml)

BOT_STAMP       := .bot-build.stamp
DASH_STAMP      := .dashboard-build.stamp
STACK_STAMP     := .stack-build.stamp

.PHONY: help env-check up stop restart logs-bot logs-backend logs-frontend logs-db logs-backup lint clean backup restore clean-containers

help: ## List available commands
	@echo ""
	@echo "💾 DATA SAFETY: This Makefile has NO commands that delete volumes/data"
	@echo "   All commands preserve your database. Use 'make backup' regularly."
	@echo ""
	@echo "Targets:"
	@awk 'BEGIN {FS = ":.*##"; printf ""} /^[a-zA-Z0-9_.-]+:.*?##/ {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""

env-check: ## Validate required environment variables (.env or environment)
	@missing=0; \
	for v in $(REQUIRED_ENV); do \
	  eval val=\$$v; \
	  if [ -z "$$val" ]; then echo "Missing env: $$v"; missing=1; fi; \
	done; \
	if [ $$missing -ne 0 ]; then echo "Set variables above in .env or environment"; exit 1; fi; \
	echo "Environment OK"

up: env-check ## Start full stack detached
	@$(COMPOSE) -p $(PROJECT) up -d --build

stop: ## Stop all services (preserves data and volumes)
	@$(COMPOSE) -p $(PROJECT) stop

rebuild: ## Rebuild and restart services (preserves data)
	@$(COMPOSE) -p $(PROJECT) up -d --build

restart: ## Restart all services
	@$(COMPOSE) -p $(PROJECT) restart

logs-bot: ## Tail logs of bot service
	@$(COMPOSE) -p $(PROJECT) logs -f $(BOT_SVC)

logs-backend: ## Tail logs of backend API service
	@$(COMPOSE) -p $(PROJECT) logs -f $(BACKEND_SVC)

logs-frontend: ## Tail logs of frontend service
	@$(COMPOSE) -p $(PROJECT) logs -f $(FRONTEND_SVC)

logs-db: ## Tail logs of database service
	@$(COMPOSE) -p $(PROJECT) logs -f $(DB_SVC)

logs-backup: ## View automated backup logs
	@if [ -f logs/backup.log ]; then tail -f logs/backup.log; else echo "No backup logs yet. Logs will appear after first automated backup."; fi

clean-containers: ## Remove stopped containers (preserves volumes and data)
	@echo "⚠️  This will remove stopped containers but PRESERVE all data volumes"
	@$(COMPOSE) -p $(PROJECT) down
	@echo "✓ Containers removed. Data volumes preserved. Run 'make up' to restart."

lint: ## Lint Python code with Ruff
	ruff format . && ruff check .

clean: ## Cleanup caches and __pycache__
	rm -rf .ruff_cache .pytest_cache
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -name "*.pyc" -delete
	find . -name "*.pyo" -delete

backup: ## Create database backup
	@./scripts/backup.sh

restore: ## Restore database from backup (Usage: make restore BACKUP=backups/backup_YYYYMMDD_HHMMSS.sql.gz)
	@if [ -z "$(BACKUP)" ]; then \
		echo "Error: Please specify BACKUP file"; \
		echo "Usage: make restore BACKUP=backups/backup_YYYYMMDD_HHMMSS.sql.gz"; \
		echo ""; \
		echo "Available backups:"; \
		ls -1th backups/*.sql.gz 2>/dev/null || echo "No backups found"; \
		exit 1; \
	fi
	@./scripts/restore.sh $(BACKUP)
