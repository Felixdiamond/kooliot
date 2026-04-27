"use client";

import { motion } from "framer-motion";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { GlassCard } from "@/components/ui/glass-card";

type TelemetryPoint = {
  bucket: string;
  avgBatteryVoltage: number | null;
  avgSolarPower: number | null;
  avgLoadPower: number | null;
};

type TelemetryChartsProps = {
  data: TelemetryPoint[];
};

function ChartBlock({
  title,
  dataKey,
  color,
  data,
}: {
  title: string;
  dataKey: keyof TelemetryPoint;
  color: string;
  data: TelemetryPoint[];
}) {
  return (
    <GlassCard className="p-4">
      <h3 className="mb-3 text-sm font-medium text-slate-800 dark:text-slate-200">{title}</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
            <XAxis
              dataKey="bucket"
              tick={{ fill: "currentColor", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />
            <YAxis tick={{ fill: "currentColor", fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,0.35)",
                backgroundColor: "rgba(15,23,42,0.88)",
                color: "#f8fafc",
              }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2.5}
              dot={false}
              isAnimationActive
              animationDuration={500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

export function TelemetryCharts({ data }: TelemetryChartsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-1 gap-4 xl:grid-cols-3"
    >
      <ChartBlock title="Battery Voltage" dataKey="avgBatteryVoltage" color="#22d3ee" data={data} />
      <ChartBlock title="Solar Power" dataKey="avgSolarPower" color="#10b981" data={data} />
      <ChartBlock title="Load Power" dataKey="avgLoadPower" color="#fb923c" data={data} />
    </motion.div>
  );
}