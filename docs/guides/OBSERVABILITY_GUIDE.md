# Guía de Observabilidad Empresarial

## Introducción

La observabilidad es fundamental para operar plataformas de misión crítica. Esta guía describe cómo implementar un stack completo de observabilidad con Prometheus, Grafana y ELK Stack.

## Stack de Observabilidad

```
┌─────────────────────────────────────────────────────┐
│           Aplicaciones Empresariales                 │
│  (Frontend, Backend, Microservicios, Pipelines)     │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
    Prometheus  ELK Stack  Jaeger
    (Métricas)  (Logs)    (Trazas)
        │          │          │
        └──────────┼──────────┘
                   │
        ┌──────────▼──────────┐
        │      Grafana        │
        │   (Visualización)   │
        └─────────────────────┘
```

## 1. Prometheus - Recopilación de Métricas

### Instalación

```bash
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v /path/to/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

### Configuración (prometheus.yml)

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'frontend'
    static_configs:
      - targets: ['localhost:3000']

  - job_name: 'backend'
    static_configs:
      - targets: ['localhost:3001']

  - job_name: 'erp-service'
    static_configs:
      - targets: ['localhost:8001']

  - job_name: 'pos-service'
    static_configs:
      - targets: ['localhost:8002']

  - job_name: 'kubernetes'
    kubernetes_sd_configs:
      - role: node
```

### Métricas Clave

```
# Latencia de requests
http_request_duration_seconds{service="backend", endpoint="/api/v1/users"}

# Tasa de errores
http_requests_total{status="500", service="backend"}

# Uso de CPU
container_cpu_usage_seconds_total

# Uso de memoria
container_memory_usage_bytes

# Conexiones a BD
mysql_global_status_threads_connected
```

## 2. Grafana - Visualización

### Instalación

```bash
docker run -d \
  --name grafana \
  -p 3100:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  grafana/grafana
```

### Dashboards Recomendados

1. **System Overview**
   - CPU, Memoria, Disco
   - Procesos activos
   - Uptime

2. **Application Performance**
   - Latencia de requests
   - Tasa de errores
   - Throughput

3. **Database Performance**
   - Queries lentas
   - Conexiones activas
   - Replicación lag

4. **Business Metrics**
   - Transacciones por segundo
   - Ingresos
   - Clientes activos

### Alertas

```yaml
alert:
  - name: HighErrorRate
    condition: rate(http_requests_total{status="500"}[5m]) > 0.05
    for: 5m
    annotations:
      summary: "Tasa de errores alta"

  - name: HighLatency
    condition: histogram_quantile(0.95, http_request_duration_seconds) > 1
    for: 10m
    annotations:
      summary: "Latencia alta detectada"

  - name: LowDiskSpace
    condition: node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.1
    for: 5m
    annotations:
      summary: "Espacio en disco bajo"
```

## 3. ELK Stack - Logging

### Elasticsearch

```bash
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -e discovery.type=single-node \
  docker.elastic.co/elasticsearch/elasticsearch:8.0.0
```

### Kibana

```bash
docker run -d \
  --name kibana \
  -p 5601:5601 \
  -e ELASTICSEARCH_HOSTS=http://elasticsearch:9200 \
  docker.elastic.co/kibana/kibana:8.0.0
```

### Logging desde Aplicaciones

```python
import logging
import json

logger = logging.getLogger(__name__)

# Formato JSON para ELK
formatter = logging.Formatter(
    json.dumps({
        'timestamp': '%(asctime)s',
        'level': '%(levelname)s',
        'service': 'backend',
        'message': '%(message)s',
        'user_id': '%(user_id)s',
        'request_id': '%(request_id)s'
    })
)

handler = logging.FileHandler('app.log')
handler.setFormatter(formatter)
logger.addHandler(handler)

logger.info("Usuario autenticado", extra={'user_id': 123, 'request_id': 'abc-123'})
```

### Índices en Elasticsearch

```
logs-backend-2026.03.13
logs-frontend-2026.03.13
logs-erp-2026.03.13
logs-pos-2026.03.13
logs-crm-2026.03.13
```

## 4. Jaeger - Distributed Tracing

### Instalación

```bash
docker run -d \
  --name jaeger \
  -p 6831:6831/udp \
  -p 16686:16686 \
  jaegertracing/all-in-one
```

### Instrumentación

```python
from jaeger_client import Config

config = Config(
    config={
        'sampler': {'type': 'const', 'param': 1},
        'logging': True,
    },
    service_name='backend',
)

tracer = config.initialize_tracer()

# Usar en requests
with tracer.start_active_span('process_payment') as scope:
    # Lógica de negocio
    pass
```

## 5. Alertas Automáticas

### Condiciones de Alerta

| Métrica | Umbral | Acción |
|---------|--------|--------|
| Error Rate | > 5% | Page on-call |
| Latency P99 | > 1s | Escalate |
| CPU | > 80% | Auto-scale |
| Memoria | > 85% | Alert |
| Disk | < 10% | Alert |

### Notificaciones

```yaml
notification_channels:
  - type: email
    addresses: [ops@company.com]
  
  - type: slack
    webhook_url: https://hooks.slack.com/...
  
  - type: pagerduty
    integration_key: ...
```

## 6. SLOs y SLIs

### Service Level Objectives (SLOs)

```
- Availability: 99.99%
- Latency P99: < 500ms
- Error Rate: < 0.1%
```

### Service Level Indicators (SLIs)

```
Availability = (Requests Exitosos / Total Requests) * 100
Latency = Percentil 99 de latencia de requests
Error Rate = (Requests Fallidos / Total Requests) * 100
```

## 7. Dashboards Personalizados

### Dashboard de Negocio

```
┌─────────────────────────────────────────────┐
│  Transacciones Hoy: 50,234                  │
│  Ingresos Hoy: $125,450                     │
│  Clientes Activos: 1,234                    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Tasa de Errores: 0.02%                     │
│  Latencia P99: 245ms                        │
│  Uptime: 99.98%                             │
└─────────────────────────────────────────────┘
```

### Dashboard Técnico

```
┌─────────────────────────────────────────────┐
│  CPU: 45% | Memoria: 62% | Disco: 78%      │
│  Conexiones BD: 234/500                     │
│  Requests/seg: 1,234                        │
└─────────────────────────────────────────────┘
```

## 8. Mejores Prácticas

1. **Instrumentación**: Instrumentar todas las aplicaciones
2. **Retención**: Guardar métricas por 30 días, logs por 7 días
3. **Alertas**: Alertar solo en problemas reales
4. **Runbooks**: Documentar pasos para resolver alertas
5. **Postmortems**: Analizar incidentes
6. **Dashboards**: Mantener dashboards actualizados
7. **Capacitación**: Entrenar al equipo en observabilidad

## 9. Troubleshooting

### Problema: Métricas no se recopilan

```bash
# Verificar conectividad
curl http://localhost:9090/api/v1/targets

# Verificar scrape config
curl http://localhost:9090/api/v1/config
```

### Problema: Logs no aparecen en Kibana

```bash
# Verificar índices
curl http://localhost:9200/_cat/indices

# Verificar mappings
curl http://localhost:9200/logs-backend-2026.03.13/_mapping
```

### Problema: Alertas no se disparan

```bash
# Verificar reglas
curl http://localhost:9090/api/v1/rules

# Verificar evaluación
curl http://localhost:9090/api/v1/query?query=up
```

