'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TelemetryDataPoint {
  timestamp: string;
  value: number;
}

interface TelemetryChartProps {
  data: TelemetryDataPoint[];
  title: string;
  unit?: string;
  color?: string;
}

export function TelemetryChart({ data, title, unit = '', color = 'var(--chart-1)' }: TelemetryChartProps) {
  return (
    <div className="bg-card border-2 border-foreground rounded-xl p-6" style={{ boxShadow: '8px 8px 0px 0px #E2E8F0' }}>
      <h3 className="text-lg font-heading font-bold text-foreground mb-6 uppercase tracking-wide">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="var(--border)"
            vertical={false}
            strokeWidth={1.5}
          />
          <XAxis
            dataKey="timestamp"
            stroke="var(--muted-foreground)"
            style={{
              fontSize: '12px',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontWeight: 500,
            }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)', strokeWidth: 2 }}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            style={{
              fontSize: '12px',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontWeight: 500,
            }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)', strokeWidth: 2 }}
            tickFormatter={(value) => `${value}${unit}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '2px solid var(--foreground)',
              borderRadius: '12px',
              fontSize: '13px',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              padding: '12px',
              boxShadow: '4px 4px 0px var(--accent)',
            }}
            labelStyle={{
              color: 'var(--foreground)',
              fontWeight: 700,
              marginBottom: '4px',
            }}
            itemStyle={{
              color: 'var(--muted-foreground)',
              fontWeight: 500,
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={3}
            fill={`url(#gradient-${title})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
