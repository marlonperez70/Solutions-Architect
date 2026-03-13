# 📡 API Reference - Enterprise Platform

## Tabla de Contenidos
- [Introducción](#introducción)
- [Autenticación](#autenticación)
- [Agentes](#agentes)
- [Eventos](#eventos)
- [Alertas](#alertas)
- [Métricas](#métricas)
- [Usuarios](#usuarios)
- [Auditoría](#auditoría)
- [Códigos de Error](#códigos-de-error)

---

## Introducción

La API de Enterprise Platform está construida con **tRPC**, proporcionando tipado end-to-end completo entre cliente y servidor.

### Características

- ✅ **Type-Safe**: TypeScript completo en cliente y servidor
- ✅ **Auto-Validación**: Validación automática con Zod
- ✅ **Error Handling**: Errores tipados y descriptivos
- ✅ **Autenticación**: OAuth integrado
- ✅ **Rate Limiting**: Protección contra abuso

### Base URL

```
http://localhost:3000/api/trpc
```

### Headers Requeridos

```http
Content-Type: application/json
Authorization: Bearer {token}
```

---

## Autenticación

### `auth.me`

Obtener información del usuario actual.

**Tipo**: Query

**Parámetros**: Ninguno

**Respuesta**:
```typescript
{
  id: number
  openId: string
  name: string | null
  email: string | null
  role: "user" | "admin" | "agent"
  createdAt: Date
  updatedAt: Date
  lastSignedIn: Date
}
```

**Ejemplo**:
```typescript
const { data: user } = trpc.auth.me.useQuery();
console.log(user?.name); // "John Doe"
```

---

### `auth.logout`

Cerrar la sesión del usuario actual.

**Tipo**: Mutation

**Parámetros**: Ninguno

**Respuesta**:
```typescript
{
  success: boolean
}
```

**Ejemplo**:
```typescript
const logout = trpc.auth.logout.useMutation();
await logout.mutateAsync();
```

---

## Agentes

### `agents.list`

Listar todos los agentes.

**Tipo**: Query

**Parámetros**: Ninguno

**Respuesta**:
```typescript
Array<{
  id: number
  name: string
  description: string | null
  type: "data_analyst" | "security_auditor" | "performance_monitor" | "business_intelligence" | "custom"
  status: "active" | "inactive" | "error" | "maintenance"
  capabilities: string[]
  config: Record<string, unknown>
  createdBy: number
  lastExecutedAt: Date | null
  createdAt: Date
  updatedAt: Date
}>
```

**Ejemplo**:
```typescript
const { data: agents } = trpc.agents.list.useQuery();
agents?.forEach(agent => {
  console.log(`${agent.name} (${agent.status})`);
});
```

---

### `agents.getById`

Obtener un agente específico por ID.

**Tipo**: Query

**Parámetros**:
```typescript
{
  id: number
}
```

**Respuesta**:
```typescript
{
  id: number
  name: string
  description: string | null
  type: string
  status: string
  capabilities: string[]
  config: Record<string, unknown>
  createdBy: number
  lastExecutedAt: Date | null
  createdAt: Date
  updatedAt: Date
} | undefined
```

**Ejemplo**:
```typescript
const { data: agent } = trpc.agents.getById.useQuery({ id: 1 });
console.log(agent?.name);
```

---

### `agents.create`

Crear un nuevo agente.

**Tipo**: Mutation

**Parámetros**:
```typescript
{
  name: string                    // Min 1, Max 255 caracteres
  description?: string            // Opcional
  type: "data_analyst" | "security_auditor" | "performance_monitor" | "business_intelligence" | "custom"
  capabilities: string[]          // Array de capacidades
  config: Record<string, unknown> // Configuración JSON
}
```

**Respuesta**:
```typescript
{
  id: number
  name: string
  description: string | null
  type: string
  status: "active"
  capabilities: string[]
  config: Record<string, unknown>
  createdBy: number
  createdAt: Date
  updatedAt: Date
}
```

**Ejemplo**:
```typescript
const createAgent = trpc.agents.create.useMutation();

const newAgent = await createAgent.mutateAsync({
  name: "Data Analyzer Pro",
  type: "data_analyst",
  capabilities: ["analyze", "report", "export"],
  config: {
    maxDataSize: 1000000,
    timeout: 30000
  }
});

console.log(`Agent created: ${newAgent.id}`);
```

---

### `agents.update`

Actualizar un agente existente.

**Tipo**: Mutation

**Parámetros**:
```typescript
{
  id: number
  updates: Partial<{
    name: string
    description: string | null
    status: "active" | "inactive" | "error" | "maintenance"
    capabilities: string[]
    config: Record<string, unknown>
  }>
}
```

**Respuesta**:
```typescript
{
  id: number
  name: string
  description: string | null
  type: string
  status: string
  capabilities: string[]
  config: Record<string, unknown>
  createdBy: number
  lastExecutedAt: Date | null
  createdAt: Date
  updatedAt: Date
} | undefined
```

**Ejemplo**:
```typescript
const updateAgent = trpc.agents.update.useMutation();

const updated = await updateAgent.mutateAsync({
  id: 1,
  updates: {
    status: "maintenance",
    capabilities: ["analyze", "report"]
  }
});
```

---

## Eventos

### `events.recent`

Obtener eventos recientes.

**Tipo**: Query

**Parámetros**:
```typescript
{
  limit?: number  // Default: 50, Max: 1000
}
```

**Respuesta**:
```typescript
Array<{
  id: number
  eventType: string
  aggregateType: string
  aggregateId: string
  userId: number | null
  agentId: number | null
  data: Record<string, unknown>
  metadata: Record<string, unknown> | null
  severity: "info" | "warning" | "error" | "critical"
  createdAt: Date
}>
```

**Ejemplo**:
```typescript
const { data: events } = trpc.events.recent.useQuery({ limit: 100 });
events?.forEach(event => {
  console.log(`[${event.severity}] ${event.eventType}`);
});
```

---

### `events.byType`

Obtener eventos de un tipo específico.

**Tipo**: Query

**Parámetros**:
```typescript
{
  type: string
  limit?: number  // Default: 50
}
```

**Respuesta**: Array de eventos

**Ejemplo**:
```typescript
const { data: agentEvents } = trpc.events.byType.useQuery({
  type: "agent_execution",
  limit: 50
});
```

---

### `events.create`

Crear un nuevo evento.

**Tipo**: Mutation

**Parámetros**:
```typescript
{
  eventType: string
  aggregateType: string
  aggregateId: string
  data: Record<string, unknown>
  metadata?: Record<string, unknown>
  severity?: "info" | "warning" | "error" | "critical"
}
```

**Respuesta**:
```typescript
{
  id: number
  eventType: string
  aggregateType: string
  aggregateId: string
  userId: number | null
  agentId: number | null
  data: Record<string, unknown>
  metadata: Record<string, unknown> | null
  severity: string
  createdAt: Date
}
```

**Ejemplo**:
```typescript
const createEvent = trpc.events.create.useMutation();

const event = await createEvent.mutateAsync({
  eventType: "agent_failed",
  aggregateType: "agent",
  aggregateId: "1",
  severity: "critical",
  data: {
    error: "Database connection timeout",
    duration: 5000
  }
});
```

---

## Alertas

### `alerts.open`

Obtener alertas abiertas (no resueltas).

**Tipo**: Query

**Parámetros**: Ninguno

**Respuesta**:
```typescript
Array<{
  id: number
  title: string
  description: string | null
  severity: "info" | "warning" | "error" | "critical"
  status: "open" | "acknowledged" | "resolved" | "dismissed"
  createdBy: number | null
  createdAt: Date
  updatedAt: Date
}>
```

**Ejemplo**:
```typescript
const { data: openAlerts } = trpc.alerts.open.useQuery();
console.log(`${openAlerts?.length} alertas abiertas`);
```

---

### `alerts.create`

Crear una nueva alerta.

**Tipo**: Mutation

**Parámetros**:
```typescript
{
  title: string
  description?: string
  severity: "info" | "warning" | "error" | "critical"
}
```

**Respuesta**:
```typescript
{
  id: number
  title: string
  description: string | null
  severity: string
  status: "open"
  createdBy: number | null
  createdAt: Date
  updatedAt: Date
}
```

**Ejemplo**:
```typescript
const createAlert = trpc.alerts.create.useMutation();

const alert = await createAlert.mutateAsync({
  title: "High Memory Usage",
  severity: "warning",
  description: "Memory usage exceeded 80% threshold"
});
```

---

### `alerts.updateStatus`

Actualizar el estado de una alerta.

**Tipo**: Mutation

**Parámetros**:
```typescript
{
  id: number
  status: "open" | "acknowledged" | "resolved" | "dismissed"
}
```

**Respuesta**:
```typescript
{
  id: number
  title: string
  description: string | null
  severity: string
  status: string
  createdBy: number | null
  createdAt: Date
  updatedAt: Date
} | undefined
```

**Ejemplo**:
```typescript
const updateAlert = trpc.alerts.updateStatus.useMutation();

await updateAlert.mutateAsync({
  id: 1,
  status: "resolved"
});
```

---

## Métricas

### `metrics.byCategory`

Obtener métricas de una categoría específica.

**Tipo**: Query

**Parámetros**:
```typescript
{
  category: string
  limit?: number  // Default: 100
}
```

**Respuesta**:
```typescript
Array<{
  id: number
  category: string
  name: string
  value: Decimal
  unit: string | null
  recordedAt: Date
}>
```

**Ejemplo**:
```typescript
const { data: metrics } = trpc.metrics.byCategory.useQuery({
  category: "performance"
});
```

---

### `metrics.record`

Registrar una nueva métrica.

**Tipo**: Mutation

**Parámetros**:
```typescript
{
  category: string
  name: string
  value: string | number  // String para Decimal
  unit?: string
}
```

**Respuesta**:
```typescript
{
  id: number
  category: string
  name: string
  value: Decimal
  unit: string | null
  recordedAt: Date
}
```

**Ejemplo**:
```typescript
const recordMetric = trpc.metrics.record.useMutation();

await recordMetric.mutateAsync({
  category: "performance",
  name: "response_time",
  value: "1250",
  unit: "ms"
});
```

---

## Usuarios

### `users.list`

Listar todos los usuarios (solo admin).

**Tipo**: Query

**Parámetros**: Ninguno

**Respuesta**:
```typescript
Array<{
  id: number
  openId: string
  name: string | null
  email: string | null
  role: "user" | "admin" | "agent"
  createdAt: Date
  updatedAt: Date
  lastSignedIn: Date
}>
```

**Ejemplo**:
```typescript
const { data: users } = trpc.users.list.useQuery();
```

---

## Auditoría

### `audit.myLogs`

Obtener logs de auditoría del usuario actual.

**Tipo**: Query

**Parámetros**:
```typescript
{
  limit?: number  // Default: 50
}
```

**Respuesta**:
```typescript
Array<{
  id: number
  userId: number
  action: string
  resource: string
  status: "success" | "failure"
  errorMessage: string | null
  ipAddress: string | null
  userAgent: string | null
  changes: Record<string, unknown> | null
  createdAt: Date
}>
```

**Ejemplo**:
```typescript
const { data: logs } = trpc.audit.myLogs.useQuery({ limit: 100 });
logs?.forEach(log => {
  console.log(`${log.action} - ${log.status}`);
});
```

---

## Códigos de Error

### Errores comunes

| Código | Descripción | Solución |
|--------|-------------|----------|
| `UNAUTHORIZED` | Usuario no autenticado | Inicia sesión |
| `FORBIDDEN` | Permiso denegado | Verifica tu rol |
| `NOT_FOUND` | Recurso no encontrado | Verifica el ID |
| `BAD_REQUEST` | Input inválido | Revisa los parámetros |
| `INTERNAL_SERVER_ERROR` | Error del servidor | Contacta soporte |
| `CONFLICT` | Conflicto de datos | El recurso ya existe |
| `UNPROCESSABLE_CONTENT` | Validación fallida | Revisa los datos |

### Estructura de Error

```typescript
{
  code: string
  message: string
  cause?: unknown
}
```

### Ejemplo de Manejo de Errores

```typescript
try {
  await createAgent.mutateAsync({
    name: "",  // Inválido
    type: "data_analyst",
    capabilities: [],
    config: {}
  });
} catch (error) {
  if (error.code === "BAD_REQUEST") {
    console.error("Validación fallida:", error.message);
  } else if (error.code === "FORBIDDEN") {
    console.error("No tienes permiso");
  }
}
```

---

## Rate Limiting

La API implementa rate limiting para proteger contra abuso:

| Endpoint | Límite | Ventana |
|----------|--------|---------|
| Login | 5 intentos | 15 minutos |
| API General | 100 requests | 1 minuto |
| Operaciones Sensibles | 10 requests | 1 hora |

---

## Ejemplos Completos

### Crear Agente y Registrar Evento

```typescript
import { trpc } from '@/lib/trpc';

async function createAgentAndLogEvent() {
  const createAgent = trpc.agents.create.useMutation();
  const createEvent = trpc.events.create.useMutation();

  try {
    // Crear agente
    const agent = await createAgent.mutateAsync({
      name: "Analytics Agent",
      type: "data_analyst",
      capabilities: ["analyze", "report"],
      config: { timeout: 30000 }
    });

    // Registrar evento
    await createEvent.mutateAsync({
      eventType: "agent_created",
      aggregateType: "agent",
      aggregateId: agent.id.toString(),
      severity: "info",
      data: {
        agentName: agent.name,
        agentType: agent.type
      }
    });

    console.log(`Agent ${agent.id} created and event logged`);
  } catch (error) {
    console.error("Error:", error);
  }
}
```

### Monitorear Alertas

```typescript
function AlertMonitor() {
  const { data: alerts } = trpc.alerts.open.useQuery();
  const updateAlert = trpc.alerts.updateStatus.useMutation();

  const handleResolve = async (alertId: number) => {
    await updateAlert.mutateAsync({
      id: alertId,
      status: "resolved"
    });
  };

  return (
    <div>
      {alerts?.map(alert => (
        <div key={alert.id}>
          <h3>{alert.title}</h3>
          <p>{alert.description}</p>
          <button onClick={() => handleResolve(alert.id)}>
            Resolver
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## Soporte

Para más ayuda:
- 📧 Email: support@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/marlonperez70/Solutions-Architect/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/marlonperez70/Solutions-Architect/discussions)
