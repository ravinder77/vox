# voxchat

## Kubernetes Platform Bootstrap

The platform now uses AWS Load Balancer Controller Gateway API support, External Secrets Operator, External DNS, and the app charts under `helm/charts`.

Install Gateway API CRDs, AWS Load Balancer Controller Gateway CRDs, the ALB controller, and the shared Gateway:

```bash
./scripts/bootstrap-eks.sh
```

Install the Helm-managed platform add-ons and app charts. The app image repositories are required because the charts fail fast instead of rendering an invalid `:tag` image:

```bash
export IMAGE_TAG="<image-tag>"

./scripts/deploy.sh
```

The deploy script reads the backend/frontend ECR repository URLs from Terraform outputs, applies platform resources first, then deploys the app charts. Use `SKIP_TERRAFORM_APPLY=true ./scripts/deploy.sh` when the infrastructure has already been applied.

GitHub deployment uses `.github/workflows/deploy.yaml`. Configure these repository secrets before using CI/CD:

- `AWS_ACCOUNT_ID`
- `AWS_ROLE_ARN`
- `SONAR_TOKEN`
- `SONAR_HOST_URL`

Optional repository variables:

- `VITE_API_URL`, defaults to `https://api.voxchat.in/api`
- `VITE_CSRF_COOKIE_NAME`, defaults to `vox_csrf`

You can also deploy the app charts directly:

```bash
export BACKEND_IMAGE_REPOSITORY="$(terraform -chdir=terraform/environments/dev output -raw backend_repository_url)"
export FRONTEND_IMAGE_REPOSITORY="$(terraform -chdir=terraform/environments/dev output -raw frontend_repository_url)"
export IMAGE_TAG="<image-tag>"

helm upgrade --install voxchat-backend helm/charts/backend \
  --namespace voxchat --create-namespace \
  --values helm/values/dev/backend.yaml \
  --set image.repository="${BACKEND_IMAGE_REPOSITORY}" \
  --set image.tag="${IMAGE_TAG}"

helm upgrade --install voxchat-frontend helm/charts/frontend \
  --namespace voxchat --create-namespace \
  --values helm/values/dev/frontend.yaml \
  --set image.repository="${FRONTEND_IMAGE_REPOSITORY}" \
  --set image.tag="${IMAGE_TAG}"
```
