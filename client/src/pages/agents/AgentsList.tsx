import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { trpc } from '@/lib/trpc';

export default function AgentsList() {
  const { data: agents } = trpc.agents.list.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agents</h1>
            <p className="text-gray-600 mt-2">Manage specialized agents</p>
          </div>
          <Button>+ New Agent</Button>
        </div>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents?.map(agent => (
            <Card key={agent.id} hoverable>
              <CardBody>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
                    <p className="text-sm text-gray-600">{agent.type}</p>
                  </div>
                  <Badge variant={agent.status === 'active' ? 'success' : 'warning'}>
                    {agent.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-4">{agent.description}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Edit</Button>
                  <Button size="sm" variant="outline">Delete</Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
