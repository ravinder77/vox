
output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "vpc_id" {
  value = module.vpc.vpc_id
}

output "private_subnets" {
  value = module.vpc.private_subnets
}


output "rds_endpoint" {
  value = module.db.db_instance_endpoint
}

output "route53_zone_id" {
  value = aws_route53_zone.main.zone_id
}

output "route53_name_servers" {
  description = "Name servers that must be configured at the domain registrar for ACM DNS validation to work."
  value       = aws_route53_zone.main.name_servers
}

output "repository_urls" {
  value = {
    for k, v in aws_ecr_repository.this :
    k => v.repository_url
  }
}

output "backend_repository_url" {
  value = aws_ecr_repository.this["backend"].repository_url
}

output "frontend_repository_url" {
  value = aws_ecr_repository.this["frontend"].repository_url
}

output "backend_secret_name" {
  value = aws_secretsmanager_secret.backend.name
}

output "acm_certificate_arn" {
  description = "ACM certificate ARN for voxchat.in"
  value       = aws_acm_certificate_validation.vox.certificate_arn
}

output "alb_controller_role_arn" {
  value = aws_iam_role.alb_controller.arn
}
