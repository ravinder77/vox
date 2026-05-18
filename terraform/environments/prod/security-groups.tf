
#--------------------
# ALB SECURITY GROUP
#--------------------

resource "aws_security_group" "alb" {

  name        = "vox-alb-sg"
  description = "ALB Security Group"

  vpc_id = module.vpc.vpc_id

  tags = local.tags
}


resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  security_group_id = aws_security_group.alb.id
  description       = "Allot HTTP"
  from_port         = 80
  to_port           = 80

  ip_protocol = "tcp"
  cidr_ipv4   = "0.0.0.0/0"
}

resource "aws_vpc_security_group_ingress_rule" "alb_https" {
  security_group_id = aws_security_group.alb.id
  description       = "Allow HTTPS"

  from_port   = 443
  to_port     = 443
  ip_protocol = "tcp"

  cidr_ipv4 = "0.0.0.0/0"
}


resource "aws_vpc_security_group_egress_rule" "alb_egress" {

  security_group_id = aws_security_group.alb.id

  ip_protocol = "-1"

  cidr_ipv4 = "0.0.0.0/0"
}

# ------------------------
# EKS NODE SECURITY GROUP
# ------------------------

resource "aws_security_group" "eks_nodes" {
  name        = "vox-eks-nodes-sg"
  description = "EKS worker node"

  vpc_id = module.vpc.vpc_id

  tags = local.tags
}

resource "aws_vpc_security_group_ingress_rule" "alb_to_nodes" {
  security_group_id = aws_security_group.eks_nodes.id
  description       = "ALB to EKS nodes"

  from_port = 30000
  to_port   = 32767

  ip_protocol = "tcp"

  referenced_security_group_id = aws_security_group.alb.id

}

resource "aws_vpc_security_group_egress_rule" "eks_nodes_egress" {
  security_group_id = aws_security_group.eks_nodes.id

  ip_protocol = "-1"
  cidr_ipv4   = "0.0.0.0/0"
}

# ------------------------
# RDS SECURITY GROUP
# ------------------------

locals {
  rds_client_security_group_ids = {
    local   = aws_security_group.eks_nodes.id
    node    = module.eks.node_security_group_id
    cluster = module.eks.cluster_primary_security_group_id
  }
}

resource "aws_security_group" "rds" {

  name        = "vox-rds-sg"
  description = "RDS security Group"
  vpc_id      = module.vpc.vpc_id

  tags = local.tags
}

resource "aws_vpc_security_group_ingress_rule" "eks_to_rds" {
  for_each = local.rds_client_security_group_ids

  security_group_id = aws_security_group.rds.id
  description       = "PostgreSQL from EKS"

  from_port = 5432
  to_port   = 5432

  ip_protocol                  = "tcp"
  referenced_security_group_id = each.value
}

resource "aws_vpc_security_group_egress_rule" "rds_egress" {

  security_group_id = aws_security_group.rds.id
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}
