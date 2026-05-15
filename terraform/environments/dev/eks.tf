
module "eks" {

  source  = "terraform-aws-modules/eks/aws"
  version = "~> 21.0"

  name               = var.eks_cluster_name
  kubernetes_version = var.kubernetes_version

  endpoint_public_access                   = true
  enable_cluster_creator_admin_permissions = true

  authentication_mode = "API_AND_CONFIG_MAP"

  # Creates Auto mode
  compute_config = {
    enabled    = true
    node_pools = ["general-purpose"]
  }

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      before_compute = true
      most_recent    = true
    }
    eks-pod-identity-agent = {
      before_compute = true
      most_recent    = true
    }
  }
  tags = local.tags
}