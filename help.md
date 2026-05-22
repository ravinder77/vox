# Voxchat AWS Deployment Guide

This guide deploys Voxchat to AWS using Terraform, ECR, EKS, Helm, Gateway API, External Secrets Operator, ExternalDNS, AWS Load Balancer Controller, Prometheus, Grafana, Loki, Promtail, and Alertmanager.

Helmfile is not used in this deployment flow. The `./scripts/deploy.sh` helper follows the same Helm-based flow as this guide.

## 1. Prerequisites

Install these tools locally:

```bash
aws --version
docker --version
kubectl version --client
helm version
terraform version
node --version
npm --version
```

Expected local runtime:

```bash
node 24.x
terraform 1.15.3
helm 4.x
```

Authenticate to AWS:

```bash
aws configure sso
aws sso login
aws sts get-caller-identity
```

## 2. Choose Environment

For dev:

```bash
cd /Users/ravinder/Projects/voxchat

export AWS_REGION=ap-south-1
export TERRAFORM_DIR=terraform/environments/dev
export ENVIRONMENT=dev
```

For prod:

```bash
cd /Users/ravinder/Projects/voxchat

export AWS_REGION=ap-south-1
export TERRAFORM_DIR=terraform/environments/prod
export ENVIRONMENT=prod
```

Before deploying prod, confirm `terraform/environments/prod/terraform.tfvars` contains:

```hcl
environment = "prod"
github_repo = "voxchat"
```

## 3. Verify App Locally

Install dependencies and run checks:

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
http://localhost:4000/metrics
```

Stop local containers when finished:

```bash
docker compose down
```

## 4. Configure Terraform Variables

Edit the selected environment file:

```bash
$TERRAFORM_DIR/terraform.tfvars
```

At minimum, confirm:

```hcl
aws_region       = "ap-south-1"
environment      = "dev"
eks_cluster_name = "voxchat-eks"
domain_name      = "voxchat.in"
github_org       = "ravinder77"
github_repo      = "voxchat"
```

Use `environment = "prod"` only when deploying prod.

## 5. Create Terraform State Bucket

The Terraform backend expects this S3 bucket:

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

If the bucket already exists, continue.

## 6. Provision AWS Infrastructure

Initialize, format, validate, and apply Terraform:

```bash
terraform -chdir="$TERRAFORM_DIR" init
terraform -chdir="$TERRAFORM_DIR" fmt
terraform -chdir="$TERRAFORM_DIR" validate
terraform -chdir="$TERRAFORM_DIR" apply
```

Save useful outputs:

```bash
export CLUSTER_NAME="$(terraform -chdir="$TERRAFORM_DIR" output -raw cluster_name)"
export BACKEND_IMAGE_REPOSITORY="$(terraform -chdir="$TERRAFORM_DIR" output -raw backend_repository_url)"
export FRONTEND_IMAGE_REPOSITORY="$(terraform -chdir="$TERRAFORM_DIR" output -raw frontend_repository_url)"
export ROUTE53_ZONE_ID="$(terraform -chdir="$TERRAFORM_DIR" output -raw route53_zone_id)"
export ACM_CERTIFICATE_ARN="$(terraform -chdir="$TERRAFORM_DIR" output -raw acm_certificate_arn)"

echo "$CLUSTER_NAME"
echo "$BACKEND_IMAGE_REPOSITORY"
echo "$FRONTEND_IMAGE_REPOSITORY"
echo "$ROUTE53_ZONE_ID"
echo "$ACM_CERTIFICATE_ARN"
```

Update kubeconfig:

```bash
aws eks update-kubeconfig \
  --name "$CLUSTER_NAME" \
  --region "$AWS_REGION"

kubectl get nodes
```

## 7. Configure DNS

Terraform creates the Route 53 hosted zone and ACM certificate validation records.

Get the Route 53 name servers:

```bash
aws route53 get-hosted-zone \
  --id "$ROUTE53_ZONE_ID" \
  --query 'DelegationSet.NameServers' \
  --output table
```

In GoDaddy or other domain provider, set the domain name servers to the Route 53 name servers.

Wait until delegation is correct:

```bash
dig NS voxchat.in
```

Check ACM certificate validation:

```bash
aws acm list-certificates --region "$AWS_REGION"
```

## 8. Build And Push Docker Images

Use a unique tag because the ECR repositories are immutable:

```bash
export IMAGE_TAG="sha-$(git rev-parse --short HEAD)-$(date +%Y%m%d%H%M%S)"
echo "$IMAGE_TAG"
```

Log in to ECR:

```bash
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login \
    --username AWS \
    --password-stdin "$(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com"
```

Build and push backend for the EKS node platform:

```bash
docker buildx build \
  --platform linux/amd64 \
  -t "$BACKEND_IMAGE_REPOSITORY:$IMAGE_TAG" \
  --push \
  backend
```

Build and push frontend for the EKS node platform:

```bash
docker buildx build \
  --platform linux/amd64 \
  --build-arg VITE_API_URL=https://api.voxchat.in/api \
  --build-arg VITE_CSRF_COOKIE_NAME=vox_csrf \
  -t "$FRONTEND_IMAGE_REPOSITORY:$IMAGE_TAG" \
  --push \
  frontend
```

Confirm images exist:

```bash
aws ecr describe-images \
  --repository-name voxchat/backend \
  --image-ids imageTag="$IMAGE_TAG" \
  --region "$AWS_REGION"

aws ecr describe-images \
  --repository-name voxchat/frontend \
  --image-ids imageTag="$IMAGE_TAG" \
  --region "$AWS_REGION"
```

## 9. Create Kubernetes Namespaces

```bash
kubectl create namespace voxchat --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace external-secrets --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace external-dns --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
kubectl label namespace voxchat voxchat.in/gateway-access=true --overwrite
kubectl label namespace monitoring voxchat.in/gateway-access=true --overwrite
```

## 10. Install Gateway API CRDs

Install Gateway API CRDs:

```bash
kubectl apply --server-side=true \
  -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.5.1/standard-install.yaml
```

Install AWS Load Balancer Controller Gateway API CRDs:

```bash
kubectl apply \
  -f https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.14.1/config/crd/gateway/gateway-crds.yaml
```

Wait for CRDs:

```bash
kubectl wait --for=condition=established \
  crd/gateways.gateway.networking.k8s.io \
  crd/httproutes.gateway.networking.k8s.io \
  crd/grpcroutes.gateway.networking.k8s.io \
  crd/loadbalancerconfigurations.gateway.k8s.aws \
  crd/targetgroupconfigurations.gateway.k8s.aws \
  crd/listenerruleconfigurations.gateway.k8s.aws \
  --timeout=60s
```

## 11. Add Helm Repositories

```bash
helm repo add eks https://aws.github.io/eks-charts
helm repo add external-secrets https://charts.external-secrets.io
helm repo add external-dns https://kubernetes-sigs.github.io/external-dns
helm repo add grafana https://grafana.github.io/helm-charts
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

The `grafana` Helm repository provides the Loki chart used below. Voxchat installs it as the `voxchat-loki` release in the `monitoring` namespace with values from `helm/values/loki-stack.yaml`.

## 12. Install Platform With Helm

Set Grafana admin password:

```bash
export GRAFANA_ADMIN_PASSWORD='replace-with-a-strong-password'
```

Install AWS Load Balancer Controller:

```bash
helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  --namespace kube-system \
  --version 1.14.1 \
  --values helm/values/gateway.yaml \
  --set clusterName="$CLUSTER_NAME" \
  --wait
```

Install Loki and Promtail with the Grafana Loki Helm chart:

```bash
helm upgrade --install voxchat-loki grafana/loki-stack \
  --namespace monitoring \
  --create-namespace \
  --version 2.10.2 \
  --values helm/values/loki-stack.yaml \
  --wait
```

This chart deploys Loki for log storage and Promtail for log collection. When Loki is installed, add `helm/values/kube-prometheus-stack-loki.yaml` to the kube-prometheus-stack install so Grafana gets a Loki datasource at `http://voxchat-loki:3100`.

Install Prometheus, Grafana, and Alertmanager:

```bash
helm upgrade --install voxchat-monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --version 58.x.x \
  --values helm/values/kube-prometheus-stack.yaml \
  --values helm/values/kube-prometheus-stack-loki.yaml \
  --set grafana.adminPassword="$GRAFANA_ADMIN_PASSWORD" \
  --wait
```

When using `./scripts/deploy.sh`, monitoring installs by default only when `ENVIRONMENT=prod`. Set `INSTALL_MONITORING=true` to install Prometheus, Grafana, and Alertmanager in another environment. Set `INSTALL_MONITORING=false` to skip them. Set `INSTALL_LOKI=false` to skip Loki and Promtail while keeping the rest of monitoring enabled; the deploy script will also skip the Loki Grafana datasource overlay.

Install External Secrets Operator:

```bash
helm upgrade --install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace \
  --version 2.3.0 \
  --values helm/values/external-secrets.yaml \
  --wait
```

Install ExternalDNS:

```bash
helm upgrade --install external-dns external-dns/external-dns \
  --namespace external-dns \
  --create-namespace \
  --version 1.21.1 \
  --values helm/values/external-dns.yaml \
  --wait
```

## 13. Install Shared Platform Resources

```bash
kubectl apply -f platform/external-secrets/cluster-secret-store.yaml

helm upgrade --install voxchat-gateway helm/charts/gateway \
  --namespace voxchat \
  --create-namespace \
  --set acmCertificateArn="$ACM_CERTIFICATE_ARN" \
  --wait

kubectl apply -f platform/monitoring/grafana-gateway-route.yaml
```

Verify platform resources:

```bash
kubectl get pods -n kube-system | grep aws-load-balancer-controller
kubectl get pods -n external-secrets
kubectl get pods -n external-dns
kubectl get pods -n monitoring
kubectl get gatewayclass
kubectl get gateway -n voxchat
kubectl get httproute grafana -n monitoring
kubectl get targetgroupconfiguration voxchat-monitoring-grafana -n monitoring
```

## 14. Deploy App With Helm

Deploy backend:

```bash
helm upgrade --install voxchat-backend helm/charts/backend \
  --namespace voxchat \
  --create-namespace \
  --values "helm/values/$ENVIRONMENT/backend.yaml" \
  --set image.repository="$BACKEND_IMAGE_REPOSITORY" \
  --set image.tag="$IMAGE_TAG" \
  --wait
```

Deploy frontend:

```bash
helm upgrade --install voxchat-frontend helm/charts/frontend \
  --namespace voxchat \
  --create-namespace \
  --values "helm/values/$ENVIRONMENT/frontend.yaml" \
  --set image.repository="$FRONTEND_IMAGE_REPOSITORY" \
  --set image.tag="$IMAGE_TAG" \
  --wait
```

## 15. Verify Deployment

Check workloads and routing:

```bash
kubectl get pods -n voxchat
kubectl get svc -n voxchat
kubectl get hpa -n voxchat
kubectl get httproute -n voxchat
kubectl get gateway -n voxchat
kubectl get externalsecret -n voxchat
kubectl get targetgroupconfiguration -n voxchat
kubectl get servicemonitor -n voxchat
kubectl get prometheusrule -n voxchat
kubectl get httproute grafana -n monitoring
```

Check rollout status:

```bash
kubectl rollout status deployment/voxchat-backend -n voxchat
kubectl rollout status deployment/voxchat-frontend -n voxchat
```

Check backend logs:

```bash
kubectl logs -n voxchat deploy/voxchat-backend --tail=100
```

Check frontend logs:

```bash
kubectl logs -n voxchat deploy/voxchat-frontend --tail=100
```

Check backend health inside the cluster:

```bash
kubectl port-forward -n voxchat svc/voxchat-backend-svc 4000:80
```

In another terminal:

```bash
curl http://localhost:4000/health
curl http://localhost:4000/ready
curl http://localhost:4000/metrics
```

Check monitoring inside the cluster by running each port-forward command in a separate terminal as needed:

```bash
kubectl port-forward -n monitoring svc/voxchat-monitoring-grafana 3000:80
kubectl port-forward -n monitoring svc/voxchat-monitoring-prometheus 9090:9090
kubectl port-forward -n monitoring svc/voxchat-monitoring-alertmanager 9093:9093
```

Open Grafana at `http://localhost:3000` and log in with `admin` plus `GRAFANA_ADMIN_PASSWORD`. Prometheus should show the `voxchat-backend` target as up, and Grafana should have Prometheus and Loki datasources.

Check public DNS and HTTPS:

```bash
dig voxchat.in
dig api.voxchat.in
dig grafana.voxchat.in
curl -I https://voxchat.in
curl https://api.voxchat.in/health
curl https://api.voxchat.in/ready
curl -I https://grafana.voxchat.in/login
```

Expected public URLs:

```text
https://voxchat.in
https://api.voxchat.in
https://grafana.voxchat.in
```

## 16. Upgrade App After Code Changes

Build and push a new immutable image tag:

```bash
export IMAGE_TAG="sha-$(git rev-parse --short HEAD)-$(date +%Y%m%d%H%M%S)"

docker buildx build \
  --platform linux/amd64 \
  -t "$BACKEND_IMAGE_REPOSITORY:$IMAGE_TAG" \
  --push \
  backend

docker buildx build \
  --platform linux/amd64 \
  --build-arg VITE_API_URL=https://api.voxchat.in/api \
  --build-arg VITE_CSRF_COOKIE_NAME=vox_csrf \
  -t "$FRONTEND_IMAGE_REPOSITORY:$IMAGE_TAG" \
  --push \
  frontend
```

Upgrade the app:

```bash
kubectl delete job voxchat-backend-schema -n voxchat --ignore-not-found

helm upgrade --install voxchat-backend helm/charts/backend \
  --namespace voxchat \
  --values "helm/values/$ENVIRONMENT/backend.yaml" \
  --set image.repository="$BACKEND_IMAGE_REPOSITORY" \
  --set image.tag="$IMAGE_TAG" \
  --wait

helm upgrade --install voxchat-frontend helm/charts/frontend \
  --namespace voxchat \
  --values "helm/values/$ENVIRONMENT/frontend.yaml" \
  --set image.repository="$FRONTEND_IMAGE_REPOSITORY" \
  --set image.tag="$IMAGE_TAG" \
  --wait
```

## 17. Rollback

View release history:

```bash
helm history voxchat-backend -n voxchat
helm history voxchat-frontend -n voxchat
```

Rollback backend:

```bash
helm rollback voxchat-backend <revision> -n voxchat --wait
```

Rollback frontend:

```bash
helm rollback voxchat-frontend <revision> -n voxchat --wait
```

## 18. Useful Operations

Render charts locally:

```bash
make helm-template
```

List Helm releases:

```bash
helm list -A
```

View platform logs:

```bash
kubectl logs -n external-dns deploy/external-dns --tail=100
kubectl logs -n external-secrets deploy/external-secrets --tail=100
kubectl logs -n kube-system deploy/aws-load-balancer-controller --tail=100
kubectl logs -n monitoring -l app.kubernetes.io/name=loki --tail=100
kubectl logs -n monitoring -l app.kubernetes.io/name=promtail --tail=100
```

Describe app resources:

```bash
kubectl describe pod -n voxchat -l app.kubernetes.io/name=backend
kubectl describe pod -n voxchat -l app.kubernetes.io/name=frontend
kubectl describe httproute voxchat-backend -n voxchat
kubectl describe httproute voxchat-frontend -n voxchat
kubectl describe httproute grafana -n monitoring
```

## 19. Common Failure Checks

If pods cannot read secrets:

```bash
kubectl describe externalsecret voxchat-backend -n voxchat
kubectl describe clustersecretstore aws-secrets-store
kubectl get secret voxchat-backend-env -n voxchat
kubectl logs -n external-secrets deploy/external-secrets --tail=100
```

If the ALB does not appear:

```bash
kubectl describe gateway voxchat-gateway -n voxchat
kubectl logs -n kube-system deploy/aws-load-balancer-controller --tail=100
```

If DNS records do not appear:

```bash
kubectl logs -n external-dns deploy/external-dns --tail=100
kubectl describe httproute voxchat-frontend -n voxchat
kubectl describe httproute voxchat-backend -n voxchat
kubectl describe httproute grafana -n monitoring
```

If migrations fail:

```bash
kubectl get jobs -n voxchat
kubectl logs -n voxchat job/voxchat-backend-schema
kubectl describe job voxchat-backend-schema -n voxchat
```

If Prisma reports `P1001: Can't reach database server`, apply Terraform again so the RDS security group allows traffic from the EKS node and cluster security groups:

```bash
terraform -chdir="$TERRAFORM_DIR" apply
kubectl delete job voxchat-backend-schema -n voxchat --ignore-not-found
```

If Prometheus is not scraping the backend:

```bash
kubectl get servicemonitor -n voxchat
kubectl describe servicemonitor voxchat-backend -n voxchat
kubectl get prometheusrule -n voxchat
kubectl port-forward -n voxchat svc/voxchat-backend-svc 4000:80
curl http://localhost:4000/metrics
```

If Loki logs are missing in Grafana:

```bash
kubectl get pods -n monitoring
kubectl logs -n monitoring -l app.kubernetes.io/name=loki --tail=100
kubectl logs -n monitoring -l app.kubernetes.io/name=promtail --tail=100
```

If Terraform reports `InvalidPermission.Duplicate` for `aws_vpc_security_group_ingress_rule.eks_to_rds`, move the existing state entry to the new `for_each` address using the security group id from the error message, then apply again:

```bash
terraform -chdir="$TERRAFORM_DIR" apply
```

If an image cannot be pulled:

```bash
kubectl describe pod -n voxchat -l app.kubernetes.io/name=backend
kubectl describe pod -n voxchat -l app.kubernetes.io/name=frontend
aws ecr describe-images --repository-name voxchat/backend --region "$AWS_REGION"
aws ecr describe-images --repository-name voxchat/frontend --region "$AWS_REGION"
```

## 20. Cleanup

Uninstall app releases:

```bash
helm uninstall voxchat-frontend -n voxchat
helm uninstall voxchat-backend -n voxchat
```

Uninstall platform releases:

```bash
helm uninstall external-dns -n external-dns
helm uninstall external-secrets -n external-secrets
helm uninstall voxchat-monitoring -n monitoring
helm uninstall voxchat-loki -n monitoring
helm uninstall aws-load-balancer-controller -n kube-system
```

Destroy AWS infrastructure only when you really want to remove the environment:

```bash
terraform -chdir="$TERRAFORM_DIR" destroy
```
