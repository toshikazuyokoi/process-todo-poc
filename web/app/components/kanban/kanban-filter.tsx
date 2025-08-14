'use client';

import React, { useState, useEffect } from 'react';
import { User } from '@/app/types';
import { Filter, Calendar, Users, AlertCircle, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

export interface FilterOptions {
  assignees: number[];
  priority: string[];
  dueDate: string | null;
}

export interface KanbanFilterProps {
  users: User[];
  onFilterChange: (filters: FilterOptions) => void;
  className?: string;
}

export const KanbanFilter: React.FC<KanbanFilterProps> = ({
  users,
  onFilterChange,
  className = '',
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    assignees: [],
    priority: [],
    dueDate: null,
  });

  // Load filters from URL on mount
  useEffect(() => {
    const assigneesParam = searchParams.get('assignees');
    const priorityParam = searchParams.get('priority');
    const dueDateParam = searchParams.get('dueDate');

    const loadedFilters: FilterOptions = {
      assignees: assigneesParam ? assigneesParam.split(',').map(Number).filter(n => !isNaN(n)) : [],
      priority: priorityParam ? priorityParam.split(',') : [],
      dueDate: dueDateParam || null,
    };

    setFilters(loadedFilters);
    onFilterChange(loadedFilters);
  }, [searchParams]);

  // Update URL when filters change
  const updateUrl = (newFilters: FilterOptions) => {
    const params = new URLSearchParams();
    
    if (newFilters.assignees.length > 0) {
      params.set('assignees', newFilters.assignees.join(','));
    }
    if (newFilters.priority.length > 0) {
      params.set('priority', newFilters.priority.join(','));
    }
    if (newFilters.dueDate) {
      params.set('dueDate', newFilters.dueDate);
    }

    const queryString = params.toString();
    router.push(queryString ? `?${queryString}` : window.location.pathname);
  };

  const handleAssigneeToggle = (userId: number) => {
    const newAssignees = filters.assignees.includes(userId)
      ? filters.assignees.filter(id => id !== userId)
      : [...filters.assignees, userId];
    
    const newFilters = { ...filters, assignees: newAssignees };
    setFilters(newFilters);
    onFilterChange(newFilters);
    updateUrl(newFilters);
  };

  const handlePriorityToggle = (priority: string) => {
    const newPriorities = filters.priority.includes(priority)
      ? filters.priority.filter(p => p !== priority)
      : [...filters.priority, priority];
    
    const newFilters = { ...filters, priority: newPriorities };
    setFilters(newFilters);
    onFilterChange(newFilters);
    updateUrl(newFilters);
  };

  const handleDueDateChange = (dateFilter: string | null) => {
    const newFilters = { ...filters, dueDate: dateFilter };
    setFilters(newFilters);
    onFilterChange(newFilters);
    updateUrl(newFilters);
  };

  const clearAllFilters = () => {
    const newFilters: FilterOptions = {
      assignees: [],
      priority: [],
      dueDate: null,
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
    updateUrl(newFilters);
  };

  const hasActiveFilters = 
    filters.assignees.length > 0 || 
    filters.priority.length > 0 || 
    filters.dueDate !== null;

  const priorities = [
    { value: 'overdue', label: '期限切れ', color: 'text-red-600' },
    { value: 'high', label: '高', color: 'text-orange-600' },
    { value: 'medium', label: '中', color: 'text-yellow-600' },
    { value: 'low', label: '低', color: 'text-green-600' },
  ];

  const dueDateOptions = [
    { value: 'overdue', label: '期限切れ' },
    { value: 'today', label: '今日' },
    { value: 'week', label: '今週' },
    { value: 'month', label: '今月' },
    { value: 'no-date', label: '期限なし' },
  ];

  return (
    <div className={`relative ${className}`}>
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-4 py-2 border rounded-lg
          ${hasActiveFilters ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-gray-50'}
        `}
        aria-label="Toggle filters"
      >
        <Filter className="w-4 h-4" />
        <span>Filter</span>
        {hasActiveFilters && (
          <span className="ml-1 px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
            {filters.assignees.length + filters.priority.length + (filters.dueDate ? 1 : 0)}
          </span>
        )}
      </button>

      {/* Filter Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50">
          <div className="p-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Filters</h3>
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close filters"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Assignee Filter */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Assignee</span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {users.map(user => (
                  <label
                    key={user.id}
                    className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.assignees.includes(user.id)}
                      onChange={() => handleAssigneeToggle(user.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{user.name}</span>
                  </label>
                ))}
                <label className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.assignees.includes(-1)}
                    onChange={() => handleAssigneeToggle(-1)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-500">Unassigned</span>
                </label>
              </div>
            </div>

            {/* Priority Filter */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Priority</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {priorities.map(priority => (
                  <button
                    key={priority.value}
                    onClick={() => handlePriorityToggle(priority.value)}
                    className={`
                      px-3 py-1 text-sm rounded-full border transition-colors
                      ${filters.priority.includes(priority.value)
                        ? 'bg-blue-100 border-blue-300'
                        : 'bg-white border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <span className={priority.color}>{priority.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date Filter */}
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Due Date</span>
              </div>
              <select
                value={filters.dueDate || ''}
                onChange={(e) => handleDueDateChange(e.target.value || null)}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All dates</option>
                {dueDateOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="px-4 py-2 bg-gray-50 border-t">
              <div className="flex flex-wrap gap-2">
                {filters.assignees.map(userId => {
                  const user = userId === -1 
                    ? { id: -1, name: 'Unassigned' } 
                    : users.find(u => u.id === userId);
                  return user ? (
                    <span
                      key={userId}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                    >
                      <Users className="w-3 h-3" />
                      {user.name}
                      <button
                        onClick={() => handleAssigneeToggle(userId)}
                        className="ml-1 hover:text-blue-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ) : null;
                })}
                {filters.priority.map(priority => {
                  const p = priorities.find(p => p.value === priority);
                  return p ? (
                    <span
                      key={priority}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full"
                    >
                      <AlertCircle className="w-3 h-3" />
                      {p.label}
                      <button
                        onClick={() => handlePriorityToggle(priority)}
                        className="ml-1 hover:text-yellow-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ) : null;
                })}
                {filters.dueDate && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                    <Calendar className="w-3 h-3" />
                    {dueDateOptions.find(d => d.value === filters.dueDate)?.label}
                    <button
                      onClick={() => handleDueDateChange(null)}
                      className="ml-1 hover:text-green-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};