'use client';

import React from 'react';

export interface DataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface TrendLineChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
  title?: string;
  yAxisLabel?: string;
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({
  data,
  width = 600,
  height = 300,
  color = '#3b82f6',
  className = '',
  title = '',
  yAxisLabel = '',
}) => {
  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
        <p className="text-gray-400">No data available</p>
      </div>
    );
  }

  const padding = { top: 40, right: 40, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate min and max values
  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;
  const valuePadding = valueRange * 0.1;

  // Scale functions
  const xScale = (index: number) => (index / (data.length - 1 || 1)) * chartWidth;
  const yScale = (value: number) => 
    chartHeight - ((value - minValue + valuePadding) / (valueRange + valuePadding * 2)) * chartHeight;

  // Create path string for the line
  const pathData = data
    .map((point, index) => {
      const x = xScale(index);
      const y = yScale(point.value);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Create area path (filled area under the line)
  const areaPath = `${pathData} L ${xScale(data.length - 1)} ${chartHeight} L ${xScale(0)} ${chartHeight} Z`;

  // Y-axis labels
  const yAxisTicks = 5;
  const yAxisValues = Array.from({ length: yAxisTicks }, (_, i) => {
    const value = minValue + (valueRange / (yAxisTicks - 1)) * i;
    return Math.round(value);
  });

  return (
    <div className={className}>
      {title && (
        <h3 className="text-lg font-semibold mb-2 text-center">{title}</h3>
      )}
      
      <svg width={width} height={height}>
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Grid lines */}
          {yAxisValues.map((value, index) => {
            const y = yScale(value);
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

          {/* X-axis labels */}
          {data.map((point, index) => {
            if (index % Math.ceil(data.length / 6) === 0 || index === data.length - 1) {
              return (
                <text
                  key={index}
                  x={xScale(index)}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#6b7280"
                >
                  {point.label || point.date}
                </text>
              );
            }
            return null;
          })}

          {/* Y-axis label */}
          {yAxisLabel && (
            <text
              x={-chartHeight / 2}
              y={-40}
              transform="rotate(-90, 0, 0)"
              textAnchor="middle"
              fontSize="12"
              fill="#6b7280"
            >
              {yAxisLabel}
            </text>
          )}

          {/* Area fill */}
          <path
            d={areaPath}
            fill={color}
            fillOpacity="0.1"
          />

          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {data.map((point, index) => (
            <g key={index}>
              <circle
                cx={xScale(index)}
                cy={yScale(point.value)}
                r="4"
                fill={color}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer hover:r-6 transition-all"
              >
                <title>{`${point.label || point.date}: ${point.value}`}</title>
              </circle>
            </g>
          ))}

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
      </svg>
    </div>
  );
};