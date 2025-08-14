'use client';

import { useState, useEffect } from 'react';
import { KanbanBoardComplete } from '@/app/components/kanban/kanban-board-complete';
import { StepInstance, User } from '@/app/types';
import { apiClient } from '@/app/lib/api-client';

export default function KanbanPage() {
  const [stepInstances, setStepInstances] = useState<StepInstance[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all cases and their step instances
      const [casesResponse, usersResponse] = await Promise.all([
        apiClient.get<any[]>('/cases'),
        apiClient.get<User[]>('/users'),
      ]);
      
      // Extract all step instances from all cases
      const allSteps: StepInstance[] = [];
      const cases = casesResponse.data || [];
      cases.forEach(caseItem => {
        if (caseItem.stepInstances) {
          allSteps.push(...caseItem.stepInstances);
        }
      });
      
      setStepInstances(allSteps);
      setUsers(usersResponse.data || []);
    } catch (error) {
      console.error('Error fetching kanban data:', error);
      setError('Failed to load kanban board data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStepInstances = fetchData;

  const handleStatusChange = async (stepId: number, newStatus: StepInstance['status']) => {
    try {
      // Update status via API
      await apiClient.put(`/steps/${stepId}/status`, { status: newStatus });
      
      // Update local state optimistically
      setStepInstances(prev =>
        prev.map(step =>
          step.id === stepId ? { ...step, status: newStatus } : step
        )
      );
      
      // Status updated successfully
    } catch (error) {
      console.error('Error updating step status:', error);
      setError('Failed to update status');
      // Refetch to sync with server state
      fetchStepInstances();
    }
  };

  const handleColumnSettingsChange = (columns: any[]) => {
    // Save column settings to localStorage for persistence
    localStorage.setItem('kanban-columns', JSON.stringify(columns));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading kanban board...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 overflow-hidden">
        <KanbanBoardComplete
          stepInstances={stepInstances}
          users={users}
          onStatusChange={handleStatusChange}
          onColumnSettingsChange={handleColumnSettingsChange}
        />
      </div>
    </div>
  );
}