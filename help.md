# Voxchat AWS Deployment Guide

This guide deploys Voxchat to AWS using Terraform, ECR, EKS, Helmfile, Gateway API, External Secrets Operator, ExternalDNS, and AWS Load Balancer Controller.

## 1. Prerequisites

Install these tools locally:

```bash
aws --version
docker --version
kubectl version --client
helm version
helmfile --version
terraform version
node --version
npm --version
```

Expected versions:

```bash
node 24.x
terraform 1.15.3
helm 4.x
```

Install Helmfile on macOS if missing:

```bash
brew install helmfile
```

Authenticate AWS:

```bash
aws configure sso
aws sso login
aws sts get-caller-identity
```

## 2. Prepare Local Environment

Create local env files:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Install dependencies and verify the app:

```bash
make install
make typecheck
make test
make build
```

Run locally with Postgres:

```bash
docker compose up --build
```

Open:

```text
http://localhost:5173
```

## 3. Configure Terraform Variables

Edit:

```bash
terraform/environments/dev/terraform.tfvars
```

At minimum, confirm these values:

```hcl
aws_region       = "ap-south-1"
environment      = "dev"
eks_cluster_name = "voxchat-eks"
domain_name      = "voxchat.in"
github_org       = "ravinder77"
github_repo      = "vox"
```

If starting from scratch:

```bash
cp terraform/environments/dev/terraform.tfvars.example terraform/environments/dev/terraform.tfvars
```

## 4. Create Terraform State Bucket

The dev backend expects this S3 bucket:

```bash
aws s3api create-bucket \
  --bucket voxchat-tfstate \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1
```

Enable versioning:

```bash
aws s3api put-bucket-versioning \
  --bucket voxchat-tfstate \
  --versioning-configuration Status=Enabled
```

## 5. Provision AWS Infrastructure

Initialize and apply Terraform:

```bash
terraform -chdir=terraform/environments/dev init
terraform -chdir=terraform/environments/dev fmt
terraform -chdir=terraform/environments/dev validate
terraform -chdir=terraform/environments/dev apply
```

Save useful outputs:

```bash
export AWS_REGION=ap-south-1
export CLUSTER_NAME="$(terraform -chdir=terraform/environments/dev output -raw cluster_name)"
export BACKEND_IMAGE_REPOSITORY="$(terraform -chdir=terraform/environments/dev output -raw backend_repository_url)"
export FRONTEND_IMAGE_REPOSITORY="$(terraform -chdir=terraform/environments/dev output -raw frontend_repository_url)"
```

Update kubeconfig:

```bash
aws eks update-kubeconfig --name "${CLUSTER_NAME}" --region "${AWS_REGION}"
kubectl get nodes
```

## 6. Configure DNS

Terraform creates the Route 53 hosted zone and ACM certificate records. Get the hosted zone name servers:

```bash
aws route53 get-hosted-zone \
  --id "$(terraform -chdir=terraform/environments/dev output -raw route53_zone_id)"
```

At your domain registrar, set the domain name servers to the Route 53 name servers.

Wait until DNS delegates correctly:

```bash
dig NS voxchat.in
```

## 7. Build and Push Images Manually

Use a unique immutable image tag:

```bash
export IMAGE_TAG="$(git rev-parse HEAD)"
```

Log in to ECR:

```bash
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${BACKEND_IMAGE_REPOSITORY%/*}"
```

Build and push backend:

```bash
docker build \
  -t "${BACKEND_IMAGE_REPOSITORY}:${IMAGE_TAG}" \
  backend

docker push "${BACKEND_IMAGE_REPOSITORY}:${IMAGE_TAG}"
```

Build and push frontend:

```bash
docker build \
  --build-arg VITE_API_URL=https://api.voxchat.in/api \
  --build-arg VITE_CSRF_COOKIE_NAME=vox_csrf \
  -t "${FRONTEND_IMAGE_REPOSITORY}:${IMAGE_TAG}" \
  frontend

docker push "${FRONTEND_IMAGE_REPOSITORY}:${IMAGE_TAG}"
```

## 8. Deploy Platform and App

Set required deployment variables:

```bash
export AWS_REGION=ap-south-1
export TERRAFORM_DIR=terraform/environments/dev
export ENVIRONMENT=dev
export HELMFILE_ENVIRONMENT=dev
export GRAFANA_ADMIN_PASSWORD='replace-with-a-strong-password'
export IMAGE_TAG="$(git rev-parse HEAD)"
```

Deploy everything:

```bash
./scripts/deploy.sh
```

If Terraform has already been applied:

```bash
SKIP_TERRAFORM_APPLY=true ./scripts/deploy.sh
```

## 9. Deploy Only App Charts

Use this after platform components are already installed:

```bash
export BACKEND_IMAGE_REPOSITORY="$(terraform -chdir=terraform/environments/dev output -raw backend_repository_url)"
export FRONTEND_IMAGE_REPOSITORY="$(terraform -chdir=terraform/environments/dev output -raw frontend_repository_url)"
export IMAGE_TAG="$(git rev-parse HEAD)"

helm upgrade --install voxchat-backend helm/charts/backend \
  --namespace voxchat --create-namespace \
  --values helm/values/dev/backend.yaml \
  --set image.repository="${BACKEND_IMAGE_REPOSITORY}" \
  --set image.tag="${IMAGE_TAG}"

helm upgrade --install voxchat-frontend helm/charts/frontend \
  --namespace voxchat --create-namespace \
  --values helm/values/dev/frontend.yaml \
  --set image.repository="${FRONTEND_IMAGE_REPOSITORY}" \
  --set image.tag="${IMAGE_TAG}"
```

## 10. Verify Deployment

Check namespaces and pods:

```bash
kubectl get ns
kubectl get pods -A
kubectl get pods -n voxchat
kubectl get gateway -n voxchat
kubectl get httproute -n voxchat
kubectl get externalsecret -n voxchat
kubectl get targetgroupconfiguration -n voxchat
```

Check backend health:

```bash
kubectl port-forward -n voxchat svc/voxchat-backend-svc 4000:80
curl http://localhost:4000/health
curl http://localhost:4000/ready
```

Check public DNS:

```bash
dig voxchat.in
dig api.voxchat.in
curl -I https://voxchat.in
curl https://api.voxchat.in/health
```

## 11. GitHub Actions Setup

Configure repository secrets:

```text
AWS_ACCOUNT_ID
AWS_ROLE_ARN
SONAR_TOKEN
SONAR_HOST_URL
GRAFANA_ADMIN_PASSWORD
```

Optional repository variables:

```text
VITE_API_URL=https://api.voxchat.in/api
VITE_CSRF_COOKIE_NAME=voxchat_csrf
```

Push to `dev` or `main` to run CI/CD:

```bash
git push origin dev
```

## 12. Useful Operations

Render charts locally:

```bash
make helm-template
```

Deploy prod values with Helmfile:

```bash
export ENVIRONMENT=prod
export HELMFILE_ENVIRONMENT=prod
export CLUSTER_NAME="$(terraform -chdir=terraform/environments/dev output -raw cluster_name)"
export GRAFANA_ADMIN_PASSWORD='replace-with-a-strong-password'
export BACKEND_IMAGE_REPOSITORY="$(terraform -chdir=terraform/environments/dev output -raw backend_repository_url)"
export FRONTEND_IMAGE_REPOSITORY="$(terraform -chdir=terraform/environments/dev output -raw frontend_repository_url)"
export IMAGE_TAG="$(git rev-parse HEAD)"

helmfile --environment prod apply
```

View logs:

```bash
kubectl logs -n voxchat deploy/voxchat-backend
kubectl logs -n voxchat deploy/voxchat-frontend
kubectl logs -n external-dns deploy/external-dns
kubectl logs -n external-secrets deploy/external-secrets
kubectl logs -n kube-system deploy/aws-load-balancer-controller
```

Rollback:

```bash
helm history voxchat-backend -n voxchat
helm rollback voxchat-backend <revision> -n voxchat

helm history voxchat-frontend -n voxchat
helm rollback voxchat-frontend <revision> -n voxchat
```

Destroy app and infrastructure:

```bash
./scripts/destroy.sh
```

## 13. Common Failure Checks

If pods cannot read secrets:

```bash
kubectl describe externalsecret voxchat-backend -n voxchat
kubectl describe clustersecretstore aws-secrets-store
kubectl get secret voxchat-backend-env -n voxchat
```

If the ALB does not appear:

```bash
kubectl describe gateway voxchat-gateway -n voxchat
kubectl logs -n kube-system deploy/aws-load-balancer-controller
```

If DNS records do not appear:

```bash
kubectl logs -n external-dns deploy/external-dns
kubectl describe httproute voxchat-frontend -n voxchat
kubectl describe httproute voxchat-backend -n voxchat
```

If migrations fail:

```bash
kubectl logs -n voxchat job/voxchat-backend-schema
kubectl describe job voxchat-backend-schema -n voxchat
```
aws acm list-certificates --region ap-south-1