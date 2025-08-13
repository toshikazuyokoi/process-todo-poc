'use client';

import React from 'react';

export interface StatusData {
  status: string;
  count: number;
  color: string;
}

export interface StatusPieChartProps {
  data: StatusData[];
  width?: number;
  height?: number;
  className?: string;
}

export const StatusPieChart: React.FC<StatusPieChartProps> = ({
  data,
  width = 300,
  height = 300,
  className = '',
}) => {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 20;
  
  // Calculate angles for each segment
  let currentAngle = -90; // Start from top
  const segments = data.map((item) => {
    const percentage = total > 0 ? (item.count / total) * 100 : 0;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    
    return {
      ...item,
      percentage,
      startAngle,
      endAngle: currentAngle,
    };
  });

  // Convert polar coordinates to cartesian
  const polarToCartesian = (angle: number, r: number = radius) => {
    const angleInRadians = ((angle - 90) * Math.PI) / 180;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians),
    };
  };

  // Create SVG path for each segment
  const createPath = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(startAngle);
    const end = polarToCartesian(endAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    
    if (endAngle - startAngle >= 360) {
      // Full circle
      return `M ${centerX} ${centerY - radius}
              A ${radius} ${radius} 0 1 1 ${centerX - 0.01} ${centerY - radius}
              Z`;
    }
    
    return `M ${centerX} ${centerY}
            L ${start.x} ${start.y}
            A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}
            Z`;
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg width={width} height={height}>
        {/* Render pie segments */}
        {segments.map((segment, index) => (
          <g key={index}>
            <path
              d={createPath(segment.startAngle, segment.endAngle)}
              fill={segment.color}
              stroke="white"
              strokeWidth="2"
              className="transition-opacity hover:opacity-80 cursor-pointer"
            >
              <title>{`${segment.status}: ${segment.count} (${segment.percentage.toFixed(1)}%)`}</title>
            </path>
            
            {/* Label for segments > 5% */}
            {segment.percentage > 5 && (
              <text
                x={polarToCartesian((segment.startAngle + segment.endAngle) / 2, radius * 0.7).x}
                y={polarToCartesian((segment.startAngle + segment.endAngle) / 2, radius * 0.7).y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="12"
                fontWeight="bold"
                pointerEvents="none"
              >
                {segment.percentage.toFixed(0)}%
              </text>
            )}
          </g>
        ))}
        
        {/* Center circle for donut effect */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius * 0.3}
          fill="white"
        />
        
        {/* Center text */}
        <text
          x={centerX}
          y={centerY - 5}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="24"
          fontWeight="bold"
          fill="#333"
        >
          {total}
        </text>
        <text
          x={centerX}
          y={centerY + 10}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="12"
          fill="#666"
        >
          Total
        </text>
      </svg>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-gray-600">
              {item.status}: {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};