# Staging Terraform Environment

This environment is intentionally scaffolded but not deployable yet.

To enable it, copy the `dev` Terraform files into this directory, change the S3
backend key to `staging/terraform.tfstate`, and provide a staging-specific
`terraform.tfvars` based on `../dev/terraform.tfvars.example`.

Do not reuse the dev VPC CIDR, EKS cluster name, RDS identifier, or Route 53
hostnames for staging.
