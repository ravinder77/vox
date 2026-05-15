#!/bin/bash

set -euo pipefail

AWS_REGION="${AWS_REGION:-ap-south-1}"
TERRAFORM_DIR="${TERRAFORM_DIR:-terraform/environments/dev}"
CLUSTER_NAME="${CLUSTER_NAME:-$(terraform -chdir="${TERRAFORM_DIR}" output -raw cluster_name)}"

aws eks update-kubeconfig --name "${CLUSTER_NAME}" --region "${AWS_REGION}"
