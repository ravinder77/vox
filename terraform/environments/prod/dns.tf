

# -------------------------------------------------------
# Hosted Zone
# -------------------------------------------------------
resource "aws_route53_zone" "main" {
  name = var.domain_name
  tags = var.tags
}

resource "aws_acm_certificate" "voxchat" {
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]

  validation_method = "DNS"
  lifecycle { create_before_destroy = true }
}

# Auto-create DNS validation records in Route53
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.voxchat.domain_validation_options :
    dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

# Wait for ACM to validate — outputs the final cert ARN
resource "aws_acm_certificate_validation" "voxchat" {
  certificate_arn = aws_acm_certificate.voxchat.arn
  validation_record_fqdns = [
    for r in aws_route53_record.cert_validation : r.fqdn
  ]
  timeouts { create = "10m" }
}