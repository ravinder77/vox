#!/bin/bash

set -euo pipefail

AWS_REGION="${AWS_REGION:-ap-south-1}"
CLUSTER_NAME="${CLUSTER_NAME:-$(terraform -chdir=terraform/environments/dev output -raw cluster_name)}"

aws eks update-kubeconfig --name "${CLUSTER_NAME}" --region "${AWS_REGION}"
