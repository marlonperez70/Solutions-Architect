import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { trpc } from '@/lib/trpc';

export default function AlertCenter() {
  const [status, setStatus] = useState('open');
  const { data: alerts, refetch } = trpc.alerts.open.useQuery({ limit: 100 });
  const updateAlertMutation = trpc.alerts.updateStatus.useMutation();

  const handleStatusChange = async (alertId: number, newStatus: string) => {
    await updateAlertMutation.mutateAsync({ alertId, status: newStatus as any });
    refetch();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alert Center</h1>
          <p className="text-gray-600 mt-2">Manage and monitor system alerts</p>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <Select
            options={[
              { value: 'open', label: 'Open' },
              { value: 'acknowledged', label: 'Acknowledged' },
              { value: 'resolved', label: 'Resolved' },
            ]}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
        </div>

        {/* Alerts Table */}
        <Card>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Title</th>
                    <th className="text-left py-3 px-4 font-semibold">Severity</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Created</th>
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts?.map(alert => (
                    <tr key={alert.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{alert.title}</td>
                      <td className="py-3 px-4">
                        <Badge variant={alert.severity === 'critical' ? 'error' : 'warning'}>
                          {alert.severity}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={alert.status === 'open' ? 'error' : 'success'}>
                          {alert.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(alert.id, 'resolved')}
                        >
                          Resolve
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}
