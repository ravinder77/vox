
locals {
  name_prefix = "${var.project}-${var.environment}"

  tags = {
    Project     = "voxchat"
    Environment = var.environment
    Terraform   = "true"
  }
}

data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" { state = "available" }