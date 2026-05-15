#!/bin/bash

set -euo pipefail

AWS_REGION="${AWS_REGION:-ap-south-1}"
CLUSTER_NAME="${CLUSTER_NAME:-voxchat-eks}"

echo "==> 1. Updating kubeconfig"
aws eks update-kubeconfig --name "${CLUSTER_NAME}" --region "${AWS_REGION}"

echo "==> 2. Installing Gateway API CRDs"
bash scripts/install-crds.sh

echo "==> 3. Ensuring namespaces"
kubectl create namespace voxchat --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace external-secrets --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace external-dns --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

echo "==> 4. Installing ALB controller"
helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --version 1.14.1 \
  -f helm/values/gateway.yaml \
  --set clusterName="${CLUSTER_NAME}" \
  --wait

echo "==> 5. Applying GatewayClass"
kubectl apply -f platform/gateway-api/gatewayclass.yaml


echo "==> 6. Applying Gateway"
kubectl apply -f platform/gateway-api/gateway.yaml


echo "==> ALB address:"
kubectl get gateway voxchat-gateway -n voxchat \
  -o jsonpath='{.status.addresses[0].value}'
