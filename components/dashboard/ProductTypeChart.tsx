"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

type DataPoint = {
  name: string;
  value: number;
};

const COLORS = ["#2563eb", "#0ea5e9", "#f59e0b", "#f97316", "#475569"];

export function ProductTypeChart({ data }: { data: DataPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground font-medium italic">
        No product data available.
      </div>
    );
  }

  return (
    <div className="w-full h-full relative" style={{ minHeight: "300px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--foreground)",
              boxShadow: "0 8px 24px rgb(15 23 42 / 0.12)",
            }}
            itemStyle={{ color: "var(--foreground)", fontWeight: 600 }}
          />
          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: "20px", color: "var(--muted-foreground)" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
