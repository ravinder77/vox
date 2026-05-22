#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

AWS_REGION="${AWS_REGION:-ap-south-1}"
CLUSTER_NAME="${CLUSTER_NAME:-voxchat-eks}"
TERRAFORM_DIR="${TERRAFORM_DIR:-terraform/environments/prod}"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

need aws
need helm
need kubectl

echo "==> 1. Updating kubeconfig"
aws eks update-kubeconfig --name "${CLUSTER_NAME}" --region "${AWS_REGION}"

echo "==> 2. Installing Gateway API CRDs"
bash scripts/install-crds.sh

echo "==> 3. Ensuring namespaces"
kubectl create namespace voxchat --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace external-secrets --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace external-dns --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
kubectl label namespace voxchat voxchat.in/gateway-access=true --overwrite
kubectl label namespace monitoring voxchat.in/gateway-access=true --overwrite

echo "==> 4. Installing ALB controller"
helm repo add eks https://aws.github.io/eks-charts
helm repo update

if [[ -z "${VPC_ID:-}" ]] && command -v terraform >/dev/null 2>&1; then
  VPC_ID="$(terraform -chdir="${TERRAFORM_DIR}" output -raw vpc_id 2>/dev/null || true)"
fi

helm_args=(
  upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller
  -n kube-system
  --version 1.14.1
  -f helm/values/gateway.yaml
  --set clusterName="${CLUSTER_NAME}"
  --wait
)

if [[ -n "${VPC_ID:-}" ]]; then
  helm_args+=(--set vpcId="${VPC_ID}")
fi

helm "${helm_args[@]}"

echo "==> EKS bootstrap complete"
