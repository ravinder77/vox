#!/bin/bash

set -euo pipefail

TERRAFORM_DIR="${TERRAFORM_DIR:-terraform/environments/dev}"
AWS_REGION="${AWS_REGION:-ap-south-1}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse HEAD)}"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

need aws
need helm
need helmfile
need kubectl
need terraform

terraform -chdir="${TERRAFORM_DIR}" init

if [[ "${SKIP_TERRAFORM_APPLY:-false}" != "true" ]]; then
  terraform -chdir="${TERRAFORM_DIR}" apply -auto-approve
fi

export BACKEND_IMAGE_REPOSITORY="${BACKEND_IMAGE_REPOSITORY:-$(terraform -chdir="${TERRAFORM_DIR}" output -raw backend_repository_url)}"
export FRONTEND_IMAGE_REPOSITORY="${FRONTEND_IMAGE_REPOSITORY:-$(terraform -chdir="${TERRAFORM_DIR}" output -raw frontend_repository_url)}"
export IMAGE_TAG

CLUSTER_NAME="$(terraform -chdir="${TERRAFORM_DIR}" output -raw cluster_name)"
aws eks update-kubeconfig --name "${CLUSTER_NAME}" --region "${AWS_REGION}"

./scripts/bootstrap-eks.sh

helmfile -l tier=platform apply

kubectl apply -f platform/external-secrets/cluster-secret-store.yaml
kubectl apply -f platform/gateway-api/gatewayclass.yaml
kubectl apply -f platform/gateway-api/gateway.yaml

helmfile apply
