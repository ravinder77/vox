#!/bin/bash

set -euo pipefail

TERRAFORM_DIR="${TERRAFORM_DIR:-terraform/environments/dev}"

if command -v helmfile >/dev/null 2>&1; then
  helmfile -l tier=app destroy || true
  helmfile -l tier=platform destroy || true
fi

terraform -chdir="${TERRAFORM_DIR}" destroy
