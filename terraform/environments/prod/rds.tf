


module "db" {

  source  = "terraform-aws-modules/rds/aws"
  version = "7.2.0"

  identifier     = "voxchat"
  engine         = "postgres"
  engine_version = var.db_engine_version
  family         = "postgres17"

  major_engine_version = "17"
  instance_class       = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage

  storage_type      = "gp3"
  storage_encrypted = true

  db_name                     = var.db_name
  username                    = var.db_username
  manage_master_user_password = true

  port                    = 5432
  publicly_accessible     = false
  multi_az                = var.db_multi_az
  deletion_protection     = true
  backup_retention_period = 7
  create_db_subnet_group  = true
  subnet_ids              = module.vpc.database_subnets

  vpc_security_group_ids = [
    aws_security_group.rds.id
  ]

  performance_insights_enabled = true
  enabled_cloudwatch_logs_exports = [
    "postgresql"
  ]

  skip_final_snapshot = true
  tags                = local.tags
}