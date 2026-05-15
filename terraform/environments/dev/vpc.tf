
module "vpc" {

  source  = "terraform-aws-modules/vpc/aws"
  version = "6.6.1"

  name = "voxchat-vpc"

  cidr = var.vpc_cidr
  azs  = var.azs

  private_subnets  = var.private_subnet_cidrs
  public_subnets   = var.public_subnet_cidrs
  database_subnets = var.database_subnet_cidrs

  enable_nat_gateway = true
  single_nat_gateway = true

  enable_dns_hostnames = true
  enable_dns_support   = true

  public_subnet_tags = {
    "kubernetes.io/role/elb"                        = "1"
    "kubernetes.io/cluster/${var.eks_cluster_name}" = "shared"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"               = "1"
    "kubernetes.io/cluster/${var.eks_cluster_name}" = "shared"
  }

  tags = local.tags
}