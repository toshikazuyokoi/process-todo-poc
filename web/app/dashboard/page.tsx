'use client';

import React, { useState, useEffect } from 'react';
import { Case, StepInstance, User } from '@/app/types';
import { apiClient } from '@/app/lib/api-client';
import { KPICalculator, KPIMetrics, ResourceMetrics } from '@/app/services/kpi-calculator';
import { StatusPieChart } from '@/app/components/dashboard/charts/status-pie-chart';
import { TrendLineChart } from '@/app/components/dashboard/charts/trend-line-chart';
import { ResourceBarChart } from '@/app/components/dashboard/charts/resource-bar-chart';
import { 
  TrendingUp, 
  Clock, 
  Users as UsersIcon, 
  CheckCircle,
  AlertCircle,
  BarChart3,
  RefreshCw
} from 'lucide-react';

export default function DashboardPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [metrics, setMetrics] = useState<KPIMetrics | null>(null);
  const [resourceMetrics, setResourceMetrics] = useState<ResourceMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const calculator = new KPICalculator();

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      const [casesResponse, usersResponse] = await Promise.all([
        apiClient.get<Case[]>('/cases'),
        apiClient.get<User[]>('/users'),
      ]);

      const casesData = casesResponse.data || [];
      const usersData = usersResponse.data || [];
      
      setCases(casesData);
      setUsers(usersData);

      // Calculate metrics
      const kpiMetrics = calculator.getKPIMetrics(casesData, usersData);
      setMetrics(kpiMetrics);

      // Calculate resource metrics
      const allStepInstances: StepInstance[] = [];
      casesData.forEach(caseItem => {
        if (caseItem.stepInstances) {
          allStepInstances.push(...caseItem.stepInstances);
        }
      });
      
      const resourceData = calculator.calculateResourceMetrics(allStepInstances, usersData);
      setResourceMetrics(resourceData);
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    calculator.clearCache();
    fetchData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-500">No data available</div>
      </div>
    );
  }

  // Prepare chart data
  const statusChartData = Object.entries(metrics.tasksByStatus)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
      count,
      color: 
        status === 'done' ? '#10b981' :
        status === 'in_progress' ? '#3b82f6' :
        status === 'blocked' ? '#ef4444' :
        status === 'cancelled' ? '#6b7280' :
        '#fbbf24', // todo
    }));

  const resourceChartData = resourceMetrics.slice(0, 5).map(resource => ({
    name: resource.userName,
    assigned: resource.assignedTasks,
    completed: resource.completedTasks,
    capacity: 10, // Default capacity
  }));

  // Generate mock trend data (in production, this would come from historical data)
  const trendData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return {
      date: date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
      value: Math.round(metrics.progressRate * (0.8 + Math.random() * 0.4)),
    };
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString('ja-JP')}
          </span>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Progress Rate</p>
              <p className="text-2xl font-bold">{metrics.progressRate}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">On-Time Completion</p>
              <p className="text-2xl font-bold">{metrics.onTimeCompletionRate}%</p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Resource Utilization</p>
              <p className="text-2xl font-bold">{metrics.resourceUtilization}%</p>
            </div>
            <UsersIcon className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg Lead Time</p>
              <p className="text-2xl font-bold">{metrics.averageLeadTime} days</p>
            </div>
            <BarChart3 className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
          <CheckCircle className="w-10 h-10 text-green-500" />
          <div>
            <p className="text-sm text-gray-500">Completed Cases</p>
            <p className="text-xl font-semibold">
              {metrics.completedCases} / {metrics.totalCases}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <div>
            <p className="text-sm text-gray-500">Overdue Tasks</p>
            <p className="text-xl font-semibold">{metrics.overdueTasks}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
          <UsersIcon className="w-10 h-10 text-blue-500" />
          <div>
            <p className="text-sm text-gray-500">Active Users</p>
            <p className="text-xl font-semibold">{users.length}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Task Status Distribution</h2>
          <StatusPieChart data={statusChartData} />
        </div>

        {/* Progress Trend */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Progress Trend</h2>
          <TrendLineChart 
            data={trendData}
            title=""
            yAxisLabel="Progress (%)"
          />
        </div>

        {/* Resource Utilization */}
        <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Resource Utilization</h2>
          <ResourceBarChart data={resourceChartData} width={800} />
        </div>
      </div>

      {/* Detailed Metrics Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Resource Details</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Tasks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed Tasks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completion Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {resourceMetrics.map((resource) => (
                <tr key={resource.userId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {resource.userName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {resource.assignedTasks}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {resource.completedTasks}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <span className="mr-2">{resource.utilizationRate}%</span>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${Math.min(resource.utilizationRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}