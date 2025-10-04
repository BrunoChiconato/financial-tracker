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
DASH_SVC ?= dashboard

REQUIRED_ENV = POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB TELEGRAM_BOT_TOKEN ALLOWED_USER_ID TZ

BOT_SRC       := $(shell [ -d bot ] && find bot -type f -not -path "*/__pycache__/*" -not -name "*.pyc" || echo "")
DASH_SRC      := $(shell [ -d dashboard ] && find dashboard -type f -not -path "*/__pycache__/*" -not -name "*.pyc" || echo "")
COMPOSE_FILES := $(shell ls docker-compose*.yml 2>/dev/null || echo docker-compose.yml)

BOT_STAMP       := .bot-build.stamp
DASH_STAMP      := .dashboard-build.stamp
STACK_STAMP     := .stack-build.stamp

.PHONY: help env-check up down restart logs-bot logs-dashboard logs-db prune lint clean

help: ## List available commands
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

down: ## Stop stack and remove volumes
	@$(COMPOSE) -p $(PROJECT) down -v

stop: ## Stop stack WITHOUT removing volumes (preserves data)
	@$(COMPOSE) -p $(PROJECT) stop

rebuild: ## Rebuild and restart services (preserves data)
	@$(COMPOSE) -p $(PROJECT) up -d --build

restart: ## Restart all services
	@$(COMPOSE) -p $(PROJECT) restart

logs-bot: ## Tail logs of bot service
	@$(COMPOSE) -p $(PROJECT) logs -f $(BOT_SVC)

logs-dashboard: ## Tail logs of dashboard service
	@$(COMPOSE) -p $(PROJECT) logs -f $(DASH_SVC)

logs-db: ## Tail logs of database service
	@$(COMPOSE) -p $(PROJECT) logs -f $(DB_SVC)

prune: ## Remove unused images/containers/networks (caution)
	@docker system prune -f

lint: ## Lint Python code with Ruff
	ruff format . && ruff check .

clean: ## Cleanup caches and __pycache__
	rm -rf .ruff_cache .pytest_cache
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -name "*.pyc" -delete
	find . -name "*.pyo" -delete
