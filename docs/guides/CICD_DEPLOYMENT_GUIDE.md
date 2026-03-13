# Guía de CI/CD y Despliegue

## Pipeline CI/CD Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    Developer Push                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Trigger    │
                    │  GitHub     │
                    │  Actions    │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
    ┌────────┐        ┌────────┐        ┌────────┐
    │  Build │        │  Test  │        │ Lint   │
    └────┬───┘        └────┬───┘        └────┬───┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼──────┐
                    │   SonarQube │
                    │   Analysis  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Security   │
                    │   Scan      │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Docker    │
                    │   Build     │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Push to   │
                    │  Registry   │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
    ┌────────┐        ┌────────┐        ┌────────┐
    │   Dev  │        │Staging │        │  Prod  │
    │Deploy  │        │Deploy  │        │Deploy  │
    └────────┘        └────────┘        └────────┘
```

## 1. GitHub Actions Workflow

### Archivo: `.github/workflows/ci-cd.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # Job 1: Build y Test
  build-and-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run linter
        run: pnpm lint
      
      - name: Run tests
        run: pnpm test
      
      - name: Build
        run: pnpm build
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  # Job 2: Security Scan
  security-scan:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Trivy scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  # Job 3: Docker Build
  docker-build:
    needs: [build-and-test, security-scan]
    runs-on: ubuntu-latest
    
    permissions:
      contents: read
      packages: write
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # Job 4: Deploy a Dev
  deploy-dev:
    needs: docker-build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Dev
        run: |
          kubectl set image deployment/enterprise-platform \
            frontend=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            -n development
      
      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/enterprise-platform \
            -n development --timeout=5m

  # Job 5: Deploy a Staging
  deploy-staging:
    needs: docker-build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Staging
        run: |
          kubectl set image deployment/enterprise-platform \
            frontend=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            -n staging
      
      - name: Run smoke tests
        run: |
          ./scripts/smoke-tests.sh https://staging.company.com

  # Job 6: Deploy a Producción (Manual)
  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://app.company.com
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Production
        run: |
          kubectl set image deployment/enterprise-platform \
            frontend=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            -n production
      
      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/enterprise-platform \
            -n production --timeout=10m
      
      - name: Notify Slack
        uses: slackapi/slack-github-action@v1.24.0
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "✅ Deployment to Production Successful",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Production Deployment*\nCommit: ${{ github.sha }}\nAuthor: ${{ github.actor }}"
                  }
                }
              ]
            }
```

## 2. Estrategia de Despliegue

### Blue-Green Deployment

```bash
#!/bin/bash

# Desplegar versión nueva (Green)
kubectl apply -f deployment-green.yaml

# Esperar a que esté lista
kubectl wait --for=condition=ready pod \
  -l version=green \
  --timeout=300s

# Cambiar tráfico a Green
kubectl patch service enterprise-platform \
  -p '{"spec":{"selector":{"version":"green"}}}'

# Mantener Blue como rollback
# Si hay problemas: kubectl patch service ... version=blue
```

### Canary Deployment

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: enterprise-platform
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: enterprise-platform
  progressDeadlineSeconds: 300
  service:
    port: 80
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
    - name: request-duration
      thresholdRange:
        max: 500
      interval: 1m
  skipAnalysis: false
  webhooks:
  - name: acceptance-test
    url: http://flagger-loadtester/
    timeout: 30s
    metadata:
      type: smoke
      cmd: "curl -sd 'test' http://enterprise-platform-canary:80/health"
```

## 3. Rollback Automático

```bash
#!/bin/bash

# Detectar problemas
ERROR_RATE=$(curl -s http://prometheus:9090/api/v1/query \
  --data-urlencode 'query=rate(http_requests_total{status="500"}[5m])' \
  | jq '.data.result[0].value[1]' | tr -d '"')

if (( $(echo "$ERROR_RATE > 0.05" | bc -l) )); then
  echo "Error rate too high: $ERROR_RATE"
  
  # Rollback
  kubectl rollout undo deployment/enterprise-platform -n production
  kubectl rollout status deployment/enterprise-platform -n production
  
  # Notificar
  echo "Rollback completado" | mail -s "Rollback en Producción" ops@company.com
fi
```

## 4. Versionado Semántico

```
v1.2.3
│ │ │
│ │ └─ Patch (bug fixes)
│ └─── Minor (features)
└───── Major (breaking changes)

Ejemplos:
v1.0.0 - Release inicial
v1.1.0 - Agregar nueva funcionalidad
v1.1.1 - Bug fix
v2.0.0 - Breaking changes
```

## 5. Proceso de Release

### Pre-Release Checklist

- [ ] Todos los tests pasando
- [ ] Code review completado
- [ ] Security scan sin vulnerabilidades críticas
- [ ] Documentación actualizada
- [ ] CHANGELOG actualizado
- [ ] Performance tests pasando
- [ ] Staging deployment exitoso

### Release Steps

```bash
# 1. Crear tag
git tag -a v1.2.3 -m "Release v1.2.3"

# 2. Push tag
git push origin v1.2.3

# 3. GitHub Actions dispara workflow de release
# 4. Docker image se construye y se pushea
# 5. Kubernetes deployment se actualiza
# 6. Smoke tests se ejecutan
# 7. Notificación a Slack
```

## 6. Monitoreo Post-Deployment

### Métricas a Monitorear

```
- Error rate
- Latency P95, P99
- CPU usage
- Memory usage
- Database connections
- Cache hit rate
- Request throughput
```

### Alertas

```yaml
- name: HighErrorRatePostDeploy
  condition: rate(http_requests_total{status="500"}[5m]) > 0.01
  for: 2m
  action: notify_oncall

- name: HighLatencyPostDeploy
  condition: histogram_quantile(0.99, http_request_duration_seconds) > 1
  for: 5m
  action: notify_oncall
```

## 7. Rollback Plan

### Escenarios de Rollback

| Escenario | Acción | Tiempo |
|-----------|--------|--------|
| Error rate > 5% | Rollback automático | < 2 min |
| Latency P99 > 2s | Rollback automático | < 2 min |
| Database migration error | Rollback manual | < 5 min |
| Security issue | Rollback manual | < 5 min |

### Comando de Rollback

```bash
# Rollback a versión anterior
kubectl rollout undo deployment/enterprise-platform -n production

# Rollback a versión específica
kubectl rollout undo deployment/enterprise-platform \
  --to-revision=5 -n production

# Verificar estado
kubectl rollout status deployment/enterprise-platform -n production
```

## 8. Mejores Prácticas

1. **Automatizar todo**: Build, test, deploy
2. **Fallar rápido**: Detectar problemas temprano
3. **Rollback rápido**: Poder revertir en minutos
4. **Monitorear**: Alertas proactivas
5. **Documentar**: Runbooks para incidentes
6. **Comunicar**: Notificaciones en Slack
7. **Aprender**: Postmortems después de incidentes

