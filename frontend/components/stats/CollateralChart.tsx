"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface CollateralEntry {
  name: string;
  valueUSD: number;
}

interface CollateralChartProps {
  data: CollateralEntry[];
}

const COLORS = ["#E6007A", "#6C3483", "#1F618D", "#1E8449", "#B7950B"];

export function CollateralChart({ data }: CollateralChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        No collateral data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="valueUSD"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ name, percent }: { name: string; percent: number }) =>
            `${name} ${(percent * 100).toFixed(1)}%`
          }
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Value"]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
