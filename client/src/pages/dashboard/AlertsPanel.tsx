import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, AlertCircle, Bell } from "lucide-react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const severityColors: Record<string, string> = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-900 text-red-50",
};

const statusColors: Record<string, string> = {
  open: "bg-red-100 text-red-800",
  acknowledged: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-800",
};

export default function AlertsPanel() {
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const utils = trpc.useUtils();

  const { data: alerts, isLoading, refetch } = trpc.alerts.open.useQuery({
    limit: 50,
  });

  const updateMutation = trpc.alerts.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Alerta actualizada");
      utils.alerts.open.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar la alerta");
    },
  });

  const filteredAlerts = selectedStatus && selectedStatus !== "all"
    ? alerts?.filter((a) => a.status === selectedStatus)
    : alerts;

  const handleStatusChange = (alertId: number, newStatus: string) => {
    updateMutation.mutate({
      id: alertId,
      status: newStatus as "open" | "acknowledged" | "resolved" | "dismissed",
    });
  };

  const criticalCount = alerts?.filter((a) => a.severity === "critical").length || 0;
  const openCount = alerts?.filter((a) => a.status === "open").length || 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Centro de Alertas
          </CardTitle>
          <CardDescription>
            Gestiona alertas críticas y eventos del sistema
          </CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
            <p className="text-xs text-muted-foreground">Críticas</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-orange-600">{openCount}</p>
            <p className="text-xs text-muted-foreground">Abiertas</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por estado..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="open">Abierta</SelectItem>
              <SelectItem value="acknowledged">Reconocida</SelectItem>
              <SelectItem value="resolved">Resuelta</SelectItem>
              <SelectItem value="dismissed">Descartada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredAlerts && filteredAlerts.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Severidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlerts.map((alert) => (
                  <TableRow
                    key={alert.id}
                    className={
                      alert.severity === "critical" ? "bg-red-50" : ""
                    }
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {alert.severity === "critical" && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        {alert.title}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{alert.type}</TableCell>
                    <TableCell>
                      <Badge className={severityColors[alert.severity]}>
                        {alert.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[alert.status]}>
                        {alert.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(alert.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={alert.status}
                        onValueChange={(value) =>
                          handleStatusChange(alert.id, value)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Abierta</SelectItem>
                          <SelectItem value="acknowledged">
                            Reconocida
                          </SelectItem>
                          <SelectItem value="resolved">Resuelta</SelectItem>
                          <SelectItem value="dismissed">Descartada</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-muted-foreground mb-2">
              ¡Excelente! No hay alertas abiertas
            </p>
            <p className="text-sm text-muted-foreground">
              Tu sistema está funcionando correctamente
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
