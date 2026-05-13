
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

output "repository_urls" {
  value = {
    for k, v in aws_ecr_repository.this :
    k => v.repository_url
  }
}

output "acm_certificate_arn" {
  description = "ACM certificate ARN for voxchat.in"
  value       = aws_acm_certificate_validation.vox.certificate_arn
}