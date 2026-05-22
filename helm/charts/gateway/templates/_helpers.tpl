{{/*
Common labels for gateway chart resources.
*/}}
{{- define "gateway.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name | quote }}
app.kubernetes.io/instance: {{ .Release.Name | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service | quote }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | quote }}
{{- end }}

{{/*
CSV hostnames for ExternalDNS. Prefer the explicit DNS records list because
wildcard Gateway listeners do not imply every desired DNS record.
*/}}
{{- define "gateway.externalDnsHostnames" -}}
{{- $hostnames := list -}}
{{- if .Values.gateway.externalDns.hostnames -}}
  {{- $hostnames = .Values.gateway.externalDns.hostnames -}}
{{- else if .Values.gateway.externalDnsHostnames -}}
  {{- $hostnames = splitList "," .Values.gateway.externalDnsHostnames -}}
{{- else -}}
  {{- range .Values.gateway.listeners -}}
    {{- with .hostname -}}
      {{- $hostnames = append $hostnames . -}}
    {{- end -}}
  {{- end -}}
{{- end -}}
{{- join "," $hostnames -}}
{{- end }}
