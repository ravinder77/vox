#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

TERRAFORM_DIR="${TERRAFORM_DIR:-terraform/environments/dev}"
AWS_REGION="${AWS_REGION:-ap-south-1}"

if command -v aws >/dev/null 2>&1 && command -v helm >/dev/null 2>&1 && command -v kubectl >/dev/null 2>&1; then
  CLUSTER_NAME="$(terraform -chdir="${TERRAFORM_DIR}" output -raw cluster_name 2>/dev/null || true)"

  if [[ -n "${CLUSTER_NAME}" ]]; then
    aws eks update-kubeconfig --name "${CLUSTER_NAME}" --region "${AWS_REGION}" || true
    helm uninstall voxchat-frontend -n voxchat || true
    helm uninstall voxchat-backend -n voxchat || true
    helm uninstall voxchat-gateway -n voxchat || true
    helm uninstall external-dns -n external-dns || true
    helm uninstall external-secrets -n external-secrets || true
    helm uninstall voxchat-monitoring -n monitoring || true
    helm uninstall aws-load-balancer-controller -n kube-system || true
    kubectl delete clustersecretstore aws-secrets-store --ignore-not-found || true
  fi
fi

terraform -chdir="${TERRAFORM_DIR}" destroy
