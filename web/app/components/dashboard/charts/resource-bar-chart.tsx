'use client';

import React from 'react';

export interface ResourceData {
  name: string;
  assigned: number;
  completed: number;
  capacity: number;
}

export interface ResourceBarChartProps {
  data: ResourceData[];
  width?: number;
  height?: number;
  className?: string;
}

export const ResourceBarChart: React.FC<ResourceBarChartProps> = ({
  data,
  width = 600,
  height = 300,
  className = '',
}) => {
  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
        <p className="text-gray-400">No resource data available</p>
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate max value for scaling
  const maxValue = Math.max(...data.map(d => Math.max(d.assigned, d.capacity)));
  const barWidth = chartWidth / (data.length * 3 + 1);
  const groupWidth = barWidth * 2.5;

  // Scale function
  const yScale = (value: number) => {
    if (maxValue === 0) return chartHeight;
    return chartHeight - (value / maxValue) * chartHeight;
  };

  const xScale = (index: number) => {
    return (index * (groupWidth + barWidth * 0.5)) + barWidth;
  };

  return (
    <div className={className}>
      <svg width={width} height={height}>
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
            const y = chartHeight * (1 - ratio);
            const value = Math.round(maxValue * ratio);
            return (
              <g key={index}>
                <line
                  x1={0}
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeDasharray="2,2"
                />
                <text
                  x={-10}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize="12"
                  fill="#6b7280"
                >
                  {value}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((resource, index) => {
            const x = xScale(index);
            const assignedHeight = chartHeight - yScale(resource.assigned);
            const completedHeight = chartHeight - yScale(resource.completed);
            const utilizationRate = resource.capacity > 0 
              ? (resource.assigned / resource.capacity) * 100 
              : 0;

            return (
              <g key={index}>
                {/* Capacity line */}
                <line
                  x1={x - 5}
                  y1={yScale(resource.capacity)}
                  x2={x + barWidth * 2 + 5}
                  y2={yScale(resource.capacity)}
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeDasharray="4,2"
                >
                  <title>Capacity: {resource.capacity}</title>
                </line>

                {/* Assigned bar */}
                <rect
                  x={x}
                  y={yScale(resource.assigned)}
                  width={barWidth}
                  height={assignedHeight}
                  fill="#3b82f6"
                  className="hover:opacity-80 cursor-pointer transition-opacity"
                >
                  <title>Assigned: {resource.assigned}</title>
                </rect>

                {/* Completed bar */}
                <rect
                  x={x + barWidth}
                  y={yScale(resource.completed)}
                  width={barWidth}
                  height={completedHeight}
                  fill="#10b981"
                  className="hover:opacity-80 cursor-pointer transition-opacity"
                >
                  <title>Completed: {resource.completed}</title>
                </rect>

                {/* Resource name */}
                <text
                  x={x + barWidth}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#374151"
                >
                  {resource.name}
                </text>

                {/* Utilization percentage */}
                <text
                  x={x + barWidth}
                  y={chartHeight + 35}
                  textAnchor="middle"
                  fontSize="10"
                  fill={utilizationRate > 100 ? '#ef4444' : '#6b7280'}
                  fontWeight={utilizationRate > 100 ? 'bold' : 'normal'}
                >
                  {utilizationRate.toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* Axes */}
          <line
            x1={0}
            y1={chartHeight}
            x2={chartWidth}
            y2={chartHeight}
            stroke="#374151"
            strokeWidth="1"
          />
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={chartHeight}
            stroke="#374151"
            strokeWidth="1"
          />
        </g>

        {/* Legend */}
        <g transform={`translate(${width - 120}, 20)`}>
          <rect x={0} y={0} width={12} height={12} fill="#3b82f6" />
          <text x={16} y={10} fontSize="12" fill="#374151">Assigned</text>
          
          <rect x={0} y={20} width={12} height={12} fill="#10b981" />
          <text x={16} y={30} fontSize="12" fill="#374151">Completed</text>
          
          <line x1={0} y1={45} x2={12} y2={45} stroke="#ef4444" strokeWidth="2" strokeDasharray="4,2" />
          <text x={16} y={48} fontSize="12" fill="#374151">Capacity</text>
        </g>
      </svg>
    </div>
  );
};