variable "aws_region" {
  type = string
}

variable "project" {
  type    = string
  default = "voxchat"
}

variable "environment" {
  type = string
}

variable "domain_name" {
  type    = string
  default = "voxchat.in"
}

variable "jwt_expires_in" {
  type    = string
  default = "7d"
}

variable "cookie_name" {
  type    = string
  default = "vox_token"
}

variable "csrf_cookie_name" {
  type    = string
  default = "vox_csrf"
}

variable "app_namespace" {
  description = "Kubernetes namespace where the app runs"
  type        = string
  default     = "voxchat"
}

variable "github_org" {
  type = string
}

variable "github_repo" {
  type = string
}


# ─────────────────────────────────────────────────────────────
# VPC
# ─────────────────────────────────────────────────────────────

variable "vpc_cidr" {
  type = string
}

variable "azs" {
  type = list(string)
}

variable "private_subnet_cidrs" {
  type = list(string)
}

variable "public_subnet_cidrs" {
  type = list(string)
}

variable "database_subnet_cidrs" {
  type = list(string)
}


# ─────────────────────────────────────────────────────────────
# EKS
# ─────────────────────────────────────────────────────────────

variable "eks_cluster_name" {
  type = string
}

variable "kubernetes_version" {}


# ─────────────────────────────────────────────────────────────
# RDS
# ─────────────────────────────────────────────────────────────

variable "db_name" {
  type = string
}

variable "db_username" {
  type = string
}

variable "db_instance_class" {
  type = string
}

variable "db_allocated_storage" {
  type = number
}

variable "db_max_allocated_storage" {
  type = number
}

variable "db_engine_version" {
  type = string
}

variable "db_multi_az" {
  type = bool
}


# ─────────────────────────────────────────────────────────────
# ECR
# ─────────────────────────────────────────────────────────────

variable "image_retention_count" {
  type = number
}

# ─────────────────────────────────────────────────────────────
# Tags
# ─────────────────────────────────────────────────────────────

variable "tags" {
  type = map(string)
}
