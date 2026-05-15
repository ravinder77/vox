locals {
  repositories = {
    "backend"  = { description = "Voxchat Node.js API backend" }
    "frontend" = { description = "Voxchat React frontend" }
  }
}

# ---------------------------------------------------
# KMS Key for ECR Encryption
# ---------------------------------------------------
resource "aws_kms_key" "ecr" {
  description             = "KMS key for ECR image encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true


  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      }
    ]
  })


  tags = {
    Name = "ecr-kms-key"
  }
}

resource "aws_kms_alias" "ecr" {
  name          = "alias/ecr-key"
  target_key_id = aws_kms_key.ecr.key_id
}

# ---------------------------------------------------
# ECR Repositories
# ---------------------------------------------------
resource "aws_ecr_repository" "this" {
  for_each = local.repositories

  name                 = "${var.project}/${each.key}"
  image_tag_mutability = "IMMUTABLE" # tags cannot be overwritten — enforces digest-based deploys
  force_delete         = false

  image_scanning_configuration {
    scan_on_push = true # automatic vulnerability scan on every push
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.ecr.arn
  }

  tags = merge(var.tags, {
    Name        = each.key
    Description = each.value.description
  })
}

# ── Lifecycle Policy — keep last N images, expire untagged after 7 days ───────
resource "aws_ecr_lifecycle_policy" "this" {
  for_each   = aws_ecr_repository.this
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Remove untagged images after 10 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 10
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Keep last ${var.image_retention_count} tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "sha-", "main-", "release-"]
          countType     = "imageCountMoreThan"
          countNumber   = var.image_retention_count
        }
        action = { type = "expire" }
      }
    ]
  })
}