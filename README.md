# Voxchat

Voxchat is a full-stack chat application built to demonstrate production-style product engineering: authenticated chat flows, persistent conversation data, realtime events, automated tests, containerized local development, and an AWS/Kubernetes deployment path.

The app is intentionally broader than a UI prototype. It includes a React frontend, an Express API, PostgreSQL persistence through Prisma, Socket.IO realtime messaging, Helm charts, Terraform infrastructure, and GitHub Actions workflows for CI/CD.

## What It Does

- Email/password authentication with signed HTTP-only cookies and CSRF protection
- Conversation list with search, filtering, unread state, and active conversation routing
- Direct and group conversation views
- Text, image, and file-style message payloads
- Message replies and emoji reactions
- Typing indicators and delivery/read-style status handling
- Realtime socket events for messages, typing, presence, and calls
- Right-side contact/member/media panel
- Notification mute state per conversation
- Seeded demo data for local development

## Tech Stack

| Area | Tools |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, Socket.IO Client |
| Backend | Node.js, Express, TypeScript, Socket.IO |
| Database | PostgreSQL, Prisma ORM |
| Testing | Jest, Supertest, Vitest, Testing Library |
| Local runtime | Docker Compose, Make |
| Infrastructure | Terraform, AWS VPC, EKS, ECR, RDS, Route 53, ACM |
| Kubernetes | Helm, Gateway API, AWS Load Balancer Controller, External Secrets, ExternalDNS, Prometheus/Grafana, Loki, Alertmanager |
| CI/CD | GitHub Actions, Docker Buildx, Trivy, Syft, Cosign, SonarQube |

## Repository Layout

```text
backend/      Express API, Prisma schema, realtime Socket.IO server, backend tests
frontend/     React chat UI, reusable components, hooks, frontend tests
helm/         Application and platform Helm charts/values
terraform/    AWS infrastructure for dev/prod environments
scripts/      Deployment, destroy, kubeconfig, and EKS bootstrap helpers
.github/      CI, security, Docker publish, and deploy workflows
```

## Local Development

The fastest way to run the full stack is Docker Compose. It starts PostgreSQL, runs Prisma setup/seed commands, starts the backend, and starts the frontend dev server.

```bash
docker compose up --build
```

Default local URLs:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:4000
Health:   http://localhost:4000/health
Metrics:  http://localhost:4000/metrics
```

The seeded demo password is:

```text
Password123!
```

If you prefer running services manually, create environment files from the examples and run backend/frontend commands directly:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

cd backend
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev

cd ../frontend
npm install
npm run dev
```

## Quality Checks

Common checks are wrapped in the root `Makefile`:

```bash
make install
make typecheck
make test
make build
make helm-template
```

Individual package commands are also available:

```bash
cd backend && npm test
cd frontend && npm test
```

## Backend Overview

The API is organized around controllers, services, middleware, and Prisma models:

- `backend/src/controllers`: HTTP request handling for auth, conversations, messages, and realtime state
- `backend/src/services`: conversation/message/typing business logic
- `backend/src/middleware`: auth, CSRF, async error handling, and 404 handling
- `backend/src/realtime`: Socket.IO authentication, rooms, presence, and event handlers
- `backend/prisma/schema.prisma`: users, conversations, participants, messages, reactions, media, typing state, and call state

Main API surfaces include:

```text
GET  /health
GET  /ready
GET  /api/bootstrap
POST /api/auth/login
POST /api/auth/signup
POST /api/auth/logout
GET  /api/auth/me
GET  /api/conversations
GET  /api/conversations/:conversationId/messages
POST /api/conversations/:conversationId/messages
POST /api/conversations/:conversationId/typing
POST /api/conversations/:conversationId/call/start
POST /api/conversations/:conversationId/call/end
```

## Frontend Overview

The frontend is a routed React app with a chat workspace as the primary experience:

- `frontend/src/App.tsx`: auth restoration, routing, login/signup/forgot routes, and chat route shell
- `frontend/src/hooks/useChatApp.ts`: main chat state, conversation loading, message actions, and UI coordination
- `frontend/src/components/Sidebar`: conversations, search, tabs, settings, and new chat affordances
- `frontend/src/components/Chat`: header, message list, composer, replies, reactions, typing, and call banner
- `frontend/src/components/RightPanel`: contact profile, members, notifications, and shared media
- `frontend/src/lib/api.ts`: credentialed API client with CSRF header handling
- `frontend/src/lib/socket.ts`: Socket.IO client and typed event emit helper

## Deployment

Voxchat can be deployed to AWS using the infrastructure and platform code in this repository.

High-level deployment flow:

1. Terraform provisions VPC, EKS, RDS, ECR, Route 53, ACM, IAM, and secrets.
2. Docker images are built and pushed to ECR.
3. Helm installs platform components and app charts.
4. Gateway API and AWS Load Balancer Controller expose `voxchat.in`, `api.voxchat.in`, and `grafana.voxchat.in`.
5. External Secrets reads backend runtime secrets from AWS Secrets Manager.
6. ExternalDNS manages Route 53 DNS records.
7. In prod, Prometheus, Grafana, Loki, Promtail, and Alertmanager are installed into the `monitoring` namespace with Helm.

Useful deployment helper:

```bash
export IMAGE_TAG="<image-tag>"
export GRAFANA_ADMIN_PASSWORD="<strong-password>"

./scripts/deploy.sh
```

If infrastructure already exists:

```bash
SKIP_TERRAFORM_APPLY=true ./scripts/deploy.sh
```

Monitoring installs by default only when `ENVIRONMENT=prod`. Set `INSTALL_MONITORING=true` for another environment, `INSTALL_MONITORING=false` to skip Prometheus/Grafana/Alertmanager, or `INSTALL_LOKI=false` to skip Loki/Promtail while keeping the rest of the monitoring stack.

The detailed AWS runbook is in [help.md](help.md).

## CI/CD And Security

GitHub Actions workflows cover:

- Build and test gates
- Static analysis and SonarQube checks
- Secret scanning
- Docker build and publish to ECR
- Trivy container scanning
- Syft SBOM generation
- Cosign image signing and SBOM attestation
- EKS deployment after image publish

Deployment requires these repository secrets:

```text
AWS_ACCOUNT_ID
AWS_ROLE_ARN
SONAR_TOKEN
SONAR_HOST_URL
GRAFANA_ADMIN_PASSWORD
```

Optional repository variables:

```text
VITE_API_URL
VITE_CSRF_COOKIE_NAME
```

## Engineering Notes

- The backend enforces participant-scoped conversation access.
- Cookies are used for auth so browser requests and Socket.IO handshakes share the same session model.
- CSRF protection is applied to unsafe HTTP methods.
- Helm templates fail fast when required image repositories are missing.
- The app uses immutable image tags for ECR deployment.
- The local Docker path is optimized for quick review: one command starts database, API, and UI with seeded data.
