import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { MixColumn } from '../types';
import { SIEVES } from '../constants';

interface GradationChartProps {
  columns: MixColumn[];
}

const GradationChart: React.FC<GradationChartProps> = ({ columns }) => {
  // Transform data for Recharts
  // 1. Generate sieve data
  const sieveData = SIEVES.map((sieve) => {
    // Identity Line Calculation (0.45 Power Chart)
    // To visualize a straight 45-degree line, we draw to the Maximum Sieve (25.0mm)
    // Adjust this if your project uses 19.0mm as the strict 100% boundary, 
    // but visually 25.0mm makes the "trial 1" (which hits 100 at 25) match the line end.
    const MAX_SIZE = 25.0;
    const identityVal = 100 * Math.pow(sieve.sizeMm / MAX_SIZE, 0.45);

    // X-Axis scaling for 0.45 Power Chart
    const xScale = Math.pow(sieve.sizeMm, 0.45);

    const row: any = {
      name: sieve.label,
      size: sieve.sizeMm,
      xScale: xScale,
      identity: Math.min(100, identityVal), // Cap at 100
    };
    columns.forEach((col) => {
      // Only include if value exists
      const val = col.values[sieve.id];
      if (val !== undefined && val !== '') {
        row[col.id] = parseFloat(val);
      }
    });
    return row;
  }).reverse();

  // 2. Add Origin Point (0,0) for correct chart anchoring
  // This ensures the lines start from the bottom-left corner
  const originPoint = {
    name: '0',
    size: 0,
    xScale: 0,
    identity: 0,
    // Add 0 for all columns so lines start at origin
    ...columns.reduce((acc, col) => ({ ...acc, [col.id]: 0 }), {})
  };

  const data = [originPoint, ...sieveData];

  return (
    <div className="bg-white p-4 border border-slate-300 rounded-sm h-[400px] w-full flex flex-col">
      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Gradation Curve (0.45 Power Chart)</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 10,
              bottom: 40, // Increased bottom margin for rotated labels
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              type="number"
              dataKey="xScale"
              domain={[0, 'dataMax']}
              ticks={data.map(d => d.xScale)}
              tickFormatter={(val) => {
                if (val === 0) return '';
                const match = data.find(d => Math.abs(d.xScale - val) < 0.001);
                if (!match) return '';
                const label = match.name;
                // Parse label to keep it short: "9.5 mm (3/8")" -> "9.5" or "3/8""
                // Standard sieve labels often use the mesh size
                if (label.includes('mm')) return label.split(' ')[0]; // Returns "9.5"
                return label;
              }}
              tick={{ fontSize: 10, fill: '#64748b' }}
              angle={-45}
              textAnchor="end"
              interval={0} // Force show all ticks
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: '#64748b' }}
              label={{ value: '% Passing', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#94a3b8', fontSize: 12 } }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              labelFormatter={(val) => {
                const match = data.find(d => Math.abs(d.xScale - Number(val)) < 0.001);
                return match ? match.name : '';
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

            {/* Render Reference Lines First (Background) */}
            {columns.map((col, index) => {
              if (!col.isSelected || col.type === 'target') return null; // Skip non-selected or target

              // Use distinct colors for references, avoiding Red (MDL) and Blue (Target)
              const refColors = ['#64748b', '#059669', '#d97706', '#7c3aed']; // slate, emerald, amber, violet

              return (
                <Line
                  key={col.id}
                  type="monotone"
                  dataKey={col.id}
                  name={col.name}
                  stroke={refColors[index % refColors.length]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: refColors[index % refColors.length] }}
                  activeDot={{ r: 5 }}
                  strokeDasharray="6 4" // Distinct dash
                  isAnimationActive={false}
                />
              );
            })}

            {/* Identity Line (Middle) - Now distinct Red */}
            <Line
              type="monotone"
              dataKey="identity"
              name="Max Density Line (MDL)"
              stroke="#dc2626" // Red-600
              strokeWidth={2}
              strokeDasharray="2 2" // Tight dot/dash
              dot={false}
              activeDot={false}
              opacity={0.6}
              isAnimationActive={false}
            />

            {/* Target Line (Foreground) */}
            {columns.map((col) => {
              if (col.type !== 'target') return null;

              return (
                <Line
                  key={col.id}
                  type="monotone"
                  dataKey={col.id}
                  name={col.name}
                  stroke="#ea580c" // Orange-600
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#ea580c', strokeWidth: 0 }}
                  activeDot={{ r: 7 }}
                  isAnimationActive={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default GradationChart;
