# 🔐 Guía de Seguridad - Enterprise Platform

## Tabla de Contenidos
- [Introducción](#introducción)
- [Zero Trust Security](#zero-trust-security)
- [Autenticación y Autorización](#autenticación-y-autorización)
- [Validación de Datos](#validación-de-datos)
- [Protección de Datos](#protección-de-datos)
- [Rate Limiting](#rate-limiting)
- [Auditoría y Logging](#auditoría-y-logging)
- [Mejores Prácticas](#mejores-prácticas)
- [Respuesta a Incidentes](#respuesta-a-incidentes)

---

## Introducción

La seguridad es una prioridad fundamental en Enterprise Platform. Esta guía describe los patrones de seguridad implementados y cómo usarlos correctamente.

### Principios de Seguridad

1. **Never Trust, Always Verify**: Validación continua
2. **Defense in Depth**: Múltiples capas de protección
3. **Least Privilege**: Mínimos permisos necesarios
4. **Fail Secure**: Fallar de forma segura
5. **Audit Everything**: Registrar todas las acciones

---

## Zero Trust Security

### Concepto

Zero Trust es un modelo de seguridad que asume que ningún usuario o dispositivo es confiable por defecto. Cada acceso requiere verificación.

### Implementación

```typescript
// server/security.ts
export async function validateSecurityContext(
  ctx: TrpcContext,
  action: string,
  requiredRole?: "admin" | "user" | "agent"
): Promise<ValidationResult> {
  // 1. Verificar autenticación
  if (!ctx.user) {
    return { isValid: false, riskScore: 100 };
  }

  // 2. Verificar rol
  if (requiredRole && ctx.user.role !== requiredRole) {
    return { isValid: false, riskScore: 90 };
  }

  // 3. Calcular risk score
  const riskScore = await calculateRiskScore(ctx, action);

  // 4. Permitir si risk < threshold
  return {
    isValid: riskScore < 80,
    riskScore
  };
}
```

### Risk Scoring

El sistema calcula un risk score basado en:

| Factor | Puntos | Descripción |
|--------|--------|-------------|
| IP Changed | 20 | Dirección IP diferente |
| User Agent Changed | 15 | Navegador/dispositivo diferente |
| Unusual Time Gap | 15 | Brecha inusual desde último acceso |
| Sensitive Operation | 25 | Operación sensible |

**Threshold**: Risk score < 80 = Permitido

### Uso en Procedimientos

```typescript
// server/routers.ts
export const appRouter = router({
  agents: router({
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Aplicar Zero Trust
        await enforceZeroTrust(ctx, "delete_agent", "admin");

        // Proceder con la operación
        return deleteAgent(input.id);
      })
  })
});
```

---

## Autenticación y Autorización

### OAuth 2.0 Integration

Enterprise Platform usa OAuth 2.0 para autenticación:

```typescript
// server/_core/oauth.ts
export async function handleOAuthCallback(code: string) {
  // 1. Intercambiar código por token
  const token = await exchangeCodeForToken(code);

  // 2. Obtener información del usuario
  const userInfo = await getUserInfo(token);

  // 3. Crear o actualizar usuario en BD
  await upsertUser({
    openId: userInfo.sub,
    name: userInfo.name,
    email: userInfo.email
  });

  // 4. Crear sesión
  return createSession(userInfo.sub);
}
```

### Role-Based Access Control (RBAC)

```typescript
// Roles disponibles
type Role = "admin" | "user" | "agent"

// Verificación de rol
export async function requireRole(
  ctx: TrpcContext,
  requiredRole: Role
): Promise<void> {
  if (ctx.user?.role !== requiredRole && ctx.user?.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Requiere rol ${requiredRole}`
    });
  }
}
```

### Procedimientos Protegidos

```typescript
// Solo usuarios autenticados
const protectedProcedure = baseProcedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});

// Solo administradores
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});
```

---

## Validación de Datos

### Schema Validation con Zod

Todos los inputs se validan con Zod:

```typescript
import { z } from "zod";

const createAgentSchema = z.object({
  name: z.string()
    .min(1, "Nombre requerido")
    .max(255, "Nombre muy largo"),
  
  type: z.enum([
    "data_analyst",
    "security_auditor",
    "performance_monitor",
    "business_intelligence",
    "custom"
  ]),
  
  capabilities: z.array(z.string())
    .min(1, "Al menos una capacidad requerida")
    .max(50, "Máximo 50 capacidades"),
  
  config: z.record(z.unknown())
    .refine(
      (config) => JSON.stringify(config).length < 10000,
      "Configuración muy grande"
    )
});

// Uso en procedimiento
export const appRouter = router({
  agents: router({
    create: protectedProcedure
      .input(createAgentSchema)
      .mutation(async ({ input }) => {
        // Input ya está validado
        return createAgent(input);
      })
  })
});
```

### Sanitización de Input

```typescript
export function sanitizeInput(
  input: string,
  maxLength: number = 1000
): string {
  return input
    .slice(0, maxLength)
    .replace(/[<>"']/g, (char) => {
      const map: Record<string, string> = {
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };
      return map[char] || char;
    });
}
```

---

## Protección de Datos

### Encriptación en Tránsito

- ✅ HTTPS obligatorio en producción
- ✅ TLS 1.2+ mínimo
- ✅ Perfect Forward Secrecy (PFS)

### Encriptación en Reposo

```typescript
// Datos sensibles en BD
export async function createAuditLog(log: AuditLog) {
  // Hashear información sensible
  const hashedEmail = hashForLogging(log.userEmail);
  
  return db.insert(auditLogs).values({
    ...log,
    userEmail: hashedEmail
  });
}

export function hashForLogging(value: string): string {
  if (!value) return "[empty]";
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}
```

### Gestión de Secretos

```typescript
// ✅ CORRECTO: Usar variables de entorno
const apiKey = process.env.API_KEY;

// ❌ INCORRECTO: Hardcodear secretos
const apiKey = "sk-1234567890abcdef";

// ✅ CORRECTO: Usar .env.local (no versionado)
// .env.local
DATABASE_URL=mysql://user:pass@localhost/db
JWT_SECRET=your-secret-key-here

// ✅ CORRECTO: Acceder en código
const dbUrl = process.env.DATABASE_URL;
```

### Rotación de Secretos

```typescript
// Rotar secretos regularmente
// 1. Generar nuevo secreto
const newSecret = generateSecureRandom(32);

// 2. Actualizar en variables de entorno
// 3. Redeploy de aplicación
// 4. Monitorear errores de autenticación
// 5. Remover secreto antiguo después de período de gracia
```

---

## Rate Limiting

### Implementación

```typescript
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];

    // Remover intentos fuera de la ventana
    const recentAttempts = attempts.filter(
      (time) => now - time < this.windowMs
    );

    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }

    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    return true;
  }
}
```

### Configuración

```typescript
// Rate limiters globales
export const loginRateLimiter = new RateLimiter(
  5,              // 5 intentos
  15 * 60 * 1000  // por 15 minutos
);

export const apiRateLimiter = new RateLimiter(
  100,            // 100 requests
  60 * 1000       // por minuto
);

export const sensitiveActionRateLimiter = new RateLimiter(
  10,             // 10 operaciones
  60 * 60 * 1000  // por hora
);
```

### Uso en Procedimientos

```typescript
export const appRouter = router({
  auth: router({
    login: publicProcedure
      .input(loginSchema)
      .mutation(async ({ input }) => {
        // Verificar rate limit
        if (!loginRateLimiter.isAllowed(input.email)) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Demasiados intentos de login"
          });
        }

        return performLogin(input);
      })
  })
});
```

---

## Auditoría y Logging

### Logging de Acciones

```typescript
export async function createAuditLog(log: {
  userId: number
  action: string
  resource: string
  status: "success" | "failure"
  errorMessage?: string
  ipAddress?: string
  userAgent?: string
  changes?: Record<string, unknown>
}): Promise<void> {
  await db.insert(auditLogs).values({
    ...log,
    createdAt: new Date()
  });
}
```

### Qué Registrar

✅ **Registrar siempre:**
- Cambios de datos sensibles
- Accesos a recursos protegidos
- Fallos de autenticación
- Cambios de permisos
- Operaciones administrativas

❌ **Nunca registrar:**
- Contraseñas
- Tokens
- Claves API
- Números de tarjeta
- Información personal sensible

### Consultar Logs

```typescript
// Obtener logs de auditoría del usuario
const { data: logs } = trpc.audit.myLogs.useQuery({ limit: 100 });

logs?.forEach(log => {
  console.log(`
    Acción: ${log.action}
    Recurso: ${log.resource}
    Estado: ${log.status}
    IP: ${log.ipAddress}
    Fecha: ${log.createdAt}
  `);
});
```

---

## Mejores Prácticas

### 1. Validación en el Servidor

```typescript
// ✅ CORRECTO: Validar en servidor
export const appRouter = router({
  agents: router({
    create: protectedProcedure
      .input(createAgentSchema)  // Validación Zod
      .mutation(async ({ ctx, input }) => {
        // Verificar permisos
        await requireRole(ctx, "admin");
        
        // Crear agente
        return createAgent(input);
      })
  })
});

// ❌ INCORRECTO: Confiar en validación del cliente
// El cliente puede ser manipulado
```

### 2. Principio de Menor Privilegio

```typescript
// ✅ CORRECTO: Rol específico
export const deleteAgentProcedure = adminProcedure
  .input(z.object({ id: z.number() }))
  .mutation(async ({ input }) => {
    return deleteAgent(input.id);
  });

// ❌ INCORRECTO: Permitir a cualquier usuario autenticado
export const deleteAgentProcedure = protectedProcedure
  .input(z.object({ id: z.number() }))
  .mutation(async ({ input }) => {
    return deleteAgent(input.id);
  });
```

### 3. Manejo de Errores Seguro

```typescript
// ✅ CORRECTO: Mensajes genéricos
throw new TRPCError({
  code: "UNAUTHORIZED",
  message: "Acceso denegado"
});

// ❌ INCORRECTO: Revelar información
throw new TRPCError({
  code: "UNAUTHORIZED",
  message: "Usuario no encontrado en BD"
});
```

### 4. Usar HTTPS en Producción

```typescript
// ✅ CORRECTO: Forzar HTTPS
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production" && !req.secure) {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});
```

### 5. Actualizar Dependencias

```bash
# Verificar vulnerabilidades
npm audit

# Actualizar dependencias
npm update

# Auditar después de actualizar
npm audit
```

---

## Respuesta a Incidentes

### Checklist de Incidente

1. **Detectar**: Monitorear logs y alertas
2. **Aislar**: Desactivar acceso comprometido
3. **Investigar**: Revisar logs de auditoría
4. **Contener**: Limitar daño
5. **Erradicar**: Remover causa raíz
6. **Recuperar**: Restaurar servicio
7. **Aprender**: Post-mortem y mejoras

### Escenarios Comunes

#### Credenciales Comprometidas

```typescript
// 1. Invalidar sesión
await invalidateUserSessions(userId);

// 2. Forzar cambio de contraseña
await requirePasswordChange(userId);

// 3. Notificar usuario
await notifyUser(userId, "Actividad sospechosa detectada");

// 4. Registrar incidente
await createAuditLog({
  userId,
  action: "security_incident",
  resource: "auth",
  status: "success",
  changes: { incident: "compromised_credentials" }
});
```

#### Acceso No Autorizado

```typescript
// 1. Bloquear usuario
await blockUser(userId);

// 2. Investigar
const logs = await getAuditLogs(userId);

// 3. Alertar administrador
await notifyAdmins("Acceso no autorizado detectado");

// 4. Documentar
await createIncidentReport(userId, logs);
```

---

## Compliance y Regulaciones

### GDPR

- ✅ Derecho al olvido: Implementar eliminación de datos
- ✅ Portabilidad: Exportar datos del usuario
- ✅ Consentimiento: Obtener consentimiento explícito
- ✅ Privacidad: Encriptar datos sensibles

### PCI-DSS (si maneja pagos)

- ✅ No almacenar números de tarjeta
- ✅ Usar tokenización
- ✅ Encriptar datos en tránsito
- ✅ Auditoría regular

### SOC 2

- ✅ Controles de acceso
- ✅ Auditoría y logging
- ✅ Encriptación
- ✅ Monitoreo continuo

---

## Recursos

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

## Contacto de Seguridad

Para reportar vulnerabilidades:

- 📧 Email: security@example.com
- 🔐 GPG Key: [Tu GPG key]
- 🐛 No publicar vulnerabilidades en issues públicos

---

**Última actualización**: 2026-03-13

[⬆ Volver al inicio](#-guía-de-seguridad---enterprise-platform)
