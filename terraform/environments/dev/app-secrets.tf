data "aws_secretsmanager_secret_version" "rds_master" {
  secret_id = module.db.db_instance_master_user_secret_arn
}

resource "random_password" "jwt_secret" {
  length  = 48
  special = true
}

resource "aws_secretsmanager_secret" "backend" {
  name        = "${var.project}/${var.environment}/backend"
  description = "Runtime configuration for the ${var.environment} backend"
  tags        = local.tags
}

resource "aws_secretsmanager_secret_version" "backend" {
  secret_id = aws_secretsmanager_secret.backend.id

  secret_string = jsonencode({
    DATABASE_URL     = "postgresql://${jsondecode(data.aws_secretsmanager_secret_version.rds_master.secret_string)["username"]}:${urlencode(jsondecode(data.aws_secretsmanager_secret_version.rds_master.secret_string)["password"])}@${module.db.db_instance_address}:${module.db.db_instance_port}/${var.db_name}"
    JWT_SECRET       = random_password.jwt_secret.result
    JWT_EXPIRES_IN   = var.jwt_expires_in
    COOKIE_NAME      = var.cookie_name
    CSRF_COOKIE_NAME = var.csrf_cookie_name
    CLIENT_ORIGIN    = "https://${var.domain_name}"
  })
}
