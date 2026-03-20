"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface CollateralEntry {
  name: string;
  valueUSD: number;
}

interface CollateralChartProps {
  data: CollateralEntry[];
}

const COLORS = ["#e6007a", "#00c4a7", "#f0b429", "#22c47e", "#f74b5a", "#818cf8"];

export function CollateralChart({ data }: CollateralChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-56 text-muted text-sm font-data">
        No collateral data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="valueUSD"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          innerRadius={50}
          paddingAngle={3}
          label={({ name, percent }: { name: string; percent: number }) =>
            `${name} ${(percent * 100).toFixed(1)}%`
          }
          labelLine={{ stroke: "rgba(255,255,255,0.2)" }}
        >
          {data.map((_, i) => (
            <Cell
              key={`cell-${i}`}
              fill={COLORS[i % COLORS.length]}
              stroke="rgba(0,0,0,0.3)"
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "#111622",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "10px",
            color: "#e8e4dc",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "12px",
          }}
          formatter={(value: number) => [`$${value.toLocaleString()}`, "Value"]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "12px", color: "#6b7280" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}