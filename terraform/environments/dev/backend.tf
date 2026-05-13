
terraform {
  backend "s3" {
    bucket       = "voxchat-tfstate"
    key          = "dev/terraform.tfstate"
    region       = "ap-south-1"
    encrypt      = true
    use_lockfile = true # Native S3 locking — no DynamoDB required
  }
}

