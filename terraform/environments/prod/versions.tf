terraform {
  required_version = "1.15.3"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">=6.38.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "3.1.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "4.2.1"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "voxchat"
      Environment = var.environment
      ManagedBy   = "terraform"
      Repository  = "voxchat"
    }
  }
}