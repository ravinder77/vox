#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

TERRAFORM_DIR="${TERRAFORM_DIR:-terraform/environments/dev}"
AWS_REGION="${AWS_REGION:-ap-south-1}"
ENVIRONMENT="${ENVIRONMENT:-$(basename "${TERRAFORM_DIR}")}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse HEAD)}"
INSTALL_MONITORING="${INSTALL_MONITORING:-true}"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

need aws
need helm
need kubectl
need terraform

if [[ ! -f "helm/values/${ENVIRONMENT}/backend.yaml" || ! -f "helm/values/${ENVIRONMENT}/frontend.yaml" ]]; then
  echo "Missing Helm values for environment: ${ENVIRONMENT}" >&2
  exit 1
fi

if [[ "${INSTALL_MONITORING}" == "true" && -z "${GRAFANA_ADMIN_PASSWORD:-}" ]]; then
  echo "Set GRAFANA_ADMIN_PASSWORD or run with INSTALL_MONITORING=false" >&2
  exit 1
fi

terraform -chdir="${TERRAFORM_DIR}" init

if [[ "${SKIP_TERRAFORM_APPLY:-false}" != "true" ]]; then
  terraform -chdir="${TERRAFORM_DIR}" apply -auto-approve
fi

export BACKEND_IMAGE_REPOSITORY="${BACKEND_IMAGE_REPOSITORY:-$(terraform -chdir="${TERRAFORM_DIR}" output -raw backend_repository_url)}"
export FRONTEND_IMAGE_REPOSITORY="${FRONTEND_IMAGE_REPOSITORY:-$(terraform -chdir="${TERRAFORM_DIR}" output -raw frontend_repository_url)}"
export IMAGE_TAG

CLUSTER_NAME="$(terraform -chdir="${TERRAFORM_DIR}" output -raw cluster_name)"
ACM_CERTIFICATE_ARN="$(terraform -chdir="${TERRAFORM_DIR}" output -raw acm_certificate_arn)"
VPC_ID="$(terraform -chdir="${TERRAFORM_DIR}" output -raw vpc_id)"
export CLUSTER_NAME
export VPC_ID

aws eks update-kubeconfig --name "${CLUSTER_NAME}" --region "${AWS_REGION}"

./scripts/bootstrap-eks.sh

helm repo add external-secrets https://charts.external-secrets.io
helm repo add external-dns https://kubernetes-sigs.github.io/external-dns
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

if [[ "${INSTALL_MONITORING}" == "true" ]]; then
  helm upgrade --install voxchat-monitoring prometheus-community/kube-prometheus-stack \
    --namespace monitoring \
    --create-namespace \
    --version 58.x.x \
    --values helm/values/kube-prometheus-stack.yaml \
    --set grafana.adminPassword="${GRAFANA_ADMIN_PASSWORD}" \
    --wait
fi

helm upgrade --install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace \
  --version 2.3.0 \
  --values helm/values/external-secrets.yaml \
  --wait

kubectl apply -f platform/external-secrets/cluster-secret-store.yaml

helm upgrade --install external-dns external-dns/external-dns \
  --namespace external-dns \
  --create-namespace \
  --version 1.21.1 \
  --values helm/values/external-dns.yaml \
  --wait

helm upgrade --install voxchat-gateway helm/charts/gateway \
  --namespace voxchat \
  --create-namespace \
  --set acmCertificateArn="${ACM_CERTIFICATE_ARN}" \
  --wait

kubectl delete job voxchat-backend-schema -n voxchat --ignore-not-found

helm upgrade --install voxchat-backend helm/charts/backend \
  --namespace voxchat \
  --create-namespace \
  --values "helm/values/${ENVIRONMENT}/backend.yaml" \
  --set image.repository="${BACKEND_IMAGE_REPOSITORY}" \
  --set image.tag="${IMAGE_TAG}" \
  --wait

helm upgrade --install voxchat-frontend helm/charts/frontend \
  --namespace voxchat \
  --create-namespace \
  --values "helm/values/${ENVIRONMENT}/frontend.yaml" \
  --set image.repository="${FRONTEND_IMAGE_REPOSITORY}" \
  --set image.tag="${IMAGE_TAG}" \
  --wait
