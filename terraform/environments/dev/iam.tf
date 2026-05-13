resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
  client_id_list = [
    "sts.amazonaws.com"
  ]
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1"
  ]
  tags = var.tags
}

data "aws_iam_policy_document" "github_actions_assume" {
  statement {
    effect = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values = ["sts.amazonaws.com"]
    }
    condition {
      test = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = ["repo:${var.github_org}/${var.github_repo}:ref:refs/heads/main"]
    }
  }
}

resource "aws_iam_role" "github_actions" {
  name = "${local.name_prefix}-github-actions-role"
  assume_role_policy = data.aws_iam_policy_document.github_actions_assume.json
  tags = var.tags
}

resource "aws_iam_policy" "github_actions" {
  name = "${local.name_prefix}-github-actions-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [

      # ECR Login + Push
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:CompleteLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:InitiateLayerUpload",
          "ecr:PutImage",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      },

      # Read cluster metadata
      {
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "github_admin" {
  role = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.github_actions.arn
}

# ─────────────────────────────────────────────────────────────
# Pod Identity
# ─────────────────────────────────────────────────────────────
data "aws_iam_policy_document" "pod_identity_assume" {
  statement {
    effect = "Allow"
    actions = [
      "sts:AssumeRole",
      "sts:TagSession"
    ]
    principals {
      type = "Service"
      identifiers = ["pods.eks.amazonaws.com"]
    }
  }
}

# ─────────────────────────────────────────────────────────────
# External DNS Role
# ─────────────────────────────────────────────────────────────

resource "aws_iam_role" "external_dns" {
  name = "${local.name_prefix}-external-dns-role"
  assume_role_policy = data.aws_iam_policy_document.pod_identity_assume.json
  tags = var.tags
}

# ─────────────────────────────────────────────────────────────
# External DNS Policy
# ─────────────────────────────────────────────────────────────
resource "aws_iam_policy" "external_dns" {
  name = "${local.name_prefix}-external-dns-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["route53:ChangeResourceRecordSets"]
        Resource = [aws_route53_zone.main.arn]
      },
      {
        Effect = "Allow"
        Action = ["route53:ListHostedZones", "route53:ListResourceRecordSets"]
        Resource = ["*"]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "external_dns" {
  role = aws_iam_role.external_dns.name
  policy_arn = aws_iam_policy.external_dns.arn
}

resource "aws_eks_pod_identity_association" "external_dns" {
  cluster_name    = var.eks_cluster_name
  namespace       = "external-dns"
  service_account = "external-dns"
  role_arn = aws_iam_role.external_dns.arn
}

# ─────────────────────────────────────────────────────────────
# ALB CONTROLLER
# ─────────────────────────────────────────────────────────────
resource "aws_iam_role" "alb_controller" {
  name = "${local.name_prefix}-alb-controller-role"
  assume_role_policy = data.aws_iam_policy_document.pod_identity_assume.json
  tags = var.tags
}

resource "aws_iam_policy" "alb_controller" {
  name = "${local.name_prefix}-alb-controller-policy"
  policy = file("${path.module}/../../policies/alb-controller-policy.json")
}

resource "aws_iam_role_policy_attachment" "alb_controller" {
  role = aws_iam_role.alb_controller.name
  policy_arn = aws_iam_policy.alb_controller.arn
}

resource "aws_eks_pod_identity_association" "alb_controller" {
  cluster_name    = var.eks_cluster_name
  namespace       = "kube-system"
  service_account = "aws-load-balancer-controller"

  role_arn = aws_iam_role.alb_controller.arn
}

# ─────────────────────────────────────────────────────────────
# EXTERNAL SECRETS (ESO) Role
# ─────────────────────────────────────────────────────────────

resource "aws_iam_role" "external_secrets" {
  name = "${local.name_prefix}-external-secrets-role"
  assume_role_policy = data.aws_iam_policy_document.pod_identity_assume.json
  tags = var.tags
}


resource "aws_iam_policy" "external_secrets" {
  name = "${local.name_prefix}-external-secrets-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetResourcePolicy",
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:ListSecretVersionIds"
        ]
        Resource = [
          "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${local.name_prefix}-*",
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath",
          "ssm:DescribeParameters"
        ]
        Resource = [
          "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${local.name_prefix}/*",
        ]
      },

    ]
  })
}

resource "aws_iam_role_policy_attachment" "external_secrets" {
  role       = aws_iam_role.external_secrets.name
  policy_arn = aws_iam_policy.external_secrets.arn
}

resource "aws_eks_pod_identity_association" "external_secrets" {
  cluster_name    = var.eks_cluster_name
  namespace       = "external-secrets"
  service_account = "external-secrets"

  role_arn = aws_iam_role.external_secrets.arn
}