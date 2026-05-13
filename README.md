# voxchat 
# voxchat

# LBC controller

LBC_ROLE=$(terraform -chdir=terraform/environments/dev output -raw lbc_irsa_role_arn)
VPC_ID=$(terraform -chdir=terraform/environments/dev output -raw vpc_id)

helm repo add eks https://aws.github.io/eks-charts && helm repo update

helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
--namespace kube-system \
--set clusterName=vox-dev \
--set serviceAccount.create=true \
--set serviceAccount.name=aws-load-balancer-controller \
--set "serviceAccount.annotations.eks\.amazonaws\.com/role-arn=${LBC_ROLE}" \
--set region=ap-south-1 \
--set vpcId=${VPC_ID} \
--wait

kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller

# Gateway Api

ACM_ARN=$(terraform -chdir=terraform/environments/dev output -raw acm_certificate_arn)

kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.1.0/standard-install.yaml
kubectl create namespace vox --dry-run=client -o yaml | kubectl apply -f -

helm upgrade --install vox-gateway helm/gateway/ \
--namespace vox \
--set acmCertificateArn=${ACM_ARN} \
--wait


# External DNS

DNS_ROLE=$(terraform -chdir=terraform/environments/dev output -raw external_dns_irsa_role_arn)

helm dependency update helm/external-dns/
helm upgrade --install external-dns helm/external-dns/ \
--namespace external-dns --create-namespace \
--values helm/external-dns/values.yaml \
--set "external-dns.serviceAccount.annotations.eks\.amazonaws\.com/role-arn=${DNS_ROLE}" \
--wait