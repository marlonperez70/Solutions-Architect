import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Activity, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function MetricsPanel() {
  const { data: agents } = trpc.agents.list.useQuery();
  const { data: events } = trpc.events.recent.useQuery({ limit: 100 });
  const { data: alerts } = trpc.alerts.open.useQuery({ limit: 100 });
  const { data: metrics } = trpc.metrics.byCategory.useQuery({
    category: "performance",
    limit: 20,
  });

  // Calcular estadísticas
  const activeAgents = agents?.filter((a) => a.status === "active").length || 0;
  const totalAgents = agents?.length || 0;
  const criticalAlerts = alerts?.filter((a) => a.severity === "critical").length || 0;
  const errorEvents = events?.filter((e) => e.severity === "error" || e.severity === "critical").length || 0;

  // Preparar datos para gráficos
  const eventTrend = events
    ?.slice(0, 20)
    .reverse()
    .map((e, idx) => ({
      time: idx,
      count: idx + 1,
      severity: e.severity,
    })) || [];

  const agentStatus = [
    { name: "Activos", value: activeAgents },
    { name: "Inactivos", value: totalAgents - activeAgents },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agentes Activos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeAgents}/{totalAgents}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalAgents > 0
                ? Math.round((activeAgents / totalAgents) * 100)
                : 0}
              % disponibles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Críticas</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Requieren atención inmediata
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos Críticos</CardTitle>
            <CheckCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{errorEvents}</div>
            <p className="text-xs text-muted-foreground">
              Últimas 100 horas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">99.9%</div>
            <p className="text-xs text-muted-foreground">
              Últimos 30 días
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Eventos</CardTitle>
            <CardDescription>
              Eventos registrados en las últimas horas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={eventTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado de Agentes</CardTitle>
            <CardDescription>
              Distribución de agentes por estado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agentStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Actividad</CardTitle>
          <CardDescription>
            Últimos eventos del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events?.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className="flex items-start justify-between border-b pb-3 last:border-0"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{event.eventType}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.aggregateType}: {event.aggregateId}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${
                      event.severity === "critical"
                        ? "bg-red-100 text-red-800"
                        : event.severity === "error"
                          ? "bg-orange-100 text-orange-800"
                          : event.severity === "warning"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {event.severity}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(event.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {!events || events.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">
                No hay eventos disponibles
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
