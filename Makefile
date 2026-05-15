SHELL := /bin/bash

.PHONY: install build test typecheck dev docker-up docker-down backend-migrate backend-seed helm-template terraform-validate

install:
	cd backend && npm ci
	cd frontend && npm ci

build:
	cd backend && npm run build
	cd frontend && npm run build

test:
	cd backend && npm test
	cd frontend && npm test

typecheck:
	cd backend && npm run typecheck:test
	cd frontend && npm run typecheck

dev:
	docker compose up postgres backend frontend

docker-up:
	docker compose up --build

docker-down:
	docker compose down

backend-migrate:
	cd backend && npm run db:migrate

backend-seed:
	cd backend && npm run db:seed

helm-template:
	helm template voxchat-backend helm/charts/backend --namespace voxchat --values helm/values/dev/backend.yaml --set image.repository=example.com/vox-backend --set image.tag=test >/dev/null
	helm template voxchat-frontend helm/charts/frontend --namespace voxchat --values helm/values/dev/frontend.yaml --set image.repository=example.com/vox-frontend --set image.tag=test >/dev/null

terraform-validate:
	terraform fmt -check -recursive terraform
	terraform -chdir=terraform/environments/dev validate
