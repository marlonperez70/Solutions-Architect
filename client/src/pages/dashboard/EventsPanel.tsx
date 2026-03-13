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
import { RefreshCw, AlertCircle, Info, AlertTriangle, XCircle } from "lucide-react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const severityColors: Record<string, string> = {
  info: "bg-blue-100 text-blue-800",
  warning: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
  critical: "bg-red-900 text-red-50",
};

const severityIcons: Record<string, React.ReactNode> = {
  info: <Info className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />,
  critical: <XCircle className="h-4 w-4" />,
};

export default function EventsPanel() {
  const [selectedType, setSelectedType] = useState<string>("");
  const utils = trpc.useUtils();

  const { data: events, isLoading, refetch } = trpc.events.recent.useQuery({
    limit: 50,
  });

  const filteredEvents = selectedType
    ? events?.filter((e) => e.eventType === selectedType)
    : events;

  const eventTypes = Array.from(
    new Set(events?.map((e) => e.eventType) || [])
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Eventos del Sistema</CardTitle>
          <CardDescription>
            Visualiza todos los eventos y cambios del sistema en tiempo real
          </CardDescription>
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
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por tipo..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los tipos</SelectItem>
              {eventTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEvents && filteredEvents.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Agregado</TableHead>
                  <TableHead>Severidad</TableHead>
                  <TableHead>Datos</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">
                      {event.eventType}
                    </TableCell>
                    <TableCell className="text-sm">
                      {event.aggregateType}:{event.aggregateId}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {severityIcons[event.severity]}
                        <Badge className={severityColors[event.severity]}>
                          {event.severity}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {JSON.stringify(event.data).substring(0, 50)}...
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(event.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-muted-foreground">
              No hay eventos disponibles
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
