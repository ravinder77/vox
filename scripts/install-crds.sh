#!/bin/bash

set -e

GATEWAY_API_VERSION="v1.5.1"

echo "Installing Gateway API CRDs..."
kubectl apply --server-side=true -f https://github.com/kubernetes-sigs/gateway-api/releases/download/${GATEWAY_API_VERSION}/standard-install.yaml

echo "Installing AWS Load Balancer Controller Gateway API CRDs..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.14.1/config/crd/gateway/gateway-crds.yaml

echo "Waiting for CRDs to be established..."
kubectl wait --for=condition=established \
  crd/gateways.gateway.networking.k8s.io \
  crd/httproutes.gateway.networking.k8s.io \
  crd/grpcroutes.gateway.networking.k8s.io \
  crd/loadbalancerconfigurations.gateway.k8s.aws \
  crd/targetgroupconfigurations.gateway.k8s.aws \
  crd/listenerruleconfigurations.gateway.k8s.aws \
  --timeout=60s

echo "Gateway API CRDs installed successfully"
