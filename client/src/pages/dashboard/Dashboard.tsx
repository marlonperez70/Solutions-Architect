import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { trpc } from '@/lib/trpc';

export default function Dashboard() {
  const { data: agents } = trpc.agents.list.useQuery();
  const { data: recentEvents } = trpc.events.recent.useQuery({ limit: 10 });
  const { data: openAlerts } = trpc.alerts.open.useQuery({ limit: 5 });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome to your enterprise platform</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardBody className="text-center">
              <div className="text-3xl font-bold text-blue-600">{agents?.length || 0}</div>
              <p className="text-gray-600 text-sm mt-2">Active Agents</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <div className="text-3xl font-bold text-green-600">{recentEvents?.length || 0}</div>
              <p className="text-gray-600 text-sm mt-2">Recent Events</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <div className="text-3xl font-bold text-red-600">{openAlerts?.length || 0}</div>
              <p className="text-gray-600 text-sm mt-2">Open Alerts</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <div className="text-3xl font-bold text-purple-600">99.99%</div>
              <p className="text-gray-600 text-sm mt-2">Uptime</p>
            </CardBody>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Events */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <h2 className="text-lg font-semibold">Recent Events</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {recentEvents?.slice(0, 5).map(event => (
                  <div key={event.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <div>
                      <p className="font-medium text-gray-900">{event.eventType}</p>
                      <p className="text-sm text-gray-600">{new Date(event.createdAt).toLocaleString()}</p>
                    </div>
                    <Badge variant={event.severity === 'critical' ? 'error' : 'info'}>
                      {event.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Open Alerts */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Open Alerts</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                {openAlerts?.slice(0, 5).map(alert => (
                  <div key={alert.id} className="p-3 bg-red-50 rounded-md border border-red-200">
                    <p className="font-medium text-red-900 text-sm">{alert.title}</p>
                    <p className="text-xs text-red-700 mt-1">{alert.description}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
